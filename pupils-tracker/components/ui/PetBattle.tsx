"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Swords, X } from "lucide-react";
import { Pupil } from "@/lib/types";
import { levelFromExp, stageForLevel, sceneSrc, DEFAULT_SCENE } from "@/lib/pets";
import { SPECIES_SIGNATURE, movePool, runPk, toFighter, PK_ROUNDS, type PkFighter, type PkResult, type PkMove } from "@/lib/pet-pk";
import { powerById } from "@/lib/pet-powers";
import { stopPetSpeak } from "@/lib/pet-speak-client";
import {
  preloadPkAudio,
  schedulePkDuelAudio,
  setSfxMuted,
  type PkAudioCue,
} from "@/lib/sound";
import { PetSprite } from "@/components/ui/PetSprite";
import { PowerEffect } from "@/components/ui/PowerEffect";
import { Button } from "@/components/ui/Button";
import { useCelebrate } from "@/components/ui/Celebration";

/**
 * A round plays as four beats rather than appearing all at once, so there is a
 * build-up and a payoff: announce the round, charge in, land the blow, settle.
 */
type PkPhase = "idle" | "announce" | "clash" | "impact" | "settle" | "done";
const BEATS: { phase: PkPhase; ms: number }[] = [
  { phase: "announce", ms: 700 },
  { phase: "clash", ms: 1100 },
  { phase: "impact", ms: 900 },
  { phase: "settle", ms: 400 },
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

  useEffect(() => {
    // Decode the duel's clips while the teacher is still choosing fighters, so
    // Fight can schedule them instantly rather than waiting on the network.
    void preloadPkAudio();
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      stopPetSpeak();
    };
  }, []);

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
    const cues: PkAudioCue[] = [];
    let at = 0;
    res.rounds.forEach((r) => {
      for (const beat of BEATS) {
        if (beat.phase === "announce") {
          cues.push({ atMs: at, kind: "announce" });
        }
        if (beat.phase === "clash") {
          // Whoosh of the charge, then the power itself just behind it.
          cues.push({ atMs: at, kind: "charge" });
          const move = r.winner === "b" ? r.b : r.a;
          if (move.power) {
            cues.push({ atMs: at + 160, kind: "power", powerId: move.power.id });
          } else {
            cues.push({ atMs: at + 160, kind: "tackle" });
          }
        }
        if (beat.phase === "impact") {
          const move = r.winner === "b" ? r.b : r.a;
          cues.push({
            atMs: at,
            kind:
              r.winner === "draw" ? "draw" : move.critical ? "critical" : "hit",
          });
        }
        at += beat.ms;
      }
    });
    // Fanfare over the final banner.
    cues.push({ atMs: at, kind: "victory" });
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
  // Fight in the challenger's scene (fallback: park) so the arena isn't blank.
  const arenaScene =
    (picked[0]
      ? pupils.find((p) => p.id === picked[0])?.pet?.scene
      : undefined) ?? DEFAULT_SCENE;

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

        <div className="thin-scroll flex-1 overflow-y-auto bg-surface p-6">
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
                          <span className="flex flex-wrap justify-center gap-0.5">
                            {powers.length > 0
                              ? powers.slice(0, 4).map((id) => (
                                  <span
                                    key={id}
                                    className="text-[11px]"
                                    title={powerById(id)?.label}
                                  >
                                    {powerById(id)?.emoji ?? "⚡"}
                                  </span>
                                ))
                              : (() => {
                                  const sig = p.pet?.species
                                    ? SPECIES_SIGNATURE[p.pet.species]
                                    : undefined;
                                  return sig ? (
                                    <span
                                      className="text-[11px]"
                                      title={sig.label}
                                    >
                                      {sig.emoji}
                                    </span>
                                  ) : null;
                                })()}
                          </span>
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
              sceneId={arenaScene}
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
  sceneId,
}: {
  a: PkFighter;
  b: PkFighter;
  result: PkResult;
  /** Index of the round being played, or -1 before the first. */
  round: number;
  phase: PkPhase;
  /** Backdrop — challenger's pet scene, or the default park. */
  sceneId: string;
}) {
  const current = round >= 0 ? result.rounds[round] : null;
  // Reveal the round's maths once the blow lands — not while they're still charging.
  const revealScore = phase === "impact" || phase === "settle";
  const settledThrough =
    phase === "done"
      ? PK_ROUNDS
      : revealScore
        ? round + 1
        : round;
  const settled = result.rounds.slice(0, Math.max(0, settledThrough));
  const hpA = PK_ROUNDS - settled.filter((r) => r.winner === "b").length;
  const hpB = PK_ROUNDS - settled.filter((r) => r.winner === "a").length;
  const showFx = phase === "clash" || phase === "impact";
  const winMove =
    current && current.winner !== "draw"
      ? current.winner === "a"
        ? current.a
        : current.b
      : null;
  const washTint =
    showFx && winMove?.power
      ? winMove.power.tint
      : showFx && current?.a.power
        ? current.a.power.tint
        : null;

  return (
    <div className="space-y-3">
      <div
        className={`pk-arena relative overflow-hidden rounded-card border-2 border-paper-200 ${
          phase === "impact" ? "is-shaking" : ""
        } ${winMove?.power ? `is-hit-${winMove.power.id}` : ""}`}
        style={{
          backgroundImage: `url("${sceneSrc(sceneId)}")`,
          backgroundSize: "cover",
          backgroundPosition: "center 78%",
        }}
      >
        {washTint && showFx && (
          <div
            key={`wash-${round}-${phase}`}
            className="pk-power-wash"
            style={{ background: washTint }}
            aria-hidden="true"
          />
        )}

        {/* Attacks thrown toward the middle — colour/emoji make fire ≠ frost. */}
        {showFx && current && (
          <div className="pk-shots" aria-hidden="true">
            <PowerShot side="a" move={current.a} round={round} />
            <PowerShot side="b" move={current.b} round={round} />
          </div>
        )}

        <div className="relative z-[2] flex items-end justify-between gap-2 px-4 pb-4 pt-12">
          <BattleSide
            f={a}
            side="a"
            hp={hpA}
            move={current?.a ?? null}
            round={round}
            casting={
              phase === "clash" ||
              (phase === "impact" &&
                (current?.winner === "a" || current?.winner === "draw"))
            }
            reeling={phase === "impact" && current?.winner === "b"}
            showMove={showFx || phase === "announce"}
          />
          <BattleSide
            f={b}
            side="b"
            hp={hpB}
            move={current?.b ?? null}
            round={round}
            casting={
              phase === "clash" ||
              (phase === "impact" &&
                (current?.winner === "b" || current?.winner === "draw"))
            }
            reeling={phase === "impact" && current?.winner === "a"}
            showMove={showFx || phase === "announce"}
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
        {showFx && current && (
          <div
            key={`names-${round}-${phase}`}
            className="pk-clash-names pointer-events-none absolute inset-x-2 top-2 z-[7] flex items-start justify-between gap-2"
          >
            <MoveCallout move={current.a} align="left" />
            <MoveCallout move={current.b} align="right" />
          </div>
        )}
        {phase === "impact" && current && (
          <>
            <span key={`imp-${round}`} className="pk-impact" aria-hidden="true">
              {current.winner === "draw" ? (
                "🛡️"
              ) : (
                <PowerEffect
                  powerId={
                    (current.winner === "a" ? current.a : current.b).power?.id
                  }
                  fallback={
                    (current.winner === "a" ? current.a : current.b).emoji
                  }
                  className="pk-impact-img"
                />
              )}
            </span>
            {current.winner !== "draw" &&
              (current.winner === "a" ? current.a : current.b).critical && (
                <span
                  key={`crit-${round}`}
                  className="pk-crit font-display text-2xl font-extrabold text-warning-ink"
                >
                  CRITICAL!
                </span>
              )}
          </>
        )}
        {phase === "done" && (
          <span className="pk-banner font-display text-3xl font-bold text-brand-700">
            {result.winner === "draw"
              ? "DRAW!"
              : result.flawless
                ? "FLAWLESS!"
                : result.suddenDeath
                  ? "SUDDEN DEATH!"
                  : "K.O.!"}
          </span>
        )}
      </div>

      {/* Projector-friendly maths: power + level + luck = total. */}
      {revealScore && current && (
        <RoundScoreboard
          key={`score-${round}`}
          a={current.a}
          b={current.b}
          winner={current.winner}
        />
      )}

      <p className="min-h-[1.5rem] text-center text-sm font-semibold text-paper-700">
        {phase === "done"
          ? result.winner === "draw"
            ? "Honours even — a perfect draw!"
            : `${result.winner === "a" ? a.name : b.name} wins ${Math.max(result.scoreA, result.scoreB)}–${Math.min(result.scoreA, result.scoreB)}!`
          : current && revealScore
            ? current.winner === "draw"
              ? `Tie — both scored ${current.a.total}!`
              : `${(current.winner === "a" ? a : b).name} wins ${
                  (current.winner === "a" ? current.a : current.b).total
                } to ${(current.winner === "a" ? current.b : current.a).total}!`
            : current
              ? `${current.a.emoji} ${current.a.label} vs ${current.b.label} ${current.b.emoji}`
              : "Ready…"}
      </p>

      <ol className="space-y-2">
        {settled.map((r) => {
          const win = r.winner === "draw" ? null : r.winner === "a" ? r.a : r.b;
          return (
            <li
              key={r.index}
              className="rounded-lg border-2 px-3 py-2"
              style={
                win?.power
                  ? {
                      borderColor: win.power.tint,
                      background: win.power.tint,
                    }
                  : {
                      borderColor: "var(--color-paper-100)",
                      background: "var(--color-surface)",
                    }
              }
            >
              <div className="flex items-center gap-2 text-2xs">
                <span className="font-bold text-paper-500">R{r.index + 1}</span>
                <span
                  className={`flex-1 truncate ${r.winner === "a" ? "font-extrabold text-paper-900" : "text-paper-500"}`}
                >
                  {r.a.emoji} {r.a.label}
                </span>
                <span className="shrink-0 font-bold text-paper-400">vs</span>
                <span
                  className={`flex-1 truncate text-right ${r.winner === "b" ? "font-extrabold text-paper-900" : "text-paper-500"}`}
                >
                  {r.b.label} {r.b.emoji}
                </span>
              </div>
              <div className="mt-1 flex items-start justify-between gap-2">
                <MoveMath move={r.a} win={r.winner === "a"} align="left" />
                <MoveMath move={r.b} win={r.winner === "b"} align="right" />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Big side-by-side totals for the projector when a round lands. */
function RoundScoreboard({
  a,
  b,
  winner,
}: {
  a: PkMove;
  b: PkMove;
  winner: "a" | "b" | "draw";
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-card border-2 border-paper-200 bg-surface px-3 py-3 shadow-float">
      <ScoreColumn move={a} win={winner === "a"} align="left" />
      <span className="font-display text-lg font-bold text-paper-400">vs</span>
      <ScoreColumn move={b} win={winner === "b"} align="right" />
    </div>
  );
}

function ScoreColumn({
  move,
  win,
  align,
}: {
  move: PkMove;
  win: boolean;
  align: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <p
        className={`font-display text-3xl font-extrabold tabular-nums leading-none ${
          win ? "text-brand-700" : "text-paper-500"
        }`}
      >
        {move.total}
      </p>
      <MoveMath move={move} win={win} align={align} />
    </div>
  );
}

/** Compact power + level + luck line. */
function MoveMath({
  move,
  win,
  align,
}: {
  move: PkMove;
  win: boolean;
  align: "left" | "right";
}) {
  return (
    <p
      className={`text-2xs tabular-nums ${
        win ? "font-bold text-paper-800" : "font-semibold text-paper-500"
      } ${align === "right" ? "text-right" : "text-left"}`}
    >
      <span title="Power">⚡{move.strength}</span>
      <span className="text-paper-300"> + </span>
      <span title="Level">Lv{move.levelBonus}</span>
      <span className="text-paper-300"> + </span>
      <span title="Luck">🎲{move.roll}</span>
      <span className="text-paper-300"> = </span>
      <span className="font-extrabold">{move.total}</span>
    </p>
  );
}

function PowerShot({
  side,
  move,
  round,
}: {
  side: "a" | "b";
  move: PkMove;
  round: number;
}) {
  return (
    <span
      key={`shot-${round}-${side}-${move.label}`}
      className={`pk-shot pk-shot-${side}`}
      style={
        {
          "--shot-tint": move.power?.tint ?? "var(--color-warning)",
        } as CSSProperties
      }
    >
      <PowerEffect powerId={move.power?.id} fallback={move.emoji} />
    </span>
  );
}

function MoveCallout({
  move,
  align,
}: {
  move: PkMove;
  align: "left" | "right";
}) {
  return (
    <span
      className={`pk-move-call max-w-[48%] rounded-xl border-2 border-paper-900/10 px-2.5 py-1.5 font-display text-base font-extrabold leading-tight text-paper-900 shadow-float ${
        align === "right" ? "text-right" : "text-left"
      }`}
      style={{
        background: move.power?.tint ?? "var(--color-warning)",
      }}
    >
      <span className="mr-1 text-lg" aria-hidden="true">
        {move.emoji}
      </span>
      {move.label}
    </span>
  );
}

/** One fighter's corner. Declared at module scope so the sprite isn't remounted
 *  every round — that restarted its animation mid-move. */
function BattleSide({
  f,
  side,
  hp,
  move,
  round,
  casting,
  reeling,
  showMove,
}: {
  f: PkFighter;
  side: "a" | "b";
  hp: number;
  move: PkMove | null;
  round: number;
  casting: boolean;
  reeling: boolean;
  showMove: boolean;
}) {
  const arsenal = movePool(f);
  const hasPower = Boolean(move?.power);
  const useLunge = casting && !hasPower;
  const usePower = casting && hasPower;
  const powerId = move?.power?.id;

  return (
    <div className="flex w-[44%] flex-col items-center gap-1.5">
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-paper-200/80">
        <div
          className={`pk-hp h-full rounded-full ${hp <= 1 ? "bg-danger" : "bg-success"}`}
          style={{ width: `${(hp / PK_ROUNDS) * 100}%` }}
        />
      </div>

      <div
        className={`pk-fighter ${side === "b" ? "is-flipped" : ""} ${
          usePower && powerId ? `is-casting-${powerId}` : ""
        }`}
        style={
          usePower && move?.power
            ? { filter: `drop-shadow(0 0 14px ${move.power.tint})` }
            : undefined
        }
      >
        <div
          className={`pk-anim ${useLunge ? "is-lunge" : ""} ${reeling ? "is-hit" : ""}`}
        >
          {/* Remount each cast so CSS power animations restart every round. */}
          <div
            key={`cast-${round}-${side}-${move?.label ?? "idle"}-${casting}`}
            className={`pet-react-stage ${
              usePower && powerId ? `is-power-${powerId}` : ""
            }`}
          >
            <PetSprite
              species={f.species}
              stageId={f.stageId}
              px={104}
              motion={casting || reeling ? "none" : "hero"}
              priority
            />
            {usePower && move?.power && (
              <>
                {move.power.glyphs.map((g, i) => {
                  const angle = (-50 + i * 50) * (Math.PI / 180);
                  const dist = 62 + i * 10;
                  return (
                    <span
                      key={`${round}-${move.label}-${i}`}
                      className="pet-fx is-burst"
                      style={
                        {
                          "--fx-dx": `${Math.cos(angle) * dist}px`,
                          "--fx-dy": `${Math.sin(angle) * dist - 24}px`,
                          "--fx-rot": `${-24 + i * 24}deg`,
                          fontSize: "1.85rem",
                        } as CSSProperties
                      }
                      aria-hidden="true"
                    >
                      {g}
                    </span>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>

      <p className="line-clamp-1 text-center text-sm font-bold text-paper-800">
        {f.name}
      </p>
      <p
        className="min-h-[1.35rem] rounded-md px-2 py-0.5 text-center text-xs font-extrabold text-paper-900"
        style={
          showMove && move?.power
            ? { background: move.power.tint }
            : undefined
        }
      >
        {showMove && move ? (
          <>
            {move.emoji} {move.label}
          </>
        ) : (
          <span className="font-semibold text-paper-600">
            Lv {f.level} · {arsenal.length} moves
          </span>
        )}
      </p>
      <p className="flex min-h-[1.1rem] flex-wrap justify-center gap-0.5 text-base">
        {arsenal.map((m) => (
          <span key={m.label} title={m.label} aria-label={m.label}>
            {m.emoji}
          </span>
        ))}
      </p>
    </div>
  );
}
