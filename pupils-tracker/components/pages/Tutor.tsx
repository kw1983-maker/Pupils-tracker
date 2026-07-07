"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Mic,
  Square,
  Play,
  ImagePlus,
  X,
  Loader2,
  Volume2,
  Clock,
  RotateCcw,
  TimerOff,
  Keyboard,
  Send,
  ClipboardList,
  ChevronLeft,
  CheckCircle2,
  Search,
  Music2,
  BookOpen,
} from "lucide-react";
import { useTracker } from "@/lib/store";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/Button";
import { Field, fieldClassName } from "@/components/ui/Field";
import { StatusPill, type Status } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  startTutor,
  SESSION_CAP_SECONDS,
  imagePromptFromTurn,
  imageQueryFromTurn,
  type TutorController,
  type TutorState,
  type TutorCallbacks,
} from "@/lib/tutor-live";
import { BoardMarksDock } from "@/components/ui/BoardMarksDock";
import { SpellingSongModal } from "@/components/ui/SpellingSongModal";
import { StoryModal } from "@/components/ui/StoryModal";
import { SongLyricsPanel } from "@/components/ui/SongLyricsPanel";
import { AudioPlayerBar } from "@/components/ui/AudioPlayerBar";
import { auth } from "@/lib/firebase";
import type { QuizQuestion } from "@/lib/types";

type Msg = { id: string; role: "tutor" | "pupil"; text: string; image?: string; imageLoading?: boolean; imageError?: boolean; imageErrorText?: string };
type Img = { mimeType: string; base64: string; dataUrl: string };

const TEACHER_AVATAR = "/tutor/teacher.png";

const STATE_PILL: Record<TutorState, { status: Status; label: string }> = {
  connecting: { status: "info", label: "Connecting…" },
  speaking: { status: "success", label: "Tutor is speaking" },
  listening: { status: "info", label: "Listening… your turn" },
  stopped: { status: "neutral", label: "Lesson ended" },
  ended: { status: "warning", label: "Time's up" },
  error: { status: "danger", label: "Problem" },
};

