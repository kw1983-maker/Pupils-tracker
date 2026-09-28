"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X, Wand2, RotateCw } from "lucide-react";
import { useTracker } from "@/lib/store";
import { Button } from "./Button";
import { useCelebrate } from "./Celebration";
import { shortenName } from "@/lib/pupil-name";
import { useRemoteSendOptional } from "@/lib/remote";
import { resolvePickedPupil } from "@/lib/remote-protocol";

type Phase = "idle" | "spinning" | "done";

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

interface PickedPupil {
  id: string;
  name: string;
}

interface PickerContextValue {
  open: boolean;
  setOpen: (open: boolean | ((o: boolean) => boolean)) => void;
  phase: Phase;
  display: string;
  winner: string;
  avoidRepeats: boolean;
  setAvoidRepeats: (on: boolean) => void;
  pickedIds: string[];
  /** Spin; pass `pupilId` so a remote command lands on the same person. */
  spin: (pupilId?: string) => PickedPupil | null;
  reset: () => void;
}

const PickerContext = createContext<PickerContextValue | null>(null);

/**
 * Picker state, shared by every <PupilPicker> on screen (the floating toolbar
 * and the spelling board's Present mode both render one) and by the board
 * remote, so a remote "pick" runs once and shows wherever the picker is.
 */
export function PickerProvider({ children }: { children: ReactNode }) {
  const { pupils } = useTracker();
  const celebrate = useCelebrate();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [display, setDisplay] = useState<string>("");
  const [winner, setWinner] = useState<string>("");
  const [avoidRepeats, setAvoidRepeatsState] = useState(true);
  // IDs already drawn this round (for "avoid repeats").
  const [pickedIds, setPickedIds] = useState<string[]>([]);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);
  useEffect(() => clearTimer, [clearTimer]);

  const spin = useCallback(
    (pupilId?: string): PickedPupil | null => {
      if (pupils.length === 0) return null;
      clearTimer();
      setOpen(true);

      const resolved = resolvePickedPupil(
        pupils,
        pickedIds,
        avoidRepeats,
        pupilId
      );
      if (!resolved) return null;
      const { chosen, roundPickedIds: picked } = resolved;
      setWinner(chosen.name);
      setPhase("spinning");

      const finish = () => {
        setDisplay(chosen.name);
        setPhase("done");
        setPickedIds(avoidRepeats ? [...picked, chosen.id] : []);
        celebrate({ name: shortenName(chosen.name) });
      };

      // The shuffle is a deliberate, teacher-triggered effect, so we run it even
      // under prefers-reduced-motion. A 1-pupil class has nothing to shuffle.
      if (pupils.length === 1) {
        finish();
        return chosen;
      }

      // Decelerating shuffle: flash random names, slowing down, then land.
      let delay = 55;
      const tick = () => {
        setDisplay(pick(pupils).name);
        delay *= 1.13;
        if (delay < 340) {
          timer.current = setTimeout(tick, delay);
        } else {
          finish();
        }
      };
      tick();
      return chosen;
    },
    [pupils, pickedIds, avoidRepeats, celebrate, clearTimer]
  );

  const reset = useCallback(() => {
    clearTimer();
    setPhase("idle");
    setDisplay("");
    setWinner("");
    setPickedIds([]);
  }, [clearTimer]);

  const setAvoidRepeats = useCallback((on: boolean) => {
    setAvoidRepeatsState(on);
    setPickedIds([]);
  }, []);

  return (
    <PickerContext.Provider
      value={{
        open,
        setOpen,
        phase,
        display,
        winner,
        avoidRepeats,
        setAvoidRepeats,
        pickedIds,
        spin,
        reset,
      }}
    >
      {children}
      <PickerStage />
    </PickerContext.Provider>
  );
}

export function usePicker(): PickerContextValue {
  const ctx = useContext(PickerContext);
  if (!ctx) throw new Error("usePicker must be used within PickerProvider");
  return ctx;
}

/**
 * One shared overlay (not one per FAB) so Present mode and the floating
 * toolbar don't draw two cards. Portaled into the fullscreen element when
 * the spelling board is presenting — body portals are invisible then.
 */
