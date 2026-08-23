"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { BEAT, FIGHT_DURATION, W, H } from "@/lib/pet-fight/storyboard";
import {
  PetFightStage,
  type FightCast,
  type FightSpeechLine,
  type FightWinner,
} from "@/components/ui/pet-fight/PetFightStage";
import { Button } from "@/components/ui/Button";
import { PK_ROUNDS } from "@/lib/pet-pk";
import type { FinaleId } from "@/lib/pet-fight/finales";
import {
  schedulePkDuelAudio,
  stopPkDuelAudio,
  type PkAudioCue,
} from "@/lib/sound";

/** When each successive round's damage is applied on the cinematic clock. */
const HP_REVEAL_AT = [4.5, 8.85, 14.3, BEAT.impact, BEAT.ko];

export type FightHud = {
  leftName: string;
  rightName: string;
  /** Round winners in order — "a" hits the right bar, "b" hits the left. */
  roundWinners: Array<"a" | "b" | "draw">;
  maxHp?: number;
  /** Overall duel winner — loser's bar empties at the K.O. beat. */
  duelWinner?: FightWinner;
};

const KO_AT = BEAT.ko;

function livesAt(T: number, side: "a" | "b", hud: FightHud): number {
  const max = hud.maxHp ?? PK_ROUNDS;

  // At K.O., the loser is out — bar must read empty even if they still had pips.
  if (T >= KO_AT && hud.duelWinner && hud.duelWinner !== "draw") {
    const isLoser =
      (hud.duelWinner === "left" && side === "b") ||
      (hud.duelWinner === "right" && side === "a");
    if (isLoser) return 0;
  }

  let lost = 0;
  hud.roundWinners.forEach((w, i) => {
    const at = HP_REVEAL_AT[Math.min(i, HP_REVEAL_AT.length - 1)] ?? KO_AT;
    if (T < at) return;
    if (w === "draw") return;
    if ((side === "a" && w === "b") || (side === "b" && w === "a")) lost += 1;
  });
  return Math.max(0, max - lost);
}

/** Cinematic-only badge that pops when this pet breaks through into gold. */
function LevelUpBadge({ T }: { T: number }) {
  if (T < BEAT.flash) return null;
  const p = Math.min(1, (T - BEAT.flash) / 0.3);
  // easeOutBack, matching the arcade banners on the stage.
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const ease = 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
  return (
    <span
      className="ml-1.5 inline-flex shrink-0 items-center gap-0.5 rounded-sm bg-mark-amber px-1.5 py-0.5 align-middle font-sans text-[9px] font-extrabold uppercase tracking-wider text-paper-900 shadow-float sm:text-[10px]"
      style={{ transform: `scale(${0.4 + ease * 0.6})` }}
    >
      Lv ▲
    </span>
  );
}

