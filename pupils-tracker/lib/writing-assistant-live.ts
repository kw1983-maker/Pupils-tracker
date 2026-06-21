// Client-side engine for the Writing Assistant panel's Gemini Live (native audio) session.
//
// Flow:
//   1. POST /api/assistant-token -> short-lived ephemeral token (real key stays server-side)
//   2. Connect to the Live API with that token (apiVersion v1alpha, AUDIO out)
//   3. Seed a greeting so the assistant speaks immediately.
//   4. Stream mic audio in (16 kHz PCM16 via the shared AudioWorklet at
//      /tutor/pcm-recorder-worklet.js) and play the model's 24 kHz PCM audio out.
//
// No JSX / React here — WritingAssistantPanel drives this with callbacks.

import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from "@google/genai";
import { auth } from "@/lib/firebase";

const ASSISTANT_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

export type AssistantState =
  | "connecting"
  | "speaking"
  | "listening"
  | "stopped"
  | "ended"
  | "error";

export const SESSION_CAP_SECONDS = 15 * 60;

export interface AssistantCallbacks {
  onState: (state: AssistantState) => void;
  onAssistantText: (delta: string) => void;
  onUserText: (delta: string) => void;
  onTurnComplete: () => void;
  onSessionEnded: () => void;
  onError: (message: string) => void;
}

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
    m.includes("api key not valid") ||
    m.includes("api_key_invalid") ||
    m.includes("permission_denied") ||
    m.includes("unauthenticated") ||
    m.includes("invalid authentication")
  ) {
    return "The Gemini API key was rejected. Check GEMINI_API_KEY in .env.local (and that it isn't expired).";
  }
  return raw || "Live session error.";
}

export interface AssistantImage {
  mimeType: string;
  base64: string; // raw base64 (no data: prefix)
}

export interface StartAssistantParams {
  image?: AssistantImage | null;
  micEnabled: boolean;
  callbacks: AssistantCallbacks;
}

export interface AssistantController {
  stop: () => void;
  setMicEnabled: (enabled: boolean) => Promise<void>;
  sendText: (text: string) => void;
}

const SYSTEM_PROMPT = [
  "You are a warm, kind writing helper for young children aged 6 to 8 years old.",
  "",
  "LANGUAGE RULES — follow these strictly:",
  "• Speak in very short sentences. Never more than 8 words in one sentence.",
  "• Use only simple, everyday words a 6-year-old knows.",
  "• Speak slowly, clearly, and cheerfully.",
  "",
  "WHEN A PUPIL ASKS ABOUT A WORD:",
  "1. Say the word clearly and slowly, one syllable at a time.",
  "2. Explain what it means in one or two short sentences.",
  "3. Give two example sentences using the word.",
  "4. Say something warm and encouraging.",
  "",
  "WHEN A PUPIL ASKS HOW TO SPELL A WORD:",
  "• Spell it out loud, one letter at a time.",
  "• Then say the whole word again clearly.",
  "",
  "WHEN YOU ARE GIVEN A PICTURE:",
  "• Look at the picture carefully.",
  "• Pick one thing you can see. Say its name slowly, one syllable at a time.",
  "• Explain what it is in one or two simple sentences.",
  "• Give one or two short example sentences using the word.",
  "• Tell the pupil something fun or interesting about it.",
  "• Then move on and teach the next thing in the picture.",
  "• Do NOT ask the pupil to repeat words. Just teach and explain each word fully.",
  "",
  "GENERAL RULES:",
  "• Stay on vocabulary, words, spelling, and writing topics only.",
  '• If asked about something else, say: "I help with words and writing. What word would you like to know?"',
  "• Never ask more than one question at a time.",
  "• Be warm, patient, and encouraging at all times.",
].join("\n");

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
  return new Int16Array(bytes.buffer, 0, Math.floor(len / 2));
}

