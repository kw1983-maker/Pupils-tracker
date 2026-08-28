"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type Tone = "brand" | "danger" | "success";

interface ShoutOpts {
  /** Big caption under the emoji, e.g. "Shhh…". */
  label?: string;
  /** Stay on screen until dismiss(id) — for tools that loop (alarm, bell, timer). */
  hold?: boolean;
  /** Life of a non-held shout. Ignored when hold is true. */
  ms?: number;
  tone?: Tone;
}

interface Shout {
  id: number;
  emoji: string;
  label?: string;
  tone: Tone;
  hold: boolean;
  leaving: boolean;
}

interface ShoutApi {
  /** Throws the emoji out of the screen. Returns an id to dismiss it with. */
  shout: (emoji: string, opts?: ShoutOpts) => number;
  dismiss: (id: number | null) => void;
}

const EmojiShoutContext = createContext<ShoutApi | null>(null);

const FLASH_MS = 1600; // default life of a non-held shout
const LEAVE_MS = 320; // shrink-away before unmount — matches .emoji-shout-out

const RING: Record<Tone, string> = {
  brand: "border-brand-400",
  danger: "border-danger",
  success: "border-success",
};
const LABEL: Record<Tone, string> = {
  brand: "text-brand-600",
  danger: "text-danger-ink",
  success: "text-success-ink",
};

/**
 * Full-screen emoji "shout" — a giant emoji rushes out of the screen at the class.
 * Sibling to CelebrationProvider: same portal/fullscreen handling, but a shout can be
 * *held* on screen for as long as its tool is running instead of firing once.
 */
export function EmojiShoutProvider({ children }: { children: ReactNode }) {
  const [shouts, setShouts] = useState<Shout[]>([]);
  // Portal target: document.body normally, but the fullscreen element when one is
  // active — content portaled to body is invisible during fullscreen (Present mode).
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const nextId = useRef(0);
  // Pending auto-dismiss / unmount timers, keyed by shout id.
  const timers = useRef(new Map<number, number>());

  useEffect(() => {
    const update = () =>
      setPortalTarget(
        (document.fullscreenElement as HTMLElement | null) ?? document.body
      );
    update();
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  // Drop every pending timer if the provider itself goes away.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((t) => window.clearTimeout(t));
      pending.clear();
    };
  }, []);

  const dismiss = useCallback((id: number | null) => {
    if (id == null) return;
    const queued = timers.current.get(id);
    if (queued !== undefined) window.clearTimeout(queued);

    setShouts((s) => s.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
    timers.current.set(
      id,
      window.setTimeout(() => {
        setShouts((s) => s.filter((x) => x.id !== id));
        timers.current.delete(id);
      }, LEAVE_MS)
    );
  }, []);

  const shout = useCallback(
    (emoji: string, opts?: ShoutOpts) => {
      const id = nextId.current++;
      setShouts((s) => [
        ...s,
        {
          id,
          emoji,
          label: opts?.label,
          tone: opts?.tone ?? "brand",
          hold: opts?.hold ?? false,
          leaving: false,
        },
      ]);
      if (!opts?.hold) {
        timers.current.set(
          id,
          window.setTimeout(() => dismiss(id), opts?.ms ?? FLASH_MS)
        );
      }
      return id;
    },
    [dismiss]
  );

  const api = useMemo<ShoutApi>(() => ({ shout, dismiss }), [shout, dismiss]);

  return (
    <EmojiShoutContext.Provider value={api}>
      {children}
      {portalTarget &&
        createPortal(
          <div
            className="emoji-shout-stage pointer-events-none fixed inset-0 z-[58] flex items-center justify-center overflow-hidden"
            aria-hidden="true"
          >
            {/* Only the newest shout is drawn — two giant emoji centred on the same
                spot would overlap. Older ones stay in state, so a held shout (a
                looping alarm) rushes back out once a transient one over it clears. */}
            {shouts.slice(-1).map((s) => (
              <div
                key={s.id}
                className="absolute inset-0 flex flex-col items-center justify-center gap-4"
              >
                {!s.leaving && (
                  <span
                    className={`emoji-shout-ring absolute h-[240px] w-[240px] rounded-full border-[8px] ${RING[s.tone]}`}
                  />
                )}
                <span
                  className={`emoji-shout ${
                    s.leaving
                      ? "emoji-shout-out"
                      : s.hold
                        ? "emoji-shout-hold"
                        : ""
                  }`}
                >
                  {s.emoji}
                </span>
                {s.label && (
                  <span
                    className={`emoji-shout-label font-display font-bold ${
                      LABEL[s.tone]
                    } ${s.leaving ? "emoji-shout-label-out" : ""}`}
                  >
                    {s.label}
                  </span>
                )}
              </div>
            ))}
          </div>,
          portalTarget
        )}
    </EmojiShoutContext.Provider>
  );
}

/** Returns { shout, dismiss }. Safe no-ops if no provider is mounted. */
export function useEmojiShout(): ShoutApi {
  return (
    useContext(EmojiShoutContext) ?? { shout: () => -1, dismiss: () => {} }
  );
}