function LifeBar({
  name,
  hp,
  maxHp,
  align,
  fillClass,
  levelUp,
}: {
  name: string;
  hp: number;
  maxHp: number;
  align: "left" | "right";
  fillClass: string;
  levelUp: ReactNode;
}) {
  const pct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
  return (
    <div
      className={`min-w-0 flex-1 ${align === "right" ? "text-right" : ""}`}
    >
      <p
        className="truncate font-display text-sm font-extrabold text-surface drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] sm:text-base"
      >
        {name}
        {levelUp}
      </p>
      <div
        className="mt-1 h-3 overflow-hidden rounded-full border border-surface/25 bg-paper-900/55 sm:h-3.5"
        role="meter"
        aria-label={`${name} health`}
        aria-valuenow={hp}
        aria-valuemin={0}
        aria-valuemax={maxHp}
      >
        <div
          className={`h-full rounded-full transition-[width,margin] duration-500 ease-out ${fillClass}`}
          style={{
            width: `${pct}%`,
            // Right fighter's bar drains toward the right edge (arcade style).
            marginLeft: align === "right" ? `${100 - pct}%` : 0,
            boxShadow:
              pct > 0
                ? "inset 0 1px 0 rgba(255,255,255,0.35)"
                : undefined,
          }}
        />
      </div>
      <div
        className={`mt-1 flex gap-1 ${align === "right" ? "flex-row-reverse justify-start" : ""}`}
        aria-hidden="true"
      >
        {Array.from({ length: maxHp }).map((_, i) => {
          // Pips deplete from the outer edge (left: L→R, right: R→L).
          const filled = i < hp;
          return (
            <span
              key={i}
              className={`h-1.5 w-4 rounded-sm sm:w-5 ${
                filled ? "bg-success" : "bg-danger/70"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

function FightLifeHud({
  T,
  hud,
  transform,
  winner,
}: {
  T: number;
  hud: FightHud;
  transform: boolean;
  winner: FightWinner;
}) {
  const maxHp = hud.maxHp ?? PK_ROUNDS;
  const leftHp = livesAt(T, "a", hud);
  const rightHp = livesAt(T, "b", hud);
  // Matches transformsSide() on the stage: the winner powers up, a draw both.
  const leftLevels = transform && winner !== "right";
  const rightLevels = transform && winner !== "left";
  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start gap-2 sm:inset-x-4 sm:top-4 sm:gap-3">
      <LifeBar
        name={hud.leftName}
        hp={leftHp}
        maxHp={maxHp}
        align="left"
        fillClass="bg-gradient-to-r from-mark-green to-success"
        levelUp={leftLevels ? <LevelUpBadge T={T} /> : null}
      />
      <div className="shrink-0 rounded-lg bg-brand-700/95 px-3 py-1.5 text-center shadow-float sm:px-4">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-200">
          HP
        </p>
        <p className="font-display text-base font-extrabold leading-none text-surface sm:text-lg">
          {leftHp}–{rightHp}
        </p>
      </div>
      <LifeBar
        name={hud.rightName}
        hp={rightHp}
        maxHp={maxHp}
        align="right"
        fillClass="bg-gradient-to-l from-mark-pink to-danger"
        levelUp={rightLevels ? <LevelUpBadge T={T} /> : null}
      />
    </div>
  );
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * Aspect-video fight player: rAF clock plus, when `cues` are supplied, the duel
 * soundtrack scheduled on one AudioContext clock (see schedulePkDuelAudio).
 * Remount with a new `key` to restart a matchup (Pet PK does this on Fight!).
 */
export function PetFightPlayer({
  left,
  right,
  winner,
  sceneSrc,
  sound = true,
  loop = false,
  autoPlay = true,
  onComplete,
  className,
  showControls = false,
  controlsHint,
  speech,
  hud,
  finale = "beam",
  transform = true,
  cues,
}: {
  left: FightCast;
  right: FightCast;
  winner: FightWinner;
  sceneSrc: string;
  sound?: boolean;
  loop?: boolean;
  autoPlay?: boolean;
  onComplete?: () => void;
  className?: string;
  showControls?: boolean;
  controlsHint?: string;
  speech?: FightSpeechLine[];
  /** Name + round results — drives the on-stage life bars. */
  hud?: FightHud;
  /** Which finishing move this duel drew. */
  finale?: FinaleId;
  /** Set false to skip the golden power-up scene. */
  transform?: boolean;
  /**
   * Duel soundtrack. Scheduled when a pass starts from the top and dropped on
   * pause/unmount. Live PK schedules its own cues before mounting the player
   * and leaves this undefined.
   */
  cues?: PkAudioCue[];
}) {
  const reduced = usePrefersReducedMotion();
  const [T, setT] = useState(() => (reduced ? FIGHT_DURATION - 0.8 : 0));
  const [playing, setPlaying] = useState(() => autoPlay && !reduced);
  // Bumped whenever a pass starts from T=0 (mount, restart, loop wrap) so the
  // soundtrack is re-armed exactly once per pass.
  const [pass, setPass] = useState(0);
  const rafRef = useRef(0);
  const lastRef = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [fit, setFit] = useState(1);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const cuesRef = useRef(cues);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    cuesRef.current = cues;
  }, [cues]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      // Tiny overscan so subpixel rounding never leaves a strip of the
      // player fill (that read as a second copy of the hills).
      setFit(Math.min(rect.width / W, rect.height / H) * 1.006);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || reduced) {
      lastRef.current = null;
      return;
    }
    const tick = (now: number) => {
      if (lastRef.current == null) lastRef.current = now;
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      setT((prev) => {
        let next = prev + dt;
        if (next >= FIGHT_DURATION) {
          if (loop) {
            next = next % FIGHT_DURATION;
            // A fresh pass needs a fresh soundtrack; scheduling can't happen
            // inside a state updater, so defer it.
            queueMicrotask(() => setPass((p) => p + 1));
          } else {
            next = FIGHT_DURATION;
            if (!completedRef.current) {
              completedRef.current = true;
              queueMicrotask(() => {
                setPlaying(false);
                onCompleteRef.current?.();
              });
            }
          }
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, reduced, loop]);

  // Arm the soundtrack once per pass. Deliberately keyed on `pass` and not on
  // `T`: every cue for the whole 30s is scheduled up-front on the AudioContext
  // clock, which is what keeps it audible on school Chromebooks.
  useEffect(() => {
    if (!sound || reduced) return;
    const list = cuesRef.current;
    if (!list?.length) return;
    schedulePkDuelAudio(list);
    return () => stopPkDuelAudio();
  }, [pass, sound, reduced]);

  // Pausing can't pause scheduled audio — drop it and re-arm on the next pass.
  useEffect(() => {
    if (!playing && cuesRef.current?.length) stopPkDuelAudio();
  }, [playing]);

  const restart = () => {
    completedRef.current = false;
    setT(0);
    setPlaying(true);
    setPass((p) => p + 1);
  };

  return (
    <div className={className}>
      <div
        ref={stageRef}
        className="relative aspect-video w-full overflow-hidden rounded-card bg-paper-900 shadow-lift"
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: W,
            height: H,
            transform: `translate(-50%, -50%) scale(${fit})`,
            transformOrigin: "center center",
          }}
        >
          <PetFightStage
            T={T}
            left={left}
            right={right}
            winner={winner}
            sceneSrc={sceneSrc}
            shakeMul={reduced ? 0 : 1}
            speech={speech}
            finale={finale}
            transform={transform && !reduced}
          />
        </div>
        {hud && (
          <FightLifeHud
            T={T}
            hud={hud}
            transform={transform && !reduced}
            winner={winner}
          />
        )}
      </div>
      {showControls && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="hidden text-xs font-bold text-paper-400 sm:block">
            {reduced
              ? "Motion reduced — showing the finale still."
              : (controlsHint ??
                "Pick two class pets and hit Fight! for this choreography with your real winner.")}
          </p>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={restart}
              className="flex items-center gap-1.5 rounded-md border border-paper-200/30 bg-surface/10 px-4 py-2 text-sm font-extrabold text-paper-200 outline-none transition-colors hover:bg-surface/20 focus-visible:shadow-ring"
            >
              <RotateCcw className="h-4 w-4" />
              Restart
            </button>
            <Button onClick={() => setPlaying(!playing)}>
              {playing ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {playing ? "Pause" : "Play"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