function toTitleCase(s: string) {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Shared style wrapper for both providers: keep it a single, clear subject and
// explicitly suppress text so names/words don't get rendered as garbled letters.
export function buildImagePrompt(description: string): string {
  return `Simple, friendly flat illustration for young children of: ${description}. Single clear subject, plain soft background, no text, no words, no letters, no numbers.`;
}

// Pollinations builds an image straight from a URL — instant, no token, no cold
// start. Used both as the default provider and as the HF fallback. FLUX gives
// much higher quality than the old `turbo` model and is still free.
function pollinationsUrl(description: string): string {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    buildImagePrompt(description)
  )}?width=400&height=400&model=flux&nologo=true&safe=true`;
}

export function Tutor() {
  const { currentClassName, pupils } = useTracker();

  const [mode, setMode] = useState<"setup" | "live" | "quiz">("setup");
  const [responseMode, setResponseMode] = useState<"speak" | "type">("speak");
  const [typeText, setTypeText] = useState("");
  const [lessonText, setLessonText] = useState("");
  const [image, setImage] = useState<Img | null>(null);
  const [state, setState] = useState<TutorState>("stopped");
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [liveTutor, setLiveTutor] = useState("");
  const [livePupil, setLivePupil] = useState("");
  const [elapsed, setElapsed] = useState(0);

  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [quizAnswersShown, setQuizAnswersShown] = useState(false);
  const [quizCount, setQuizCount] = useState(8);
  const [imageProvider, setImageProvider] = useState<"pollinations" | "huggingface" | "search">(
    "pollinations"
  );
  const [hfWarmupStatus, setHfWarmupStatus] = useState<"idle" | "warming" | "ready" | "error">("idle");
  const [hfWarmupError, setHfWarmupError] = useState<string | null>(null);
  const [hfWarmupKey, setHfWarmupKey] = useState(0);

  // "Make a song": a generated spelling/topic song, played in a floating audio
  // bar. Independent of the live lesson so it can be made and played any time.
  // `lyrics` (when known) drives a sing-along panel; `lyricsOpen` toggles it.
  const [songOpen, setSongOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [song, setSong] = useState<{
    url: string;
    name: string;
    lyrics?: string;
  } | null>(null);
  const [lyricsOpen, setLyricsOpen] = useState(true);
  const [lyricsExpanded, setLyricsExpanded] = useState(false);

  // Shared by "Make a song" and "Story time": show a finished track in the
  // floating player, with its lyrics/story in the follow-along panel. The
  // full-screen lyrics view opens automatically so pupils can sing/read along
  // right away, without having to click "expand".
  const playTrack = (url: string, name: string, text?: string) => {
    setLyricsOpen(true);
    setLyricsExpanded(true);
    setSong((prev) => {
      if (prev) URL.revokeObjectURL(prev.url); // free the previous blob URL
      return { url, name, lyrics: text };
    });
  };

  const controllerRef = useRef<TutorController | null>(null);
  const responseModeRef = useRef(responseMode);
  responseModeRef.current = responseMode;
  const tutorBuf = useRef("");
  const pupilBuf = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  // Stop the live session + timer if the tab unmounts (PanelSwap on tab change).
  useEffect(
    () => () => {
      stopTimer();
      controllerRef.current?.stop();
    },
    []
  );

  // Belt-and-braces: if the 15-min cap arrives and the server hasn't closed us
  // yet, end the lesson cleanly ourselves.
  useEffect(() => {
    if (mode === "live" && (state === "speaking" || state === "listening" || state === "connecting") && elapsed >= SESSION_CAP_SECONDS) {
      stopTimer();
      commit("tutor");
      commit("pupil");
      controllerRef.current?.stop();
      controllerRef.current = null;
      setState("ended");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, mode, state]);

  // Keep the transcript scrolled to the newest line.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, liveTutor, livePupil]);

  function formatHfWarmupError(raw: string): string {
    if (raw.includes("HF_TOKEN not configured")) {
      return "HF_TOKEN is missing on the server. Add it in Vercel → Settings → Environment Variables, then redeploy.";
    }
    return raw;
  }

  // Pre-warm the HF model as soon as it's selected so the first lesson image is instant.
  // One request — the server route handles retries internally via the Inference Providers SDK.
  useEffect(() => {
    if (imageProvider !== "huggingface") {
      setHfWarmupStatus("idle");
      setHfWarmupError(null);
      return;
    }
    let cancelled = false;
    setHfWarmupStatus("warming");
    setHfWarmupError(null);
    (async () => {
      try {
        const res = await fetch("/api/image-generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ description: "a colorful rainbow" }),
        });
        const data: { url?: string; error?: string } = await res.json();
        if (cancelled) return;
        if (data.url) {
          setHfWarmupStatus("ready");
          setHfWarmupError(null);
        } else {
          setHfWarmupStatus("error");
          setHfWarmupError(formatHfWarmupError(data.error || "Could not warm up the model."));
        }
      } catch {
        if (cancelled) return;
        setHfWarmupStatus("error");
        setHfWarmupError("Network error while warming up Hugging Face.");
      }
   })();
    return () => {
      cancelled = true;
    };
  }, [imageProvider, hfWarmupKey]);

  function commit(role: "tutor" | "pupil") {
    const ref = role === "tutor" ? tutorBuf : pupilBuf;
    const text = ref.current.trim();
    if (text) {
      setMessages((m) => [...m, { id: `${role}-${Date.now()}-${m.length}`, role, text }]);
    }
    ref.current = "";
    if (role === "tutor") setLiveTutor("");
    else setLivePupil("");
  }

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const base64 = dataUrl.split(",")[1] ?? "";
      setImage({ mimeType: file.type || "image/png", base64, dataUrl });
    };
    reader.readAsDataURL(file);
  }

  async function start() {
    setError(null);
    setMessages([]);
    setLiveTutor("");
    setLivePupil("");
    tutorBuf.current = "";
    pupilBuf.current = "";
    stopTimer();
    setElapsed(0);
    setState("connecting");
    setMode("live");

    // Fetch an image from a server route, showing a loading bubble and silently
    // falling back to a Pollinations URL so an image always appears rather than
    // an error placeholder. Used by both Hugging Face and Web image (Pixabay).
    function remoteImage(endpoint: string, body: object, fallbackPrompt: string) {
      const msgId = `tutor-img-${Date.now()}`;
      setMessages((m) => [...m, { id: msgId, role: "tutor", text: "", imageLoading: true }]);
      const fallback = () =>
        setMessages((m) =>
          m.map((msg) =>
            msg.id === msgId
              ? { ...msg, imageLoading: false, image: pollinationsUrl(fallbackPrompt), imageError: false }
              : msg
          )
        );
      fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
        .then((res) => res.json())
        .then((data: { url?: string; error?: string }) => {
          if (data.url) {
            setMessages((m) =>
              m.map((msg) =>
                msg.id === msgId ? { ...msg, imageLoading: false, image: data.url } : msg
              )
            );
          } else {
            fallback();
          }
        })
        .catch(fallback);
    }

    // `prompt` is the descriptive text (generation + fallback); `query` is the
    // short keyword used for Web image search.
    function generateImage(prompt: string, query: string) {
      if (imageProvider === "pollinations") {
        setMessages((m) => [
          ...m,
          { id: `tutor-img-${Date.now()}`, role: "tutor", text: "", image: pollinationsUrl(prompt) },
        ]);
      } else if (imageProvider === "search") {
        remoteImage("/api/image-search", { query: query || prompt }, prompt);
      } else {
        remoteImage("/api/image-generate", { description: prompt }, prompt);
      }
    }

    // For Web image search, ask the model for a clean subject keyword (more
    // reliable than the regex heuristic), then search. Falls back to the
    // heuristic query if the call fails or returns nothing.
    async function searchWithModelKeyword(message: string, topic: string, prompt: string, fallbackQuery: string) {
      let query = fallbackQuery;
      try {
        const idToken = await auth.currentUser?.getIdToken();
        if (idToken) {
          const res = await fetch("/api/image-keyword", {
            method: "POST",
            headers: { "content-type": "application/json", Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ message, topic }),
          });
          const data: { keyword?: string | null } = await res.json();
          if (data.keyword) query = data.keyword;
        }
      } catch {
        /* keep heuristic fallback */
      }
      generateImage(prompt, query);
    }

    const callbacks: TutorCallbacks = {
      onState: setState,
      onTutorText: (delta) => {
        if (pupilBuf.current.trim()) commit("pupil");
        tutorBuf.current += delta;
        setLiveTutor(tutorBuf.current);
      },
      onUserText: (delta) => {
        if (tutorBuf.current.trim()) commit("tutor");
        pupilBuf.current += delta;
        setLivePupil(pupilBuf.current);
      },
      onTurnComplete: (meta) => {
        const capturedText = tutorBuf.current.trim();
        commit("tutor");
        const topic = lessonText.trim().split(/\r?\n/)[0]?.slice(0, 60) ?? "";
        const ctx = { imageHint: meta?.imageHint, topic, pupils: pupils.map((p) => p.name) };
        const prompt = imagePromptFromTurn(capturedText, ctx);
        if (!prompt) return;
        if (imageProvider === "search") {
          const fallbackQuery = imageQueryFromTurn(capturedText, ctx) ?? "";
          void searchWithModelKeyword(capturedText, topic, prompt, fallbackQuery);
        } else {
          generateImage(prompt, "");
        }
      },
      onSessionEnded: () => {
        stopTimer();
        commit("tutor");
        commit("pupil");
        controllerRef.current = null; // engine already released itself
      },
      onError: (message) => {
        stopTimer();
        commit("tutor");
        commit("pupil");
        controllerRef.current = null; // engine already released itself
        const micRelated = /microphone|content_type_audio/i.test(message);
        // This ends the session (controllerRef is cleared above and the typing
        // box only renders while isLive), so the message must not tell the
        // pupil to keep typing — there's nothing left to send it to.
        const msg =
          responseModeRef.current === "type" && micRelated
            ? 'This lesson hit an audio problem and the session ended. Press "Try again" to start a fresh lesson.'
            : message;
        setError(msg);
      },
    };

    try {
      // Shuffle so primacy bias doesn't favour whichever group appears first in
      // the roster (boys are listed before girls in the source spreadsheet).
      const shuffled = [...pupils].sort(() => Math.random() - 0.5);
      controllerRef.current = await startTutor({
        lessonText,
        image: image ? { mimeType: image.mimeType, base64: image.base64 } : null,
        className: currentClassName || "the class",
        pupils: shuffled.map((p) => toTitleCase(p.name)),
        micEnabled: responseMode === "speak",
        callbacks,
      });
      // Connected — start the 15-minute count-up.
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the lesson.");
      setState("error");
      setMode("setup");
    }
  }

  function stop() {
    stopTimer();
    controllerRef.current?.stop();
    controllerRef.current = null;
    commit("tutor");
    commit("pupil");
    setMode("setup");
    setState("stopped");
  }

  async function generateQuiz() {
    setQuizError(null);
    setQuizLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Please sign in again to generate a quiz.");
      const res = await fetch("/api/quiz-generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          lessonText,
          image: image ? { mimeType: image.mimeType, base64: image.base64 } : undefined,
          count: quizCount,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Quiz generation failed (HTTP ${res.status}).`);
      }
      const data = (await res.json()) as { questions: QuizQuestion[] };
      setQuiz(data.questions);
      setQuizAnswersShown(false);
      setMode("quiz");
    } catch (err) {
      setQuizError(err instanceof Error ? err.message : "Could not generate quiz.");
    } finally {
      setQuizLoading(false);
    }
  }

  // Switch the pupil's answer method mid-lesson (the live session stays open).
  async function switchMode(next: "speak" | "type") {
    if (next === responseMode || !controllerRef.current) return;
    if (next === "speak") {
      if (!controllerRef.current.audioInputEnabled) {
        setError("Speak mode needs a fresh lesson — stop and start again with Speak selected.");
        return;
      }
      try {
        await controllerRef.current.setMicEnabled(true);
        setError(null);
        setResponseMode("speak");
      } catch {
        setError("Microphone permission was denied — staying in Type mode so you can type answers.");
        setResponseMode("type");
      }
    } else {
      await controllerRef.current.setMicEnabled(false);
      setError(null);
      setResponseMode("type");
    }
  }

  // Send a typed answer; it shows as a pupil bubble and the tutor replies aloud.
  function sendTyped() {
    const t = typeText.trim();
    if (!t || !controllerRef.current) return;
    if (tutorBuf.current.trim()) commit("tutor"); // settle any in-flight caption first
    controllerRef.current.sendText(t);
    setMessages((m) => [...m, { id: `pupil-${Date.now()}-${m.length}`, role: "pupil", text: t }]);
    setTypeText("");
    setError(null);
  }

  const isLive = state === "speaking" || state === "listening";

  const canStart = lessonText.trim().length > 0 || !!image;
  const pill = STATE_PILL[state];
  const pillLabel =
    responseMode === "type" && state === "listening" ? "Type your answer" : pill.label;
  const remaining = SESSION_CAP_SECONDS - elapsed;

  // ---- Setup view ----
  const setupContent = (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center gap-3">
        <TutorAvatar size={44} />
        <div>
          <h2 className="font-display text-2xl font-semibold text-paper-900">Speaking Tutor</h2>
          <p className="text-sm text-paper-500">
            An AI teacher talks through your material with {currentClassName || "the class"}, then
            asks questions and gives feedback — out loud.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-card bg-danger-bg px-4 py-3 text-sm font-semibold text-danger">
          {error}
        </div>
      )}

      <SectionCard title="Lesson content">
        <Field label="Text to teach (paste a passage, words, or a topic)" htmlFor="tutor-text">
          <textarea
            id="tutor-text"
            value={lessonText}
            onChange={(e) => setLessonText(e.target.value)}
            rows={6}
            placeholder="e.g. The /sh/ sound: ship, shop, fish, wish. Today we learn words with 'sh'…"
            className={`${fieldClassName} w-full resize-y`}
          />
        </Field>

        <div className="mt-4">
          <p className="mb-1 block text-2xs font-bold uppercase tracking-wider text-paper-400">
            Picture (optional)
          </p>
          {image ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.dataUrl}
                alt="Lesson picture"
                className="max-h-56 rounded-card border border-paper-200 object-contain"
              />
              <button
                onClick={() => setImage(null)}
                aria-label="Remove picture"
                className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-surface text-paper-500 shadow-float outline-none hover:text-danger focus-visible:shadow-ring"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-paper-200 px-4 py-3 text-sm font-semibold text-paper-500 transition hover:border-brand-400 hover:text-brand-700">
              <ImagePlus className="h-4 w-4" />
              Upload a picture
              <input type="file" accept="image/*" onChange={onPickImage} className="hidden" />
            </label>
          )}
        </div>
      </SectionCard>

      <SectionCard title="How will pupils answer?">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ModeToggle value={responseMode} onChange={setResponseMode} />
          <p className="text-xs text-paper-400">
            {responseMode === "speak"
              ? "Pupils answer out loud — uses the microphone."
              : "Pupils type their answers — no microphone needed."}{" "}
            You can switch anytime during the lesson.
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Image generation">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ImageProviderToggle value={imageProvider} onChange={setImageProvider} />
          <p className="text-xs text-paper-400">
            {imageProvider === "pollinations"
              ? "Pollinations AI — instant, no account needed."
              : imageProvider === "huggingface"
                ? "Hugging Face FLUX — higher quality, takes a few seconds."
                : "Real pictures from the web (Pixabay) — fast and safe-search."}
          </p>
        </div>
        {imageProvider === "huggingface" && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {hfWarmupStatus === "warming" && (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-paper-400" />
                <span className="text-paper-400">Warming up model… please wait before starting</span>
              </>
            )}
            {hfWarmupStatus === "ready" && (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                <span className="text-success font-semibold">Model ready — good to go!</span>
              </>
            )}
            {hfWarmupStatus === "error" && (
              <div className="flex flex-wrap items-center justify-between w-full">
                <span className="text-danger">
                  {hfWarmupError ?? "Couldn't warm up Hugging Face."} Pollinations will fill in automatically during the lesson if needed.
                </span>
                <Button
                  variant="secondary"
                  className="ml-2 shrink-0 py-1 text-xs"
                  onClick={() => setHfWarmupKey((k) => k + 1)}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Retry
                </Button>
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {quizError && (
        <div className="rounded-card bg-danger-bg px-4 py-3 text-sm font-semibold text-danger">
          {quizError}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label htmlFor="quiz-count" className="text-2xs font-bold uppercase tracking-wider text-paper-400">
            Quiz questions:
          </label>
          <select
            id="quiz-count"
            value={quizCount}
            onChange={(e) => setQuizCount(Number(e.target.value))}
            className={`${fieldClassName} py-1`}
            disabled={quizLoading}
          >
            {[5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <Button variant="secondary" onClick={generateQuiz} disabled={!canStart || quizLoading}>
            {quizLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ClipboardList className="h-4 w-4" />
            )}
            {quizLoading ? "Generating…" : "Generate Quiz"}
          </Button>
          <Button variant="secondary" onClick={() => setSongOpen(true)}>
            <Music2 className="h-4 w-4" />
            Make a song
          </Button>
          <Button variant="secondary" onClick={() => setStoryOpen(true)}>
            <BookOpen className="h-4 w-4" />
            Story time
          </Button>
        </div>
        <Button onClick={start} disabled={!canStart}>
          <Play className="h-4 w-4" />
          Start lesson
        </Button>
      </div>
    </div>
  );

  // ---- Live view ----
  const liveContent = (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 pb-24">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <TutorAvatar size={72} speaking={state === "speaking"} />
          <div>
            <h2 className="font-display text-2xl font-semibold text-paper-900">Speaking Tutor</h2>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill
                status={pill.status}
                icon={
                  state === "connecting" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : state === "speaking" ? (
                    <Volume2 className="h-3.5 w-3.5" />
                  ) : state === "listening" ? (
                    responseMode === "type" ? (
                      <Keyboard className="h-3.5 w-3.5" />
                    ) : (
                      <Mic className="h-3.5 w-3.5 animate-pulse" />
                    )
                  ) : state === "ended" ? (
                    <TimerOff className="h-3.5 w-3.5" />
                  ) : undefined
                }
              >
                {pillLabel}
              </StatusPill>
              <StatusPill
                status={remaining <= 120 ? "warning" : "neutral"}
                icon={<Clock className="h-3.5 w-3.5" />}
              >
                {mmss(Math.min(elapsed, SESSION_CAP_SECONDS))} / {mmss(SESSION_CAP_SECONDS)}
              </StatusPill>
            </div>
          </div>
        </div>
        {state === "ended" || state === "error" ? (
          <div className="flex items-center gap-2">
            <Button onClick={start}>
              <RotateCcw className="h-4 w-4" />
              {state === "ended" ? "Continue" : "Try again"}
            </Button>
            <Button variant="secondary" onClick={() => setMode("setup")}>
              New lesson
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <ModeToggle
              value={responseMode}
              onChange={switchMode}
              disabled={state === "connecting"}
            />
            <Button variant="danger" onClick={stop}>
              <Square className="h-4 w-4" />
              Stop
            </Button>
          </div>
        )}
      </div>

      {state === "ended" && (
        <div className="rounded-card bg-warning-bg px-4 py-3 text-sm font-semibold text-warning">
          Lesson time&apos;s up — audio sessions are capped at 15 minutes. Press{" "}
          <span className="font-bold">Continue</span> to carry on teaching the same content.
        </div>
      )}

      {error && (
        <div className="rounded-card bg-danger-bg px-4 py-3 text-sm font-semibold text-danger">
          {error}
        </div>
      )}

      <SectionCard className="!p-0">
        <div ref={scrollRef} className="max-h-[75vh] min-h-[28rem] space-y-5 overflow-y-auto p-6">
          {messages.length === 0 && !liveTutor && !livePupil ? (
            <EmptyState icon={<Sparkles className="h-5 w-5" />} title="Getting ready…">
              The tutor is about to start speaking. Listen, then answer out loud or by typing when it
              asks you a question.
            </EmptyState>
          ) : (
            <>
              {messages.map((m) => (
                <Bubble key={m.id} role={m.role} text={m.text} name={currentClassName} image={m.image} imageLoading={m.imageLoading} imageError={m.imageError} imageErrorText={m.imageErrorText} />
              ))}
              {liveTutor && <Bubble role="tutor" text={liveTutor} name={currentClassName} live />}
              {livePupil && <Bubble role="pupil" text={livePupil} name={currentClassName} live />}
            </>
          )}
        </div>
      </SectionCard>

      {responseMode === "type" && isLive && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendTyped();
          }}
          className="flex items-center gap-3"
        >
          <input
            value={typeText}
            onChange={(e) => setTypeText(e.target.value)}
            placeholder="Type your answer…"
            aria-label="Type your answer"
            autoComplete="off"
            className={`${fieldClassName} w-full py-3 text-base`}
          />
          <Button type="submit" disabled={!typeText.trim()}>
            <Send className="h-4 w-4" />
            Send
          </Button>
        </form>
      )}
    </div>
  );

  // ---- Quiz view ----
  const quizContent = quiz && (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setMode("setup")}
          className="inline-flex items-center gap-1 text-sm font-semibold text-paper-500 transition hover:text-paper-800"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Setup
        </button>
        <h2 className="font-display text-2xl font-semibold text-paper-900">
          Quiz — {quiz.length} Questions
        </h2>
        <Button variant="secondary" onClick={generateQuiz} disabled={quizLoading}>
          {quizLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          {quizLoading ? "Generating…" : "New Quiz"}
        </Button>
      </div>

      {quiz.map((q, i) => (
        <div key={i} className="rounded-card border border-paper-100 bg-surface p-5 shadow-soft">
          <p className="mb-4 font-display text-lg font-semibold text-paper-900">
            Q{i + 1}. {q.question}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {q.options.map((opt, j) => {
              const isCorrect = quizAnswersShown && j === q.correctIndex;
              return (
                <div
                  key={j}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                    isCorrect
                      ? "border-mark-green-ink/30 bg-mark-green text-mark-green-ink"
                      : "border-paper-200 bg-paper-50 text-paper-700"
                  }`}
                >
                  <span className="flex-1">{opt}</span>
                  {isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                </div>
              );
            })}
          </div>
          {quizAnswersShown && (
            <p className="mt-4 rounded-lg bg-success-bg px-4 py-3 text-sm text-paper-700">
              {q.explanation}
            </p>
          )}
        </div>
      ))}

      {!quizAnswersShown && (
        <div className="flex justify-center pb-8 pt-2">
          <Button onClick={() => setQuizAnswersShown(true)}>
            <CheckCircle2 className="h-4 w-4" />
            Show Answers &amp; Explanations
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative min-h-full">
      <BoardMarksDock />
      {mode === "setup" ? setupContent : mode === "live" ? liveContent : quizContent}

      <SpellingSongModal
        isOpen={songOpen}
        onClose={() => setSongOpen(false)}
        onSongReady={(url, title, lyrics) => playTrack(url, title, lyrics)}
      />

      <StoryModal
        isOpen={storyOpen}
        onClose={() => setStoryOpen(false)}
        onStoryReady={(url, title, text) => playTrack(url, title, text)}
      />

      {song && (
        <AudioPlayerBar
          key={song.url}
          name={song.name}
          url={song.url}
          downloadName={song.name}
          onToggleLyrics={
            song.lyrics ? () => setLyricsOpen((v) => !v) : undefined
          }
          lyricsShown={lyricsOpen}
          onClose={() =>
            setSong((prev) => {
              if (prev) URL.revokeObjectURL(prev.url);
              return null;
            })
          }
        />
      )}

      {song?.lyrics && lyricsOpen && (
        <SongLyricsPanel
          title={song.name}
          lyrics={song.lyrics}
          expanded={lyricsExpanded}
          onExpandedChange={setLyricsExpanded}
          onClose={() => setLyricsOpen(false)}
        />
      )}
    </div>
  );
}

function TutorAvatar({ size = 40, speaking }: { size?: number; speaking?: boolean }) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <span className="h-full w-full overflow-hidden rounded-full border border-paper-200 bg-brand-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={TEACHER_AVATAR} alt="Tutor" className="h-full w-full object-cover" />
      </span>
      {speaking && (
        <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-brand-400 animate-ping" />
      )}
    </span>
  );
}

function ImageProviderToggle({
  value,
  onChange,
}: {
  value: "pollinations" | "huggingface" | "search";
  onChange: (v: "pollinations" | "huggingface" | "search") => void;
}) {
  return (
    <SegmentedControl
      ariaLabel="Image provider"
      value={value}
      onChange={onChange}
      options={[
        { id: "pollinations", label: "Pollinations", icon: <Sparkles className="h-3.5 w-3.5" /> },
        { id: "huggingface", label: "Hugging Face", icon: <ImagePlus className="h-3.5 w-3.5" /> },
        { id: "search", label: "Web image", icon: <Search className="h-3.5 w-3.5" /> },
      ]}
    />
  );
}

function ModeToggle({
  value,
  onChange,
  disabled,
}: {
  value: "speak" | "type";
  onChange: (m: "speak" | "type") => void;
  disabled?: boolean;
}) {
  return (
    <SegmentedControl
      ariaLabel="Response mode"
      value={value}
      onChange={onChange}
      disabled={disabled}
      options={[
        { id: "speak", label: "Speak", icon: <Mic className="h-3.5 w-3.5" /> },
        { id: "type", label: "Type", icon: <Keyboard className="h-3.5 w-3.5" /> },
      ]}
    />
  );
}

function Bubble({
  role,
  text,
  name,
  live,
  image,
  imageLoading,
  imageError,
  imageErrorText,
}: {
  role: "tutor" | "pupil";
  text: string;
  name: string;
  live?: boolean;
  image?: string;
  imageLoading?: boolean;
  imageError?: boolean;
  imageErrorText?: string;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const isTutor = role === "tutor";
  return (
    <div className={`flex items-start gap-4 ${isTutor ? "" : "flex-row-reverse"}`}>
      {isTutor ? (
        <TutorAvatar size={52} />
      ) : (
        <Avatar name={name || "Class"} size="sm" decorative />
      )}
      <div
        className={`max-w-[80%] rounded-card px-5 py-3 text-base ${
          isTutor
            ? "bg-brand-50 text-paper-800"
            : "border border-paper-200 bg-surface text-paper-700"
        } ${live ? "opacity-80" : ""}`}
      >
        {(text || !image) && (
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-paper-400">
            {isTutor ? "Tutor" : "Pupil"}
          </p>
        )}
        {text}
        {imageLoading && !image && (
          <div className="mt-3 flex h-24 w-full items-center justify-center gap-2 rounded-lg bg-paper-100">
            <Loader2 className="h-5 w-5 animate-spin text-paper-400" />
            <span className="text-xs text-paper-400">Generating…</span>
          </div>
        )}
        {imageError && !image && (
          <div className="mt-3 flex w-full flex-col items-center justify-center gap-1 rounded-lg bg-paper-100 py-4 text-xs text-paper-400">
            <div className="flex items-center gap-2">
              <ImagePlus className="h-4 w-4" />
              Image could not be generated
            </div>
            {imageErrorText && (
              <span className="max-w-[240px] truncate text-2xs text-paper-300">{imageErrorText}</span>
            )}
          </div>
        )}
        {image && (
          <div className="mt-3">
            {!imgLoaded && (
              <div className="flex h-40 w-full items-center justify-center rounded-lg bg-paper-100">
                <Loader2 className="h-5 w-5 animate-spin text-paper-400" />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt="Visual aid"
              className={`w-full rounded-lg border border-paper-100 shadow-soft ${imgLoaded ? "" : "hidden"}`}
              onLoad={() => setImgLoaded(true)}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
