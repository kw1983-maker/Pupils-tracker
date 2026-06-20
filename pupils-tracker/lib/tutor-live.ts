// Client-side engine for the Tutor tab's Gemini Live (native audio) session.
//
// Flow:
//   1. POST /api/tutor-token  -> short-lived ephemeral token (real key stays server-side)
//   2. Connect to the Live API with that token (apiVersion v1alpha, AUDIO out)
//   3. Seed the lesson (teacher's text + optional picture) so the model starts teaching
//   4. Stream mic audio in (16 kHz PCM16 via an AudioWorklet) and play the
//      model's 24 kHz PCM audio out, with barge-in handling on `interrupted`.
//
// No JSX / React here — the Tutor page drives this with callbacks.

import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from "@google/genai";

/** Free-tier Gemini Live native-audio model. Swap here to change models. */
export const TUTOR_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

export type TutorState =
  | "connecting"
  | "speaking" // tutor is talking
  | "listening" // waiting for the pupil
  | "stopped" // teacher pressed Stop
  | "ended" // server closed the session (e.g. 15-minute cap)
  | "error";

/** Audio-only Live sessions are capped at 15 minutes by the API. */
export const SESSION_CAP_SECONDS = 15 * 60;

export interface TutorImage {
  mimeType: string;
  base64: string; // raw base64 (no data: prefix)
}

export interface TutorCallbacks {
  onState: (state: TutorState) => void;
  onTutorText: (delta: string) => void; // streamed transcript of the tutor's speech
  onUserText: (delta: string) => void; // streamed transcript of the pupil's speech
  onTurnComplete: () => void; // tutor finished a turn
  onSessionEnded: () => void; // server closed the session (e.g. 15-minute cap)
  onError: (message: string) => void;
}

/** Turn raw Gemini/transport errors into something a teacher can act on. */
export function describeError(raw: string): string {
  const m = (raw || "").toLowerCase();
  if (
    m.includes("resource_exhausted") ||
    m.includes("429") ||
    m.includes("quota") ||
    m.includes("rate limit") ||
    m.includes("rate-limit")
  ) {
    return "You've reached the free-tier limit for now (too many or too long sessions). Check your remaining quota at aistudio.google.com/rate-limit and try again in a little while.";
  }
  if (
    m.includes("permission") ||
    m.includes("denied") ||
    m.includes("unauthenticated") ||
    m.includes("api key") ||
    m.includes("api_key") ||
    m.includes("invalid")
  ) {
    return "The Gemini API key was rejected. Check GEMINI_API_KEY in .env.local (and that it isn't expired).";
  }
  return raw || "Live session error.";
}

export interface StartTutorParams {
  lessonText: string;
  image?: TutorImage | null;
  className: string;
  callbacks: TutorCallbacks;
}

export interface TutorController {
  stop: () => void;
}

function systemInstruction(className: string): string {
  return [
    `You are a warm, patient, encouraging primary-school English teacher for class ${className}.`,
    "Your pupils are young children (around 6 to 8 years old).",
    "",
    "Run the lesson like a real teacher, by VOICE:",
    "1. First, TEACH the supplied content in small, simple steps. Speak slowly and clearly,",
    "   in short sentences and friendly language. If a picture is provided, describe it and",
    "   teach from it.",
    "2. Then ASK ONE simple question at a time and wait for the pupil to answer out loud.",
    "3. Give short, warm feedback: praise what they got right, and gently correct mistakes",
    "   with the right answer and a tiny explanation.",
    "4. Then continue to the next point and repeat: teach a little, ask, listen, give feedback.",
    "",
    "Keep your turns short so the children can keep up. Stay strictly on the lesson content",
    "you were given. Be cheerful and kind. Never use complicated words without explaining them.",
  ].join("\n");
}

// ---- base64 helpers (PCM <-> base64) ----

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToInt16(base64: string): Int16Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  // PCM16 little-endian -> Int16Array view over the same bytes.
  return new Int16Array(bytes.buffer, 0, Math.floor(len / 2));
}

