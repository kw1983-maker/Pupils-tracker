"use client";

import { useEffect, useRef, useState } from "react";
import { Swords, X } from "lucide-react";
import { Pupil } from "@/lib/types";
import { levelFromExp, stageForLevel } from "@/lib/pets";
import { powerById } from "@/lib/pet-powers";
import {
  runPk,
  toFighter,
  PK_ROUNDS,
  type PkFighter,
  type PkResult,
  type PkMove,
} from "@/lib/pet-pk";
import { stopPetSpeak } from "@/lib/pet-speak-client";
import {
  schedulePkDuelAudio,
  setSfxMuted,
  type PkAudioCue,
} from "@/lib/sound";
import { PetSprite } from "@/components/ui/PetSprite";
import { Button } from "@/components/ui/Button";
import { useCelebrate } from "@/components/ui/Celebration";

/**
 * A round plays as four beats rather than appearing all at once, so there is a
 * build-up and a payoff: announce the round, charge in, land the blow, settle.
 */
type PkPhase = "idle" | "announce" | "clash" | "impact" | "settle" | "done";
const BEATS: { phase: PkPhase; ms: number }[] = [
  { phase: "announce", ms: 800 },
  { phase: "clash", ms: 520 },
  { phase: "impact", ms: 620 },
  { phase: "settle", ms: 420 },
];

/**
 * Two pupils' pets duel over three rounds. Deliberately a spectator event: the
 * whole thing plays out on its own so two children can come to the front and the
 * class watches, rather than passing the teacher's device back and forth. The
 * decisions that matter were already made in the shop — this just resolves them.
 *
 * Nothing is at stake: no marks move, no power is consumed, no pet is affected.
 */
