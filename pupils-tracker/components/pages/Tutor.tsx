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
  GraduationCap,
  Clock,
  RotateCcw,
  TimerOff,
  Keyboard,
  Send,
} from "lucide-react";
import { useTracker } from "@/lib/store";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/Button";
import { Field, fieldClassName } from "@/components/ui/Field";
import { StatusPill, type Status } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import {
  startTutor,
  SESSION_CAP_SECONDS,
  type TutorController,
  type TutorState,
  type TutorCallbacks,
} from "@/lib/tutor-live";

type Msg = { id: string; role: "tutor" | "pupil"; text: string };
type Img = { mimeType: string; base64: string; dataUrl: string };

const STATE_PILL: Record<TutorState, { status: Status; label: string }> = {
  connecting: { status: "info", label: "Connecting…" },
  speaking: { status: "success", label: "Tutor is speaking" },
  listening: { status: "info", label: "Listening… your turn" },
  stopped: { status: "neutral", label: "Lesson ended" },
  ended: { status: "warning", label: "Time's up" },
  error: { status: "danger", label: "Problem" },
};

function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function Tutor() {
  const { currentClassName } = useTracker();

  const [mode, setMode] = useState<"setup" | "live">("setup");
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

  const controllerRef = useRef<TutorController | null>(null);
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
      onTurnComplete: () => commit("tutor"),
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
        setError(message);
      },
    };

    try {
      controllerRef.current = await startTutor({
        lessonText,
        image: image ? { mimeType: image.mimeType, base64: image.base64 } : null,
        className: currentClassName || "the class",
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

  // Switch the pupil's answer method mid-lesson (the live session stays open).
  async function switchMode(next: "speak" | "type") {
    if (next === responseMode || !controllerRef.current) return;
    if (next === "speak") {
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
  }

  const isLive = state === "speaking" || state === "listening";

  const canStart = lessonText.trim().length > 0 || !!image;
  const pill = STATE_PILL[state];
  const remaining = SESSION_CAP_SECONDS - elapsed;

  // ---- Setup view ----
  if (mode === "setup") {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold text-paper-900">Speaking Tutor</h1>
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

        <div className="flex items-center justify-end gap-3">
          <Button onClick={start} disabled={!canStart}>
            <Play className="h-4 w-4" />
            Start lesson
          </Button>
        </div>
      </div>
    );
  }

  // ---- Live view ----
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold text-paper-900">Speaking Tutor</h1>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill
                status={pill.status}
                icon={
                  state === "connecting" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : state === "speaking" ? (
                    <Volume2 className="h-3.5 w-3.5" />
                  ) : state === "listening" ? (
                    <Mic className="h-3.5 w-3.5 animate-pulse" />
                  ) : state === "ended" ? (
                    <TimerOff className="h-3.5 w-3.5" />
                  ) : undefined
                }
              >
                {pill.label}
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
        <div ref={scrollRef} className="max-h-[60vh] min-h-[18rem] space-y-3 overflow-y-auto p-5">
          {messages.length === 0 && !liveTutor && !livePupil ? (
            <EmptyState icon={<Sparkles className="h-5 w-5" />} title="Getting ready…">
              The tutor is about to start speaking. Listen, then answer out loud or by typing when it
              asks you a question.
            </EmptyState>
          ) : (
            <>
              {messages.map((m) => (
                <Bubble key={m.id} role={m.role} text={m.text} name={currentClassName} />
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
          className="flex items-center gap-2"
        >
          <input
            value={typeText}
            onChange={(e) => setTypeText(e.target.value)}
            placeholder="Type your answer…"
            aria-label="Type your answer"
            autoComplete="off"
            className={`${fieldClassName} w-full`}
          />
          <Button type="submit" disabled={!typeText.trim()}>
            <Send className="h-4 w-4" />
            Send
          </Button>
        </form>
      )}
    </div>
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
  const opts = [
    { id: "speak" as const, label: "Speak", icon: <Mic className="h-3.5 w-3.5" /> },
    { id: "type" as const, label: "Type", icon: <Keyboard className="h-3.5 w-3.5" /> },
  ];
  return (
    <div className="inline-flex rounded-full bg-paper-100 p-0.5">
      {opts.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.id)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold outline-none transition focus-visible:shadow-ring disabled:cursor-not-allowed disabled:opacity-40 ${
              active ? "bg-surface text-brand-700 shadow-paper" : "text-paper-500 hover:text-paper-700"
            }`}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Bubble({
  role,
  text,
  name,
  live,
}: {
  role: "tutor" | "pupil";
  text: string;
  name: string;
  live?: boolean;
}) {
  const isTutor = role === "tutor";
  return (
    <div className={`flex items-start gap-2.5 ${isTutor ? "" : "flex-row-reverse"}`}>
      {isTutor ? (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          <GraduationCap className="h-4 w-4" />
        </span>
      ) : (
        <Avatar name={name || "Class"} size="sm" decorative />
      )}
      <div
        className={`max-w-[80%] rounded-card px-3.5 py-2 text-sm ${
          isTutor
            ? "bg-brand-50 text-paper-800"
            : "border border-paper-200 bg-surface text-paper-700"
        } ${live ? "opacity-80" : ""}`}
      >
        <p className="mb-0.5 text-2xs font-bold uppercase tracking-wider text-paper-400">
          {isTutor ? "Tutor" : "Pupil"}
        </p>
        {text}
      </div>
    </div>
  );
}