export async function startTutor(params: StartTutorParams): Promise<TutorController> {
  const { lessonText, image, className, callbacks } = params;

  // 1. Mint an ephemeral token from our own server.
  const res = await fetch("/api/tutor-token", { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      describeError(body?.message || body?.error || `Could not get a session token (HTTP ${res.status}).`)
    );
  }
  const { token } = (await res.json()) as { token: string };

  const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: "v1alpha" } });

  // --- output (tutor voice) playback at 24 kHz ---
  const AudioCtor: typeof AudioContext =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const outCtx = new AudioCtor({ sampleRate: 24000 });
  let nextStartTime = 0;
  const sources = new Set<AudioBufferSourceNode>();

  function flushPlayback() {
    for (const s of sources) {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    }
    sources.clear();
    nextStartTime = 0;
  }

  function enqueueAudio(int16: Int16Array) {
    if (int16.length === 0) return;
    const buf = outCtx.createBuffer(1, int16.length, 24000);
    const channel = buf.getChannelData(0);
    for (let i = 0; i < int16.length; i++) channel[i] = int16[i] / 32768;
    const src = outCtx.createBufferSource();
    src.buffer = buf;
    src.connect(outCtx.destination);
    const startAt = Math.max(outCtx.currentTime, nextStartTime);
    src.start(startAt);
    nextStartTime = startAt + buf.duration;
    sources.add(src);
    src.onended = () => sources.delete(src);
  }

  // --- mic capture (set up after connect so we don't drop early audio) ---
  let micStream: MediaStream | null = null;
  let inCtx: AudioContext | null = null;
  let workletNode: AudioWorkletNode | null = null;

  let session: Session | null = null;
  let stopped = false;

  // Free the mic, audio graph and socket. Does NOT touch UI state, so it can be
  // used by the user-stop path and the server-ended/error paths alike.
  function release() {
    if (stopped) return;
    stopped = true;
    try {
      session?.close();
    } catch {
      /* noop */
    }
    workletNode?.disconnect();
    micStream?.getTracks().forEach((t) => t.stop());
    flushPlayback();
    void inCtx?.close().catch(() => {});
    void outCtx.close().catch(() => {});
  }

  function stop() {
    if (stopped) return;
    release();
    callbacks.onState("stopped");
  }

  // 2. Connect.
  session = await ai.live.connect({
    model: TUTOR_MODEL,
    callbacks: {
      onopen: () => callbacks.onState("speaking"),
      onmessage: (message: LiveServerMessage) => {
        const sc = message.serverContent;
        if (!sc) return;

        if (sc.interrupted) {
          flushPlayback();
          callbacks.onState("listening");
        }

        if (sc.inputTranscription?.text) {
          callbacks.onUserText(sc.inputTranscription.text);
        }
        if (sc.outputTranscription?.text) {
          callbacks.onTutorText(sc.outputTranscription.text);
          callbacks.onState("speaking");
        }

        for (const part of sc.modelTurn?.parts ?? []) {
          const data = part.inlineData?.data;
          if (data && (part.inlineData?.mimeType ?? "").startsWith("audio/")) {
            enqueueAudio(base64ToInt16(data));
            callbacks.onState("speaking");
          }
        }

        if (sc.turnComplete) {
          callbacks.onTurnComplete();
          callbacks.onState("listening");
        }
      },
      onerror: (e: ErrorEvent) => {
        if (stopped) return;
        release();
        callbacks.onError(describeError(e.message));
        callbacks.onState("error");
      },
      onclose: (e: CloseEvent) => {
        if (stopped) return; // user-initiated stop already handled
        release();
        // A non-normal close with a quota/permission reason is an error;
        // otherwise treat it as the session ending (e.g. the 15-minute cap).
        const reason = e?.reason || "";
        if (/quota|exhausted|permission|denied|unauth|invalid|429/i.test(reason)) {
          callbacks.onError(describeError(reason));
          callbacks.onState("error");
        } else {
          callbacks.onSessionEnded();
          callbacks.onState("ended");
        }
      },
    },
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: systemInstruction(className),
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    },
  });

  // 3. Seed the lesson so the model starts teaching immediately.
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  if (image) parts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
  parts.push({
    text:
      (lessonText.trim()
        ? `Here is today's lesson content to teach:\n\n${lessonText.trim()}\n\n`
        : "Here is today's lesson picture to teach from. ") +
      "Please begin teaching it now to the class, then ask your first question.",
  });
  session.sendClientContent({ turns: [{ role: "user", parts }], turnComplete: true });

  // 4. Start the mic.
  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    inCtx = new AudioCtor();
    await inCtx.audioWorklet.addModule("/tutor/pcm-recorder-worklet.js");
    const micSource = inCtx.createMediaStreamSource(micStream);
    workletNode = new AudioWorkletNode(inCtx, "pcm-recorder-processor");
    workletNode.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
      if (stopped || !session) return;
      session.sendRealtimeInput({
        audio: { data: arrayBufferToBase64(e.data), mimeType: "audio/pcm;rate=16000" },
      });
    };
    micSource.connect(workletNode);
    // Keep the worklet alive in the graph without echoing the mic to the speakers.
    const mute = inCtx.createGain();
    mute.gain.value = 0;
    workletNode.connect(mute);
    mute.connect(inCtx.destination);
  } catch (err) {
    stop();
    throw new Error(
      err instanceof Error && err.name === "NotAllowedError"
        ? "Microphone permission was denied. Allow the mic to talk with the tutor."
        : "Could not start the microphone."
    );
  }

  return { stop };
}