export function PetBattleModal({
  pupils,
  expFor,
  powersFor,
  onClose,
  onSoundEnabled,
}: {
  /** Only pupils who have a pet can fight. */
  pupils: Pupil[];
  expFor: (pupilId: string) => number;
  powersFor: (pupilId: string) => string[];
  onClose: () => void;
  /** Called when Fight forces sound back on (clears a leftover mute). */
  onSoundEnabled?: () => void;
}) {
  const celebrate = useCelebrate();
  const [picked, setPicked] = useState<string[]>([]);
  const [result, setResult] = useState<PkResult | null>(null);
  const [fighters, setFighters] = useState<[PkFighter, PkFighter] | null>(null);
  const [round, setRound] = useState(-1);
  const [phase, setPhase] = useState<PkPhase>("idle");
  const timers = useRef<number[]>([]);

  const eligible = pupils.filter((p) => p.pet?.species);

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      stopPetSpeak();
    },
    []
  );

  const build = (pupilId: string): PkFighter => {
    const p = pupils.find((x) => x.id === pupilId)!;
    return toFighter({
      pupilId: p.id,
      pupilName: p.name,
      petName: p.pet?.name,
      species: p.pet?.species,
      stageId: stageForLevel(levelFromExp(expFor(p.id)).level).id,
      exp: expFor(p.id),
      powers: powersFor(p.id),
    });
  };

  const toggle = (id: string) =>
    setPicked((cur) =>
      cur.includes(id)
        ? cur.filter((x) => x !== id)
        : cur.length >= 2
          ? [cur[1], id]
          : [...cur, id]
    );

  const fight = () => {
    const a = build(picked[0]);
    const b = build(picked[1]);
    const res = runPk(a, b);
    setFighters([a, b]);
    setResult(res);
    setRound(-1);
    setPhase("idle");

    // Build the full cue list, then schedule every note on this click's
    // AudioContext timeline. setTimeout + play*() is silent on many school
    // Chromebooks; scheduling up-front is not.
    const cues: PkAudioCue[] = [{ atMs: 0, kind: "announce" }];
    let at = 0;
    res.rounds.forEach((r) => {
      for (const beat of BEATS) {
        if (beat.phase === "announce") {
          cues.push({ atMs: at, kind: "announce" });
        }
        if (beat.phase === "clash") {
          const move = r.winner === "b" ? r.b : r.a;
          if (move.power) {
            cues.push({ atMs: at, kind: "power", powerId: move.power.id });
          } else {
            cues.push({ atMs: at, kind: "tackle" });
          }
        }
        if (beat.phase === "impact") {
          cues.push({
            atMs: at,
            kind: r.winner === "draw" ? "draw" : "hit",
          });
        }
        at += beat.ms;
      }
    });
    setSfxMuted(false);
    onSoundEnabled?.();
    schedulePkDuelAudio(cues);

    // UI beats only — audio is already on the AudioContext clock.
    at = 0;
    res.rounds.forEach((r, i) => {
      for (const beat of BEATS) {
        const startAt = at;
        timers.current.push(
          window.setTimeout(() => {
            setRound(i);
            setPhase(beat.phase);
          }, startAt)
        );
        at += beat.ms;
      }
    });
    timers.current.push(
      window.setTimeout(() => {
        setPhase("done");
        if (res.winner !== "draw") celebrate({ intensity: "big" });
      }, at)
    );
  };

  const reset = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    stopPetSpeak();
    setResult(null);
    setFighters(null);
    setRound(-1);
    setPhase("idle");
    setPicked([]);
  };

  const done = phase === "done";

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-paper-900/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Pet PK"
      onClick={onClose}
    >
      <div
        className="card flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-paper-200 px-6 py-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-paper-800">
            <Swords className="h-5 w-5 text-brand-500" />
            Pet PK
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-paper-400 outline-none transition-colors hover:text-paper-600 focus-visible:shadow-ring"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="thin-scroll flex-1 overflow-y-auto bg-paper-50/30 p-6">
          {!fighters ? (
            <>
              <p className="mb-3 text-sm text-paper-600">
                Pick two pets, then press Fight — they use the superpowers
                already bought in the shop. Nothing is won or lost: marks,
                powers and levels all stay exactly as they are.
              </p>
              {eligible.length < 2 ? (
                <p className="rounded-lg bg-paper-100 p-4 text-sm text-paper-500">
                  At least two pupils need a pet before they can duel.
                </p>
              ) : (
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-2">
                  {eligible.map((p) => {
                    const slot = picked.indexOf(p.id);
                    const stage = stageForLevel(
                      levelFromExp(expFor(p.id)).level
                    );
                    const powers = powersFor(p.id);
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => toggle(p.id)}
                          aria-pressed={slot >= 0}
                          className={`relative flex w-full flex-col items-center gap-1 rounded-xl border p-2 outline-none transition-colors focus-visible:shadow-ring ${
                            slot >= 0
                              ? "border-brand-400 bg-brand-50"
                              : "border-paper-100 bg-surface hover:bg-paper-50"
                          }`}
                        >
                          {slot >= 0 && (
                            <span className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-2xs font-extrabold text-surface">
                              {slot + 1}
                            </span>
                          )}
                          <PetSprite
                            species={p.pet?.species}
                            stageId={stage.id}
                            px={48}
                          />
                          <span className="line-clamp-1 text-2xs font-bold text-paper-700">
                            {p.name}
                          </span>
                          <span className="text-[10px] text-paper-400">
                            Lv {levelFromExp(expFor(p.id)).level} ·{" "}
                            {powers.length} ⚡
                          </span>
                          {powers.length > 0 && (
                            <span className="flex flex-wrap justify-center gap-0.5">
                              {powers.slice(0, 4).map((id) => (
                                <span key={id} className="text-[11px]" title={powerById(id)?.label}>
                                  {powerById(id)?.emoji ?? "⚡"}
                                </span>
                              ))}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          ) : (
            <BattleArena
              a={fighters[0]}
              b={fighters[1]}
              result={result!}
              round={round}
              phase={phase}
            />
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-paper-200 px-6 py-4">
          <p className="text-2xs text-paper-400">
            {fighters
              ? "Just for fun — nothing changes."
              : `${picked.length}/2 chosen`}
          </p>
          {fighters ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={reset}>
                Again
              </Button>
              <Button onClick={onClose} disabled={!done}>
                {done ? "Done" : "Fighting…"}
              </Button>
            </div>
          ) : (
            <Button onClick={fight} disabled={picked.length !== 2}>
              <Swords className="h-4 w-4" />
              Fight!
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The arena. Each round plays as a beat sequence rather than a line of text:
 * the round is announced, the winner charges across, the blow lands with a
 * flash and a jolt of the whole arena, then both settle. A static pair of pets
 * beside a table of numbers did not read as a fight.
 */
function BattleArena({
  a,
  b,
  result,
  round,
  phase,
}: {
  a: PkFighter;
  b: PkFighter;
  result: PkResult;
  /** Index of the round being played, or -1 before the first. */
  round: number;
  phase: PkPhase;
}) {
  const current = round >= 0 ? result.rounds[round] : null;
  const settled = result.rounds.slice(0, phase === "done" ? PK_ROUNDS : round);
  const hpA = PK_ROUNDS - settled.filter((r) => r.winner === "b").length;
  const hpB = PK_ROUNDS - settled.filter((r) => r.winner === "a").length;
  const striking = phase === "clash" || phase === "impact";

  return (
    <div className="space-y-3">
      {/* Plain arena — no scene backdrop, so sprites stay readable on the projector. */}
      <div
        className={`pk-arena relative overflow-hidden rounded-card border border-paper-100 bg-surface ${
          phase === "impact" ? "is-shaking" : ""
        }`}
      >
        <div className="flex items-end justify-between gap-2 px-4 pb-4 pt-10">
          <BattleSide
            f={a}
            side="a"
            hp={hpA}
            move={current?.a ?? null}
            attacking={striking && current?.winner === "a"}
            reeling={phase === "impact" && current?.winner === "b"}
          />
          <BattleSide
            f={b}
            side="b"
            hp={hpB}
            move={current?.b ?? null}
            attacking={striking && current?.winner === "b"}
            reeling={phase === "impact" && current?.winner === "a"}
          />
        </div>

        {phase === "announce" && current && (
          <span
            key={`ann-${round}`}
            className="pk-banner font-display text-3xl font-bold text-brand-700"
          >
            ROUND {round + 1}
          </span>
        )}
        {phase === "impact" && current && (
          <span key={`imp-${round}`} className="pk-impact" aria-hidden="true">
            {current.winner === "draw"
              ? "🛡️"
              : (current.winner === "a" ? current.a : current.b).emoji}
          </span>
        )}
        {phase === "done" && (
          <span className="pk-banner font-display text-3xl font-bold text-brand-700">
            {result.winner === "draw" ? "DRAW!" : "K.O.!"}
          </span>
        )}
      </div>

      {/* What just happened, in words, for the round on screen. */}
      <p className="min-h-[1.5rem] text-center text-sm font-semibold text-paper-700">
        {phase === "done"
          ? result.winner === "draw"
            ? "Honours even — a perfect draw!"
            : `${result.winner === "a" ? a.name : b.name} wins ${Math.max(result.scoreA, result.scoreB)}–${Math.min(result.scoreA, result.scoreB)}!`
          : current
            ? current.winner === "draw"
              ? `${current.a.emoji} ${current.a.label} meets ${current.b.label} ${current.b.emoji} — blocked!`
              : `${(current.winner === "a" ? current.a : current.b).emoji} ${
                  (current.winner === "a" ? a : b).name
                } lands ${(current.winner === "a" ? current.a : current.b).label}!`
            : "Ready…"}
      </p>

      {(a.powers.length === 0 || b.powers.length === 0) && (
        <p className="text-center text-2xs text-paper-400">
          Pets with no shop powers use Tackle — open a pet card and buy
          superpowers so PK can use Fire Breath, Sparkle, and more.
        </p>
      )}
      {a.powers.length === 1 && b.powers.length === 1 && a.powers[0] === b.powers[0] && (
        <p className="text-center text-2xs text-paper-400">
          Both pets only own the same power — buy different ones for more
          variety across rounds.
        </p>
      )}

      <ol className="space-y-1">
        {settled.map((r) => (
          <li
            key={r.index}
            className="flex items-center gap-2 rounded-lg border border-paper-100 bg-surface px-3 py-1.5 text-2xs"
          >
            <span className="font-bold text-paper-400">R{r.index + 1}</span>
            <span
              className={`flex-1 truncate ${r.winner === "a" ? "font-bold text-paper-800" : "text-paper-400"}`}
            >
              {r.a.emoji} {r.a.label} · {r.a.total}
            </span>
            <span className="shrink-0 text-paper-300">|</span>
            <span
              className={`flex-1 truncate text-right ${r.winner === "b" ? "font-bold text-paper-800" : "text-paper-400"}`}
            >
              {r.b.total} · {r.b.label} {r.b.emoji}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** One fighter's corner. Declared at module scope so the sprite isn't remounted
 *  every round — that restarted its animation mid-move. */
function BattleSide({
  f,
  side,
  hp,
  move,
  attacking,
  reeling,
}: {
  f: PkFighter;
  side: "a" | "b";
  hp: number;
  move: PkMove | null;
  attacking: boolean;
  reeling: boolean;
}) {
  const arsenal = f.powers
    .map((id) => powerById(id))
    .filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <div className="flex w-[44%] flex-col items-center gap-1.5">
      {/* Health, drained a notch per round lost. */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-paper-200/80">
        <div
          className={`pk-hp h-full rounded-full ${hp <= 1 ? "bg-danger" : "bg-success"}`}
          style={{ width: `${(hp / PK_ROUNDS) * 100}%` }}
        />
      </div>

      <div className={`pk-fighter ${side === "b" ? "is-flipped" : ""}`}>
        <div
          className={`pk-anim ${attacking ? "is-lunge" : ""} ${reeling ? "is-hit" : ""}`}
        >
          <div
            className={`pet-react-stage ${
              attacking && move?.power ? `is-power-${move.power.id}` : ""
            }`}
          >
            <PetSprite
              species={f.species}
              stageId={f.stageId}
              px={104}
              motion={attacking || reeling ? "none" : "hero"}
              priority
            />
          </div>
        </div>
      </div>

      <p className="line-clamp-1 text-center text-sm font-bold text-paper-800">
        {f.name}
      </p>
      <p className="text-2xs font-semibold text-paper-600">
        Lv {f.level} · {f.powers.length} ⚡
      </p>
      <p className="flex min-h-[1.1rem] flex-wrap justify-center gap-0.5 text-sm">
        {arsenal.length > 0 ? (
          arsenal.map((p) => (
            <span key={p.id} title={p.label} aria-label={p.label}>
              {p.emoji}
            </span>
          ))
        ) : (
          <span className="text-2xs text-paper-400" title="No shop powers yet">
            💢 Tackle only
          </span>
        )}
      </p>
    </div>
  );
}