function PickerStage() {
  const { pupils, currentClassName } = useTracker();
  const {
    open,
    setOpen,
    phase,
    display,
    winner,
    avoidRepeats,
    setAvoidRepeats,
    pickedIds,
    spin,
    reset,
  } = usePicker();
  const send = useRemoteSendOptional();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const update = () =>
      setPortalTarget(
        (document.fullscreenElement as HTMLElement | null) ?? document.body
      );
    update();
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  const spinning = phase === "spinning";
  const done = phase === "done";
  const roundCount = pickedIds.length;

  const spinAndSend = () => {
    const chosen = spin();
    if (chosen) void send({ type: "pick", pupilId: chosen.id });
    else void send({ type: "pick" });
  };

  if (!open || !portalTarget) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[45] flex items-end justify-center bg-paper-900/20 p-4 pb-24 sm:items-center sm:pb-4">
      <div
        className="pointer-events-auto card w-full max-w-md rounded-card p-5 shadow-float"
        role="group"
        aria-label="Random pupil picker"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-paper-400">
            <span aria-hidden="true">🎲</span> Pick a pupil
          </h2>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close picker panel"
            className="rounded-md p-1 text-paper-400 outline-none transition-colors hover:bg-paper-100 hover:text-paper-600 focus-visible:shadow-ring"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {pupils.length === 0 ? (
          <p className="text-sm text-paper-500">
            Add pupils first in the Homework tab.
          </p>
        ) : (
          <>
            <div
              className={`mb-3 flex min-h-32 items-center justify-center rounded-card border p-6 text-center transition-colors ${
                done
                  ? "border-brand-200 bg-brand-50"
                  : "border-paper-100 bg-paper-50"
              }`}
              aria-live="polite"
            >
              {display ? (
                <span
                  className={`font-display font-bold text-paper-800 ${
                    spinning
                      ? "text-3xl text-paper-400 blur-[1px] sm:text-5xl"
                      : "text-4xl motion-reduce:animate-none animate-[pop_.3s_ease-out] sm:text-6xl"
                  }`}
                >
                  {display}
                </span>
              ) : (
                <span className="text-sm text-paper-400">
                  Tap spin to pick someone from {currentClassName || "the class"}.
                </span>
              )}
            </div>

            {done && (
              <p className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-brand-600">
                🎉 You&apos;re up, {winner.split(" ")[0]}!
              </p>
            )}

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={spinAndSend}
                disabled={spinning}
              >
                <Wand2 className="h-4 w-4" />
                {done ? "Spin again" : "Spin"}
              </Button>
              {(done || roundCount > 0) && (
                <Button
                  variant="ghost"
                  onClick={reset}
                  aria-label="Reset picker"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              )}
            </div>

            <label className="mt-3 flex items-center gap-2 text-xs text-paper-500">
              <input
                type="checkbox"
                checked={avoidRepeats}
                onChange={(e) => setAvoidRepeats(e.target.checked)}
                className="h-3.5 w-3.5 accent-brand-500"
              />
              Avoid repeats
              {avoidRepeats && roundCount > 0 && (
                <span className="ml-auto tabular-nums text-paper-400">
                  {roundCount}/{pupils.length} picked
                </span>
              )}
            </label>
          </>
        )}
      </div>
    </div>,
    portalTarget
  );
}

export function PupilPicker() {
  const { open, setOpen, phase } = usePicker();
  const spinning = phase === "spinning";

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Hide pupil picker" : "Show pupil picker"}
        className={`flex h-12 items-center gap-2 rounded-full border px-4 font-display font-bold shadow-float outline-none transition-colors focus-visible:shadow-ring ${
          spinning || open
            ? "border-brand-400 bg-brand-50 text-brand-700"
            : "border-paper-200 bg-surface text-paper-600 hover:border-brand-400"
        }`}
      >
        <span className="text-2xl leading-none" aria-hidden="true">
          🎲
        </span>
      </button>
    </div>
  );
}
