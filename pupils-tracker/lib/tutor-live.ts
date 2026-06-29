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
import { auth } from "@/lib/firebase";

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
  /** Tutor finished a turn. imageHint is set when leaked tool syntax contained a description. */
  onTurnComplete: (meta?: { imageHint?: string }) => void;
  onSessionEnded: () => void; // server closed the session (e.g. 15-minute cap)
  onError: (message: string) => void;
}

/** Turn raw Gemini/transport errors into something a teacher can act on.
 *  Only matches specific, unambiguous phrases — anything else is shown
 *  verbatim so we never hide the real cause behind a wrong guess. */
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
  if (m.includes("content_type_audio") || m.includes("content type (content_type_audio)")) {
    return "Microphone audio isn't supported right now. You can keep typing your answers below.";
  }
  return raw || "Live session error.";
}

export interface StartTutorParams {
  lessonText: string;
  image?: TutorImage | null;
  className: string;
  /** Title-cased display names of every pupil in the class (e.g. "Ming Jia"). */
  pupils?: string[];
  /** Whether to acquire + stream the microphone at start (Speak mode). When
   *  false the lesson starts in Type mode and the mic is never requested. */
  micEnabled: boolean;
  callbacks: TutorCallbacks;
}

export interface TutorController {
  stop: () => void;
  /** Whether this session was started with microphone input enabled (Speak mode). */
  audioInputEnabled: boolean;
  /** Turn mic streaming on/off mid-lesson. Enabling acquires the mic the first
   *  time (may prompt / reject if the pupil denies permission). Only works when
   *  the session was started in Speak mode. */
  setMicEnabled: (enabled: boolean) => Promise<void>;
  /** Inject a typed pupil answer into the live session as a user turn. */
  sendText: (text: string) => void;
}

