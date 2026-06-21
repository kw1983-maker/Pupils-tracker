"use client";

import { useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  X,
  Mic,
  Square,
  Loader2,
  Volume2,
  TimerOff,
  Keyboard,
  Send,
  RotateCcw,
  Sparkles,
  ImagePlus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusPill, type Status } from "@/components/ui/StatusPill";
import { Avatar } from "@/components/ui/Avatar";
import { fieldClassName } from "@/components/ui/Field";
import {
  startAssistant,
  type AssistantController,
  type AssistantState,
  type AssistantCallbacks,
} from "@/lib/writing-assistant-live";

type Msg = { id: string; role: "assistant" | "pupil"; text: string };
type Img = { mimeType: string; base64: string; dataUrl: string };

const TEACHER_AVATAR = "/tutor/teacher.png";

const STATE_PILL: Record<AssistantState, { status: Status; label: string }> = {
  connecting: { status: "info", label: "Connecting…" },
  speaking: { status: "success", label: "Speaking" },
  listening: { status: "info", label: "Listening…" },
  stopped: { status: "neutral", label: "Ended" },
  ended: { status: "warning", label: "Time's up" },
  error: { status: "danger", label: "Problem" },
};

export function WritingAssistantPanel({ active = true }: { active?: boolean }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"idle" | "live">("idle");
  const [responseMode, setResponseMode] = useState<"speak" | "type">("speak");
  const [typeText, setTypeText] = useState("");
  const [state, setState] = useState<AssistantState>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [liveAssistant, setLiveAssistant] = useState("");
  const [livePupil, setLivePupil] = useState("");

  const [image, setImage] = useState<Img | null>(null);

  const controllerRef = useRef<AssistantController | null>(null);
  const assistantBuf = useRef("");
  const pupilBuf = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Pause session when the Spelling tab is hidden.
  useEffect(() => {
    if (!active && controllerRef.current) {
      controllerRef.current.stop();
      controllerRef.current = null;
    }
  }, [active]);

  // Cleanup on unmount.
  useEffect(() => () => { controllerRef.current?.stop(); }, []);

  // Keep transcript scrolled to the bottom.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, liveAssistant, livePupil]);

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const base64 = dataUrl.split(",")[1] ?? "";
      setImage({ mimeType: file.type || "image/png", base64, dataUrl });
    };
    reader.readAsDataURL(file);
  }

  function commit(role: "assistant" | "pupil") {
    const ref = role === "assistant" ? assistantBuf : pupilBuf;
    const text = ref.current.trim();
    if (text) {
      setMessages((m) => [...m, { id: `${role}-${Date.now()}-${m.length}`, role, text }]);
    }
    ref.current = "";
    if (role === "assistant") setLiveAssistant("");
    else setLivePupil("");
  }

  async function start() {
    setError(null);
    setMessages([]);
    setLiveAssistant("");
    setLivePupil("");
    assistantBuf.current = "";
    pupilBuf.current = "";
    setState("connecting");
    setMode("live");

    const callbacks: AssistantCallbacks = {
      onState: setState,
      onAssistantText: (delta) => {
        if (pupilBuf.current.trim()) commit("pupil");
        assistantBuf.current += delta;
        setLiveAssistant(assistantBuf.current);
      },
      onUserText: (delta) => {
        if (assistantBuf.current.trim()) commit("assistant");
        pupilBuf.current += delta;
        setLivePupil(pupilBuf.current);
      },
      onTurnComplete: () => commit("assistant"),
      onSessionEnded: () => {
        commit("assistant");
        commit("pupil");
        controllerRef.current = null;
      },
      onError: (message) => {
        commit("assistant");
        commit("pupil");
        controllerRef.current = null;
        setError(message);
      },
    };

    try {
      controllerRef.current = await startAssistant({
        image: image ? { mimeType: image.mimeType, base64: image.base64 } : null,
        micEnabled: responseMode === "speak",
        callbacks,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the word helper.");
      setState("error");
      setMode("idle");
    }
  }

  function stop() {
    controllerRef.current?.stop();
    controllerRef.current = null;
    commit("assistant");
    commit("pupil");
    setMode("idle");
    setState("stopped");
  }

  async function switchMode(next: "speak" | "type") {
    if (next === responseMode || !controllerRef.current) return;
    if (next === "speak") {
      try {
        await controllerRef.current.setMicEnabled(true);
        setError(null);
        setResponseMode("speak");
      } catch {
        setError("Microphone permission was denied — staying in Type mode.");
        setResponseMode("type");
      }
    } else {
      await controllerRef.current.setMicEnabled(false);
      setResponseMode("type");
    }
  }

  function sendTyped() {
    const t = typeText.trim();
    if (!t || !controllerRef.current) return;
    if (assistantBuf.current.trim()) commit("assistant");
    controllerRef.current.sendText(t);
    setMessages((m) => [...m, { id: `pupil-${Date.now()}-${m.length}`, role: "pupil", text: t }]);
    setTypeText("");
  }

  const isLive = state === "speaking" || state === "listening";
  const pill = STATE_PILL[state];

  return (
    <>
      {/* Toggle handle — visible on the right edge of the board canvas when panel is closed */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open word helper"
          className="absolute right-0 top-1/2 z-[31] -translate-y-1/2 flex flex-col items-center justify-center gap-1.5 rounded-l-xl border border-r-0 border-paper-200 bg-surface px-1.5 py-4 shadow-float outline-none transition-colors hover:bg-brand-50 focus-visible:shadow-ring"
        >
          <MessageCircle className="h-4 w-4 text-brand-700" />
        </button>
      )}

      {/* Panel — overlays the right side of the board canvas */}
      {open && (
        <div className="absolute inset-y-0 right-0 z-30 flex w-[min(300px,80vw)] flex-col border-l border-paper-200 bg-surface shadow-lift">
          {/* Header */}
          <div className="flex shrink-0 items-center gap-2 border-b border-paper-100 px-3 py-2">
            <AssistantAvatar size={32} speaking={mode === "live" && state === "speaking"} />
            <span className="flex-1 font-display text-sm font-semibold text-paper-900">
              Word Helper
            </span>
            {mode === "live" && (
              <StatusPill
                status={pill.status}
                icon={
                  state === "connecting" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : state === "speaking" ? (
                    <Volume2 className="h-3 w-3" />
                  ) : state === "listening" ? (
                    <Mic className="h-3 w-3 animate-pulse" />
                  ) : state === "ended" ? (
                    <TimerOff className="h-3 w-3" />
                  ) : undefined
                }
              >
                {pill.label}
              </StatusPill>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close word helper"
              className="rounded p-1 text-paper-400 outline-none transition-colors hover:text-paper-700 focus-visible:shadow-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mx-3 mt-2 shrink-0 rounded-card bg-danger-bg px-3 py-2 text-xs font-semibold text-danger">
              {error}
            </div>
          )}

          {/* Transcript / idle area */}
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
            {mode === "idle" ? (
              <div className="flex flex-col items-center gap-3 pt-6 text-center">
                <AssistantAvatar size={56} />
                <p className="font-display text-sm font-semibold text-paper-700">
                  Ask me about any word!
                </p>
                <p className="text-xs text-paper-400">
                  I can explain words, spell them out, and give you examples.
                </p>
              </div>
            ) : messages.length === 0 && !liveAssistant && !livePupil ? (
              <div className="flex flex-col items-center gap-2 pt-8 text-center">
                <Loader2 className="h-5 w-5 animate-spin text-brand-400" />
                <p className="text-xs text-paper-400">Getting ready…</p>
              </div>
            ) : (
              <>
                {messages.map((m) => (
                  <Bubble key={m.id} role={m.role} text={m.text} />
                ))}
                {liveAssistant && <Bubble role="assistant" text={liveAssistant} live />}
                {livePupil && <Bubble role="pupil" text={livePupil} live />}
              </>
            )}
          </div>

          {/* Time's up banner */}
          {mode === "live" && state === "ended" && (
            <div className="mx-3 mb-2 shrink-0 rounded-card bg-warning-bg px-3 py-2 text-xs font-semibold text-warning">
              Time&apos;s up — sessions are capped at 15 minutes.
            </div>
          )}

          {/* Controls footer */}
          <div className="shrink-0 space-y-2 border-t border-paper-100 px-3 py-2">
            {mode === "idle" ? (
              <>
                <ModeToggle value={responseMode} onChange={setResponseMode} />
                {image ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.dataUrl}
                      alt="Lesson picture"
                      className="max-h-32 w-full rounded-card border border-paper-200 object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setImage(null)}
                      aria-label="Remove picture"
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-surface text-paper-500 shadow-float outline-none hover:text-danger focus-visible:shadow-ring"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-card border border-dashed border-paper-200 px-3 py-2.5 text-xs font-semibold text-paper-500 transition hover:border-brand-400 hover:text-brand-700">
                    <ImagePlus className="h-4 w-4" />
                    Upload a picture (optional)
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={onPickImage}
                      className="hidden"
                    />
                  </label>
                )}
                <Button className="w-full" onClick={start}>
                  <Sparkles className="h-3.5 w-3.5" />
                  {image ? "Teach this picture" : "Start Chat"}
                </Button>
              </>
            ) : state === "ended" || state === "error" ? (
              <div className="flex gap-2">
                <Button className="flex-1" onClick={start}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Try again
                </Button>
                <Button variant="secondary" onClick={stop}>
                  Back
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <ModeToggle
                    value={responseMode}
                    onChange={switchMode}
                    disabled={state === "connecting"}
                  />
                  <Button variant="danger" size="sm" onClick={stop}>
                    <Square className="h-3.5 w-3.5" />
                    End
                  </Button>
                </div>
                {responseMode === "type" && isLive && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendTyped();
                    }}
                    className="flex gap-2"
                  >
                    <input
                      value={typeText}
                      onChange={(e) => setTypeText(e.target.value)}
                      placeholder="Ask about a word…"
                      aria-label="Ask about a word"
                      autoComplete="off"
                      className={`${fieldClassName} flex-1 py-2 text-sm`}
                    />
                    <Button type="submit" size="sm" disabled={!typeText.trim()}>
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function AssistantAvatar({ size = 40, speaking }: { size?: number; speaking?: boolean }) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <span className="h-full w-full overflow-hidden rounded-full border border-paper-200 bg-brand-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={TEACHER_AVATAR} alt="Word Helper" className="h-full w-full object-cover" />
      </span>
      {speaking && (
        <span className="pointer-events-none absolute inset-0 animate-ping rounded-full ring-2 ring-brand-400" />
      )}
    </span>
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
  live,
}: {
  role: "assistant" | "pupil";
  text: string;
  live?: boolean;
}) {
  const isAssistant = role === "assistant";
  return (
    <div className={`flex items-start gap-2.5 ${isAssistant ? "" : "flex-row-reverse"}`}>
      {isAssistant ? (
        <AssistantAvatar size={32} />
      ) : (
        <Avatar name="pupil" size="sm" decorative />
      )}
      <div
        className={`max-w-[80%] rounded-card px-3 py-2 text-sm ${
          isAssistant
            ? "bg-brand-50 text-paper-800"
            : "border border-paper-200 bg-surface text-paper-700"
        } ${live ? "opacity-80" : ""}`}
      >
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-paper-400">
          {isAssistant ? "Word Helper" : "You"}
        </p>
        {text}
      </div>
    </div>
  );
}