export async function startAssistant(params: StartAssistantParams): Promise<AssistantController> {
  const { image, micEnabled, callbacks } = params;

  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) {
    throw new Error("Please sign in again to start the writing helper.");
  }
  const res = await fetch("/api/assistant-token", {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      describeError(body?.message || body?.error || `Could not get a session token (HTTP ${res.status}).`)
    );
  }
  const { token } = (await res.json()) as { token: string };

  const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: "v1alpha" } });

  // --- output (assistant voice) playback at 24 kHz ---
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

  // --- mic capture (lazy — only when Speak mode is active) ---
  let micStream: MediaStream | null = null;
  let inCtx: AudioContext | null = null;
  let workletNode: AudioWorkletNode | null = null;
  let micActive = false;

  let session: Session | null = null;
  let stopped = false;

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

  async function enableMic() {
    if (micStream) {
      micActive = true;
      micStream.getAudioTracks().forEach((t) => (t.enabled = true));
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    micStream = stream;
    inCtx = new AudioCtor();
    await inCtx.audioWorklet.addModule("/tutor/pcm-recorder-worklet.js");
    const micSource = inCtx.createMediaStreamSource(stream);
    workletNode = new AudioWorkletNode(inCtx, "pcm-recorder-processor");
    workletNode.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
      if (stopped || !session || !micActive) return;
      session.sendRealtimeInput({
        audio: { data: arrayBufferToBase64(e.data), mimeType: "audio/pcm;rate=16000" },
      });
    };
    micSource.connect(workletNode);
    const mute = inCtx.createGain();
    mute.gain.value = 0;
    workletNode.connect(mute);
    mute.connect(inCtx.destination);
    micActive = true;
  }

  async function setMicEnabled(enabled: boolean) {
    if (stopped) return;
    if (enabled) {
      await enableMic();
    } else {
      micActive = false;
      micStream?.getAudioTracks().forEach((t) => (t.enabled = false));
    }
  }

  function sendText(text: string) {
    const t = text.trim();
    if (stopped || !session || !t) return;
    session.sendClientContent({ turns: [{ role: "user", parts: [{ text: t }] }], turnComplete: true });
  }

  // Connect.
  session = await ai.live.connect({
    model: ASSISTANT_MODEL,
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
          callbacks.onAssistantText(sc.outputTranscription.text);
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
        console.error("[writing] live onerror:", e, "message=", e?.message);
        release();
        callbacks.onError(describeError(e?.message || "Live connection error (see console)."));
        callbacks.onState("error");
      },
      onclose: (e: CloseEvent) => {
        console.warn("[writing] live onclose: code=", e?.code, "reason=", e?.reason);
        if (stopped) return;
        release();
        const reason = e?.reason || "";
        const normal = e?.code === 1000 || e?.code === 1005 || e?.code === undefined;
        if (!normal || /quota|exhausted|permission|denied|unauth|invalid|429/i.test(reason)) {
          callbacks.onError(describeError(reason || `Session closed (code ${e?.code}).`));
          callbacks.onState("error");
        } else {
          callbacks.onSessionEnded();
          callbacks.onState("ended");
        }
      },
    },
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: SYSTEM_PROMPT,
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    },
  });

  // Seed the session: include the image if provided, otherwise just greet.
  const greetParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  if (image) {
    greetParts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
    greetParts.push({ text: "Please look at this picture. Teach the words you can see, one at a time. For each word: say it slowly, explain what it means in simple words, give an example sentence, and share something interesting about it. Do not ask the pupil to repeat words — just teach and explain each one fully before moving to the next." });
  } else {
    greetParts.push({ text: "Please greet the pupil and tell them to ask about any word." });
  }
  session.sendClientContent({ turns: [{ role: "user", parts: greetParts }], turnComplete: true });

  if (micEnabled) {
    try {
      await enableMic();
    } catch (err) {
      stop();
      throw new Error(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Microphone permission was denied. Allow the mic, or switch to Type mode."
          : "Could not start the microphone."
      );
    }
  }

  return { stop, setMicEnabled, sendText };
}