function systemInstruction(className: string, pupils: string[]): string {
  return [
    `You are a warm, patient, encouraging English teacher for class ${className}.`,
    "Your pupils are young children in lower primary (around 6 to 8 years old).",
    "",
    "LANGUAGE RULES — follow these strictly:",
    "• Use only very short, simple words that a 6-year-old knows.",
    "• Speak in short sentences — no more than 8 words each.",
    "• Never use a long or difficult word. If you must, say it and explain it straight away",
    "  in even simpler words.",
    "• Speak slowly and clearly, with a warm and cheerful tone.",
    "",
    "CALLING ON PUPILS BY NAME:",
    ...(pupils.length > 0
      ? [
          `• The pupils in class ${className} are: ${pupils.join(", ")}.`,
          "• When you ask a question, pick one pupil and say their name first.",
          '  Example: "Ming Jia, can you tell me how to spell \'red\'?"',
          '  Example: "Herman, what sound does \'sh\' make?"',
          "• Vary who you call on — spread questions equally across ALL pupils.",
          "• Do NOT favour any group. Call on every pupil roughly the same number of times.",
          "• Use a warm, encouraging tone when you say their name.",
        ]
      : ["• Direct questions to the class in general."]),
    "",
    "HOW TO RUN THE LESSON:",
    "1. TEACH a tiny piece of the content — one idea or one word at a time.",
    "2. ASK one simple question about what you just taught. Wait for the answer.",
    "3. Give short, kind feedback: praise what is right, gently fix mistakes with the",
    "   correct answer.",
    "4. Move to the next idea and repeat the teach → ask → feedback loop.",
    "",
    "NEVER STOP ON YOUR OWN:",
    "• When you finish all the content, do NOT say goodbye or end the lesson.",
    "• Instead, loop back: review earlier points, ask new questions about the same content,",
    "  play a quick word game, or ask the pupil to give you an example.",
    "• Keep the lesson going — teach, ask, give feedback — until the teacher says 'stop'",
    "  or ends the session.",
    "",
    "Stay strictly on the lesson content you were given. Be cheerful and kind at all times.",
    "",
    "PICTURES:",
    "• A picture is added automatically after each turn — you do not need to do anything.",
    "• Just speak naturally about the word or idea you are teaching.",
    "• Never say function names, code, JSON, or technical commands out loud.",
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

// Gemini's Live transcription occasionally leaks internal control tokens
// (e.g. "<ctrl46>") or tool-call syntax into the text stream. Strip them
// before they reach the transcript so they don't render as literal noise.
export function sanitizeTutorTranscript(text: string): { displayText: string; imageHint?: string } {
  let imageHint: string | undefined;

  const hintPatterns = [
    /show_image\s*\(\s*["']([^"']+)["']\s*\)/i,
    /show_image\s*\{\s*description\s*:\s*([^}\]]+)/i,
    /show_image\s*\{([^}\]]+)/i,
  ];
  for (const re of hintPatterns) {
    const m = text.match(re);
    if (m?.[1]) {
      imageHint = m[1].trim().replace(/^["']|["']$/g, "");
      break;
    }
  }

  const displayText = text
    .replace(/<ctrl\d+>/gi, "")
    // Optional stray prefix (e.g. Korean chars) before leaked tool syntax
    .replace(/[^\w\s"'(),.!?-]*show_image\s*(?:\([^)]*\)|\{[^}]*\})/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return { displayText, imageHint };
}

export interface ImagePromptContext {
  /** Leaked show_image(...) hint from the transcript, if any (highest priority). */
  imageHint?: string;
  /** Short lesson topic used to ground the picture (e.g. "shapes"). */
  topic?: string;
  /** Class roster — names are stripped so they never reach the image generator. */
  pupils?: string[];
}

// Praise/feedback openers the tutor uses before getting to the real subject.
// Stripped from the start of a sentence so "Very good, that is a square" -> "that is a square".
const PRAISE_OPENERS =
  /^(?:very good|well done|good job|good|great|excellent|nice|perfect|that(?:'s| is) right|correct|yes|no|okay|ok|right|wonderful|fantastic|amazing|brilliant|super|clever|thank you|thanks)\b[\s,.!]*/i;

/** Strip whole-word occurrences of each pupil's name (any name part) from text. */
function stripPupilNames(text: string, pupils: string[]): string {
  let out = text;
  const parts = new Set<string>();
  for (const full of pupils) {
    for (const part of String(full ?? "").split(/\s+/)) {
      const clean = part.trim();
      if (clean.length >= 2) parts.add(clean);
    }
  }
  for (const name of parts) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`\\b${escaped}\\b`, "gi"), " ");
  }
  return out.replace(/\s+/g, " ").trim();
}

/**
 * Extract the declarative teaching subject from a completed tutor turn.
 *
 * The last spoken sentence is usually a question that names a pupil
 * ("Eason, what shape is this?"), which makes the picture render the name as
 * garbled text instead of the subject. So we drop questions, strip pupil names
 * and praise openers, and keep the most descriptive teaching sentence.
 */
function subjectFromTurn(rawText: string, pupils: string[]): string | null {
  const { displayText } = sanitizeTutorTranscript(rawText);
  if (displayText.length < 10) return null;

  const sentences = (displayText.match(/[^.!?]+[.!?]*/g) ?? [displayText])
    .map((s) => s.trim())
    .filter(Boolean);

  // Keep declarative teaching sentences only — drop questions.
  const declarative = sentences.filter((s) => !s.endsWith("?"));

  // Clean each candidate: remove pupil names, then strip a leading praise opener.
  const cleaned = declarative
    .map((s) => (pupils.length ? stripPupilNames(s, pupils) : s))
    .map((s) => s.replace(PRAISE_OPENERS, "").trim())
    .filter((s) => s.length >= 3);

  // Prefer the most descriptive (longest) teaching sentence; fall back to a
  // name-stripped slice of the whole turn if nothing declarative survived.
  let subject = cleaned.length
    ? cleaned.reduce((a, b) => (b.length > a.length ? b : a))
    : "";

  if (!subject) {
    const fallback = pupils.length ? stripPupilNames(displayText, pupils) : displayText;
    subject = fallback.replace(PRAISE_OPENERS, "").trim().slice(0, 200);
  }

  if (subject.length < 3) return null;
  return subject.slice(0, 200);
}

/** Build an image-generation prompt (descriptive) from a completed tutor turn. */
export function imagePromptFromTurn(
  rawText: string,
  context: ImagePromptContext = {}
): string | null {
  const { imageHint, topic, pupils = [] } = context;
  const cleanTopic = topic?.trim();

  const subject = imageHint?.trim() || subjectFromTurn(rawText, pupils);
  if (!subject) return cleanTopic ?? null;

  return cleanTopic ? `${cleanTopic}: ${subject}` : subject;
}

// Common words, filler/praise words, and teaching verbs that should never
// become a search keyword on their own (they are not concrete picture subjects).
const QUERY_STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "this", "that", "these", "those",
  "it", "its", "we", "you", "they", "he", "she", "i", "to", "of", "in", "on", "at",
  "and", "or", "but", "for", "with", "have", "has", "will", "can", "do", "does",
  "look", "now", "here", "there", "let", "lets", "us", "all", "some", "very", "today",
  "talk", "about", "see", "what", "how", "many",
  "good", "great", "nice", "fun", "thing", "things", "yes", "no", "okay", "ok",
  // teaching verbs / classroom filler
  "hello", "class", "learn", "learns", "learning", "play", "plays", "playing",
  "like", "likes", "make", "makes", "want", "know", "tell", "show", "shows",
  "find", "count", "name", "read", "write", "use", "get", "put", "call", "say",
  "today", "remember", "think", "guess", "try",
  // meta references to the image itself (the tutor says "look at the picture")
  "picture", "pictures", "image", "images", "photo", "photos",
]);

// Tutor phrases that introduce a concrete subject, e.g. "this is a ball",
// "it is a square", "look at this shape". The capture group is the subject noun.
const INTRO_NOUN_RE =
  /\b(?:this is|that is|it is|here is|here's|we have|this shows?|look(?:\s+at)?(?:\s+this|\s+that|\s+here)?)\s+(?:a |an |the |some |my |your |our )*([a-z]{3,})\b/gi;

/**
 * Build a short keyword query for image search (Pixabay) from a tutor turn.
 *
 * Stock search works best with a single concrete noun, not a phrase, and the
 * subject can appear first ("A ball is a toy") or last ("Today we will learn
 * about toys"). So we (1) prefer the noun in an introduction phrase ("this is a
 * ball" -> "ball"), taking the last one as the tutor narrows to specifics, then
 * (2) fall back to the first concrete content word, then (3) the lesson topic.
 * We deliberately keep it to one word: multi-word queries return tangential
 * matches (e.g. "ball toy" surfaces Christmas ornaments tagged both).
 */
export function imageQueryFromTurn(
  rawText: string,
  context: ImagePromptContext = {}
): string | null {
  const { imageHint, topic, pupils = [] } = context;
  const cleanTopic = topic?.trim() ?? "";

  if (imageHint?.trim()) return imageHint.trim();

  const { displayText } = sanitizeTutorTranscript(rawText);
  const stripped = (pupils.length ? stripPupilNames(displayText, pupils) : displayText).toLowerCase();

  // 1. Introduction phrases name the concrete subject; prefer the last match.
  let introNoun = "";
  for (let m = INTRO_NOUN_RE.exec(stripped); m !== null; m = INTRO_NOUN_RE.exec(stripped)) {
    if (m[1] && !QUERY_STOPWORDS.has(m[1])) introNoun = m[1];
  }
  INTRO_NOUN_RE.lastIndex = 0;
  if (introNoun) return introNoun;

  // 2. Fall back to the first concrete content word of the teaching sentence.
  const subject = subjectFromTurn(rawText, pupils);
  const keyword =
    (subject ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .find((w) => w.length >= 2 && !QUERY_STOPWORDS.has(w)) ?? "";
  if (keyword) return keyword;

  // 3. Otherwise use the lesson topic, when it's short enough to be a good query.
  const shortTopic = cleanTopic.split(/\s+/).length <= 3 ? cleanTopic : "";
  return shortTopic || null;
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
  const { lessonText, image, className, pupils = [], micEnabled, callbacks } = params;

  // 1. Mint an ephemeral token from our own server. The server requires a valid
  //    Firebase ID token (the app's own login), so attackers can't drain quota.
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) {
    throw new Error("Please sign in again to start a lesson.");
  }
  const res = await fetch("/api/tutor-token", {
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

  // --- mic capture (set up lazily — only when Speak mode is active) ---
  let micStream: MediaStream | null = null;
  let inCtx: AudioContext | null = null;
  let workletNode: AudioWorkletNode | null = null;
  let micActive = false; // gates whether mic audio is sent to the model

  let session: Session | null = null;
  let stopped = false;

  // Accumulate raw tutor transcription so we can sanitize incrementally.
  let tutorTranscriptRaw = "";
  let tutorTranscriptDisplayed = "";

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

  // Acquire the mic + audio worklet once, then re-enable on later calls. The
  // worklet only forwards audio to the model while `micActive` is true.
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
    // Keep the worklet alive in the graph without echoing the mic to the speakers.
    const mute = inCtx.createGain();
    mute.gain.value = 0;
    workletNode.connect(mute);
    mute.connect(inCtx.destination);
    micActive = true;
  }

  // Toggle mic streaming. Enabling may prompt for / be denied permission (the
  // promise rejects so the page can revert to Type mode). Cannot enable audio
  // input on a session that was started in Type mode — restart required.
  async function setMicEnabled(enabled: boolean) {
    if (stopped) return;
    if (enabled && !micEnabled) {
      throw new Error("Speak mode needs a fresh lesson — stop and start again with Speak selected.");
    }
    if (enabled) {
      await enableMic();
    } else {
      micActive = false;
      micStream?.getAudioTracks().forEach((t) => (t.enabled = false));
    }
  }

  // Inject a typed pupil answer as a user turn; the tutor replies by voice.
  function sendText(text: string) {
    const t = text.trim();
    if (stopped || !session || !t) return;
    session.sendClientContent({ turns: [{ role: "user", parts: [{ text: t }] }], turnComplete: true });
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
          const t = sanitizeTutorTranscript(sc.inputTranscription.text).displayText;
          if (t) callbacks.onUserText(t);
        }
        if (sc.outputTranscription?.text) {
          tutorTranscriptRaw += sc.outputTranscription.text;
          const { displayText } = sanitizeTutorTranscript(tutorTranscriptRaw);
          const delta = displayText.slice(tutorTranscriptDisplayed.length);
          tutorTranscriptDisplayed = displayText;
          if (delta) callbacks.onTutorText(delta);
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
          const { imageHint } = sanitizeTutorTranscript(tutorTranscriptRaw);
          tutorTranscriptRaw = "";
          tutorTranscriptDisplayed = "";
          callbacks.onTurnComplete(imageHint ? { imageHint } : undefined);
          callbacks.onState("listening");
        }
      },
      onerror: (e: ErrorEvent) => {
        if (stopped) return;
        console.error("[tutor] live onerror:", e, "message=", e?.message);
        release();
        callbacks.onError(describeError(e?.message || "Live connection error (see console)."));
        callbacks.onState("error");
      },
      onclose: (e: CloseEvent) => {
        console.warn("[tutor] live onclose: code=", e?.code, "reason=", e?.reason);
        if (stopped) return; // user-initiated stop already handled
        release();
        const reason = e?.reason || "";
        // Codes: 1000/1005 = normal end (e.g. the 15-minute cap). Anything
        // else, or a reason that names a quota/auth problem, is an error.
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
      systemInstruction: systemInstruction(className, pupils),
      outputAudioTranscription: {},
      ...(micEnabled ? { inputAudioTranscription: {} } : {}),
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

  // 4. Start the mic — only in Speak mode (Type mode never prompts for it).
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

  return { stop, audioInputEnabled: micEnabled, setMicEnabled, sendText };
}
