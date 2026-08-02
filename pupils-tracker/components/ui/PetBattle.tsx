"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Dices, Play, RotateCcw, Swords, Volume2, VolumeX, X } from "lucide-react";
import { Pupil } from "@/lib/types";
import { levelFromExp, stageForLevel, sceneSrc, DEFAULT_SCENE } from "@/lib/pets";
import {
  movePool,
  runPk,
  toFighter,
  PK_ROUNDS,
  type PkFighter,
  type PkResult,
  type PkMove,
} from "@/lib/pet-pk";
import { stopPetSpeak } from "@/lib/pet-speak-client";
import { battleShout, shoutIdsFor, type PetShout } from "@/lib/pet-battle-lines";
import {
  isSfxMuted,
  pkShoutDurationMs,
  preloadPkAudio,
  preloadPkShouts,
  schedulePkDuelAudio,
  setSfxMuted,
  type PkAudioCue,
} from "@/lib/sound";
import { PetSprite } from "@/components/ui/PetSprite";
import { PowerEffect } from "@/components/ui/PowerEffect";
import { Button } from "@/components/ui/Button";

/**
 * A round plays as five beats rather than appearing all at once, so there is a
 * build-up and a payoff: announce the round, call the move, charge in, land the
 * blow, settle.
 */
type PkPhase =
  | "idle"
  | "countdown"
  | "announce"
  | "taunt"
  | "clash"
  | "impact"
  | "settle"
  | "done";

const BEATS: { phase: PkPhase; ms: number }[] = [
  { phase: "announce", ms: 700 },
  { phase: "clash", ms: 1100 },
  { phase: "impact", ms: 900 },
  { phase: "settle", ms: 400 },
];

/** Let the round sting clear before the pet speaks over it. */
const SHOUT_DELAY = 140;
/** A breath between the last word and the charge. */
const SHOUT_TAIL = 260;
/** Used when the clip hasn't decoded, so the bubble still gets a beat to show in. */
const SHOUT_FALLBACK = 1600;
/** Nothing sensible runs this long — a guard, not a target. */
const SHOUT_MAX = 4500;

/**
 * The beats of one round. The taunt beat is as long as the line being spoken —
 * the clips run anywhere from 1.5s to 3.5s, so a fixed beat either cut the
 * shortest pets off mid-word or left the longest talking over their own attack.
 * A pet with nothing to say doesn't get a silent beat to say it in.
 */
function beatsFor(
  taunt: { side: "a" | "b"; species: string; shout: PetShout } | null
): { phase: PkPhase; ms: number }[] {
  if (!taunt) return BEATS;
  const spoken =
    pkShoutDurationMs(taunt.species, taunt.shout.id) || SHOUT_FALLBACK;
  const ms = Math.min(SHOUT_MAX, Math.round(SHOUT_DELAY + spoken + SHOUT_TAIL));
  const [announce, ...rest] = BEATS;
  return [announce, { phase: "taunt", ms }, ...rest];
}

/** 3 · 2 · 1 · FIGHT! — one step each, before round one starts. */
const COUNT_STEP = 620;
const PRE_ROLL = COUNT_STEP * 4;
/** The winner's own voice, just behind the victory fanfare. */
const CHEER_DELAY = 520;

/**
 * Who calls their move out loud this round.
 *
 * One pet per round, not both: the clips run over a second each, and two
 * children's voices in the same beat was noise rather than drama. It goes to
 * the pet whose move is about to land, so the shout sets up the impact — and
 * over three rounds a duel that isn't one-sided gives both a turn.
 */
function tauntOf(
  round: PkResult["rounds"][number],
  a: PkFighter,
  b: PkFighter
): { side: "a" | "b"; species: string; shout: PetShout } | null {
  const side = round.winner === "b" ? "b" : "a";
  const fighter = side === "a" ? a : b;
  if (!fighter.species) return null;
  const shout = battleShout(fighter.species, side === "a" ? round.a : round.b);
  return shout ? { side, species: fighter.species, shout } : null;
}

/**
 * Two pupils' pets duel over three rounds, on a stage built for a projector.
 *
 * Deliberately a spectator event: the whole thing plays out on its own so two
 * children can come to the front and the class watches, rather than passing the
 * teacher's device back and forth. The decisions that matter were already made
 * in the shop — this just resolves them. Everything on stage is sized to be read
 * from the back of the room, and the ⚡+Lv+🎲 arithmetic is deliberately absent:
 * one narrated commentary line carries the story instead of a table of numbers.
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
  const [picked, setPicked] = useState<string[]>([]);
  const [result, setResult] = useState<PkResult | null>(null);
  const [fighters, setFighters] = useState<[PkFighter, PkFighter] | null>(null);
  const [round, setRound] = useState(-1);
  const [phase, setPhase] = useState<PkPhase>("idle");
  const [count, setCount] = useState(3);
  // Client-only (the modal mounts on a click), so reading the stored mute at
  // first render is safe and avoids a flash of the wrong sound button.
  const [muted, setMuted] = useState(() => isSfxMuted());
  const timers = useRef<number[]>([]);

  const eligible = pupils.filter((p) => p.pet?.species);

  useEffect(() => {
    // Decode the duel's clips while the teacher is still choosing fighters, so
    // Fight can schedule them instantly rather than waiting on the network.
    void preloadPkAudio();
    const running = timers.current;
    return () => {
      running.forEach((t) => window.clearTimeout(t));
      stopPetSpeak();
    };
  }, []);

  // Move shouts are one clip per species per power, so only the two chosen
  // pets' lines are fetched — and only once each, however often this re-runs.
  useEffect(() => {
    if (picked.length !== 2) return;
    void preloadPkShouts(
      picked.flatMap((id) => {
        const species = pupils.find((p) => p.id === id)?.pet?.species;
        if (!species) return [];
        return shoutIdsFor(species, powersFor(id)).map((shoutId) => ({
          species,
          shoutId,
        }));
      })
    );
  }, [picked, pupils, powersFor]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

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

  /** Two at random — the fastest way to start when nobody has a preference. */
  const surprise = () => {
    if (eligible.length < 2) return;
    const pool = [...eligible];
    const a = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    const b = pool[Math.floor(Math.random() * pool.length)];
    setPicked([a.id, b.id]);
  };

  const startDuel = () => {
    const a = build(picked[0]);
    const b = build(picked[1]);
    const res = runPk(a, b);
    clearTimers();
    setFighters([a, b]);
    setResult(res);
    setRound(-1);
    setCount(3);
    setPhase("countdown");

    // Beat lengths vary by round (each taunt runs as long as its clip), so the
    // sound and the picture are laid out from one plan rather than two loops
    // that have to agree.
    const plan = res.rounds.map((r) => {
      const taunt = tauntOf(r, a, b);
      return { taunt, beats: beatsFor(taunt) };
    });

    // Build the full cue list, then schedule every note on this click's
    // AudioContext timeline. setTimeout + play*() is silent on many school
    // Chromebooks; scheduling up-front is not.
    const cues: PkAudioCue[] = [{ atMs: 0, kind: "countdown" }];
    let at = PRE_ROLL;
    res.rounds.forEach((r, i) => {
      const { taunt, beats } = plan[i];
      for (const beat of beats) {
        if (beat.phase === "announce") {
          cues.push({ atMs: at, kind: "announce" });
        }
        if (beat.phase === "taunt" && taunt) {
          cues.push({
            atMs: at + SHOUT_DELAY,
            kind: "shout",
            species: taunt.species,
            shoutId: taunt.shout.id,
          });
        }
        if (beat.phase === "clash") {
          // Whoosh of the charge, then both powers just behind it.
          //
          // Both pets throw a projectile on screen, so both are heard: playing
          // only the winner's left half the effects silent, and a pet that kept
          // winning with its signature move made every round sound the same.
          // Each is panned to the corner its pet fights from, and B lands a
          // beat later so two clips in the same instant stay tellable apart.
          cues.push({ atMs: at, kind: "charge" });
          ([
            [r.a, -0.55, 160],
            [r.b, 0.55, 250],
          ] as const).forEach(([move, pan, delay]) => {
            if (move.power) {
              cues.push({
                atMs: at + delay,
                kind: "power",
                powerId: move.power.id,
                pan,
              });
            } else {
              cues.push({ atMs: at + delay, kind: "tackle" });
            }
          });
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
    // Fanfare over the final banner, then the winner celebrates in its own voice.
    cues.push({ atMs: at, kind: "victory" });
    const winnerSpecies =
      res.winner === "a" ? a.species : res.winner === "b" ? b.species : undefined;
    if (winnerSpecies) {
      cues.push({ atMs: at + CHEER_DELAY, kind: "cheer", species: winnerSpecies });
    }
    if (!muted) {
      setSfxMuted(false);
      onSoundEnabled?.();
      schedulePkDuelAudio(cues);
    }

    // UI beats only — audio is already on the AudioContext clock.
    [3, 2, 1, 0].forEach((n, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setPhase("countdown");
          setCount(n);
        }, i * COUNT_STEP)
      );
    });
    at = PRE_ROLL;
    plan.forEach(({ beats }, i) => {
      for (const beat of beats) {
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
    timers.current.push(window.setTimeout(() => setPhase("done"), at));
  };

  const newMatch = () => {
    clearTimers();
    stopPetSpeak();
    setResult(null);
    setFighters(null);
    setRound(-1);
    setPhase("idle");
    setPicked([]);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setSfxMuted(next);
    if (!next) onSoundEnabled?.();
  };

  const done = phase === "done";
  // Fight in the challenger's scene (fallback: park) so the arena isn't blank.
  const arenaScene =
    (picked[0]
      ? pupils.find((p) => p.id === picked[0])?.pet?.scene
      : undefined) ?? DEFAULT_SCENE;

  const slotA = picked[0] ? pupils.find((p) => p.id === picked[0]) : undefined;
  const slotB = picked[1] ? pupils.find((p) => p.id === picked[1]) : undefined;

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-paper-900/80 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Pet PK"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-6xl flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Chrome sits on the dark backdrop rather than in a card, so the arena
            itself is the brightest thing in a dimmed classroom. */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2.5 font-display text-xl font-extrabold text-surface sm:text-2xl">
            <Swords className="h-6 w-6 text-brand-300" />
            Pet PK
            <span className="rounded-full border border-brand-300/40 bg-brand-500/20 px-2.5 py-0.5 font-sans text-2xs font-extrabold uppercase tracking-[0.14em] text-brand-300">
              Big screen
            </span>
          </h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleMute}
              aria-pressed={!muted}
              className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-2xs font-extrabold uppercase tracking-wider outline-none transition-colors focus-visible:shadow-ring ${
                muted
                  ? "border-warning/50 bg-warning/20 text-mark-amber"
                  : "border-brand-300/40 bg-brand-500/20 text-brand-300"
              }`}
            >
              {muted ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
              {muted ? "Sound off" : "Sound on"}
            </button>
            <p className="hidden text-2xs font-bold text-paper-400 sm:block">
              Just for fun — nothing changes.
            </p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1 text-paper-400 outline-none transition-colors hover:text-surface focus-visible:shadow-ring"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {!fighters ? (
          <div className="card flex max-h-[84vh] flex-col overflow-hidden">
            {/* VS header — fills in as the two fighters are chosen. */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 bg-gradient-to-r from-brand-50 via-surface to-mark-pink/30 px-4 py-4 sm:px-6">
              <SlotPreview pupil={slotA} expFor={expFor} powersFor={powersFor} />
              <span className="font-display text-2xl font-extrabold text-paper-300 sm:text-3xl">
                VS
              </span>
              <SlotPreview
                pupil={slotB}
                expFor={expFor}
                powersFor={powersFor}
                flip
              />
            </div>

            <div className="thin-scroll flex-1 overflow-y-auto bg-surface px-4 pb-2 pt-4 sm:px-6">
              {eligible.length < 2 ? (
                <p className="rounded-lg bg-paper-100 p-4 text-sm text-paper-500">
                  At least two pupils need a pet before they can duel.
                </p>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-2xs font-extrabold uppercase tracking-[0.08em] text-paper-500">
                      Pick two fighters
                    </p>
                    <Button variant="secondary" onClick={surprise}>
                      <Dices className="h-4 w-4" />
                      Surprise me
                    </Button>
                  </div>
                  <ul className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-3">
                    {eligible.map((p) => {
                      const slot = picked.indexOf(p.id);
                      const level = levelFromExp(expFor(p.id)).level;
                      const stage = stageForLevel(level);
                      const arsenal = movePool(
                        toFighter({
                          pupilId: p.id,
                          pupilName: p.name,
                          petName: p.pet?.name,
                          species: p.pet?.species,
                          stageId: stage.id,
                          exp: expFor(p.id),
                          powers: powersFor(p.id),
                        })
                      );
                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => toggle(p.id)}
                            aria-pressed={slot >= 0}
                            className={`relative flex w-full flex-col items-center gap-1 rounded-lg border-2 p-3 outline-none transition-all focus-visible:shadow-ring ${
                              slot >= 0
                                ? "border-brand-400 bg-brand-50 shadow-float"
                                : "border-paper-100 bg-surface shadow-paper hover:bg-paper-50"
                            }`}
                          >
                            {slot >= 0 && (
                              <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs font-extrabold text-surface shadow-soft">
                                {slot + 1}
                              </span>
                            )}
                            <PetSprite
                              species={p.pet?.species}
                              stageId={stage.id}
                              px={64}
                            />
                            <span className="line-clamp-1 text-sm font-extrabold leading-tight text-paper-800">
                              {p.pet?.name?.trim() || p.name}
                            </span>
                            <span className="text-xs font-bold text-paper-400">
                              Lv {level}
                            </span>
                            <span className="flex flex-wrap justify-center gap-0.5 text-base leading-none">
                              {arsenal.slice(0, 4).map((m) => (
                                <span key={m.label} title={m.label}>
                                  {m.emoji}
                                </span>
                              ))}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-paper-200 px-4 py-4 sm:px-6">
              <p className="text-sm font-extrabold text-paper-400">
                {picked.length}/2 chosen
              </p>
              <Button onClick={startDuel} disabled={picked.length !== 2}>
                <Swords className="h-4 w-4" />
                Fight!
              </Button>
            </div>
          </div>
        ) : (
          <>
            <BattleArena
              a={fighters[0]}
              b={fighters[1]}
              result={result!}
              round={round}
              phase={phase}
              count={count}
              sceneId={arenaScene}
            />
            <div className="flex items-center justify-between gap-3">
              <p className="hidden text-xs font-bold text-paper-400 sm:block">
                {done
                  ? "Nothing changes — marks, powers and levels stay exactly as they were."
                  : "Watch it play out — the class decides the winner they cheer for."}
              </p>
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={newMatch}
                  className="flex items-center gap-1.5 rounded-md border border-paper-200/30 bg-surface/10 px-4 py-2 text-sm font-extrabold text-paper-200 outline-none transition-colors hover:bg-surface/20 focus-visible:shadow-ring"
                >
                  <RotateCcw className="h-4 w-4" />
                  New match
                </button>
                <Button onClick={startDuel} disabled={!done}>
                  <Play className="h-4 w-4" />
                  Replay duel
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** One half of the VS header: an empty plate until a fighter is chosen. */
function SlotPreview({
  pupil,
  expFor,
  powersFor,
  flip = false,
}: {
  pupil?: Pupil;
  expFor: (pupilId: string) => number;
  powersFor: (pupilId: string) => string[];
  /** The right-hand slot mirrors so the two face each other. */
  flip?: boolean;
}) {
  const level = pupil ? levelFromExp(expFor(pupil.id)).level : 0;
  const moves = pupil
    ? movePool(
        toFighter({
          pupilId: pupil.id,
          pupilName: pupil.name,
          petName: pupil.pet?.name,
          species: pupil.pet?.species,
          stageId: stageForLevel(level).id,
          exp: expFor(pupil.id),
          powers: powersFor(pupil.id),
        })
      ).length
    : 0;

  return (
    <div
      className={`flex items-center gap-3 ${flip ? "flex-row-reverse text-right" : ""}`}
    >
      <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-paper-200 bg-paper-50 sm:h-20 sm:w-20">
        {pupil ? (
          <span className={flip ? "-scale-x-100" : undefined}>
            <PetSprite
              species={pupil.pet?.species}
              stageId={stageForLevel(level).id}
              px={60}
            />
          </span>
        ) : (
          <span className="text-2xl text-paper-300" aria-hidden="true">
            ＋
          </span>
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-base font-extrabold text-paper-900 sm:text-lg">
          {pupil ? pupil.pet?.name?.trim() || pupil.name : "Fighter"}
        </span>
        <span className="block truncate text-xs font-bold text-paper-400">
          {pupil
            ? `${pupil.name} · Lv ${level} · ${moves} move${moves === 1 ? "" : "s"}`
            : "tap a pet below"}
        </span>
      </span>
    </div>
  );
}

/**
 * The arena. Full-bleed 16:9 so it fills a projector: three HP pips a side, the
 * round as one big number, the moves as coloured lozenges, and a single line of
 * commentary along the bottom. Each round plays as a beat sequence rather than a
 * line of text — the round is announced, the winner charges across, the blow
 * lands with a flash and a jolt of the whole arena, then both settle.
 */
function BattleArena({
  a,
  b,
  result,
  round,
  phase,
  count,
  sceneId,
}: {
  a: PkFighter;
  b: PkFighter;
  result: PkResult;
  /** Index of the round being played, or -1 before the first. */
  round: number;
  phase: PkPhase;
  /** 3 · 2 · 1 · 0(=FIGHT!) during the countdown. */
  count: number;
  /** Backdrop — challenger's pet scene, or the default park. */
  sceneId: string;
}) {
  const current = round >= 0 ? result.rounds[round] : null;
  const taunt = current ? tauntOf(current, a, b) : null;
  const done = phase === "done";
  // A round is only "settled" once the blow has landed — not while charging.
  const revealed = phase === "impact" || phase === "settle";
  const settledThrough = done
    ? result.rounds.length
    : revealed
      ? round + 1
      : round;
  const settled = result.rounds.slice(0, Math.max(0, settledThrough));
  const lostA = settled.filter((r) => r.winner === "b").length;
  const lostB = settled.filter((r) => r.winner === "a").length;
  const showFx = phase === "clash" || phase === "impact";
  const showMove = showFx || phase === "announce" || phase === "taunt";
  const winMove = current
    ? current.winner === "a"
      ? current.a
      : current.winner === "b"
        ? current.b
        : null
    : null;
  const washTint = showFx ? (winMove ?? current?.a)?.power?.tint : undefined;
  // Alternating class suffix so a repeated animation actually restarts.
  const parity = ((round % 2) + 2) % 2;

  const castClass = (side: "a" | "b") => {
    if (!current) return "";
    // Winding up as it calls the move — a shout from a pet standing perfectly
    // still reads as coming from somewhere else.
    if (phase === "taunt") return taunt?.side === side ? "is-taunt" : "";
    if (!showFx) return "";
    if (current.winner === "draw") return "is-lunge";
    if (current.winner === side) return "is-lunge";
    return phase === "impact" ? "is-hit" : "";
  };

  return (
    <div
      className={`pk-arena relative aspect-video w-full overflow-hidden rounded-card shadow-lift ${
        phase === "impact" ? "is-shaking" : ""
      }`}
      style={{ backgroundImage: `url("${sceneSrc(sceneId)}")` }}
    >
      {washTint && (
        <div
          key={`wash-${round}-${phase}`}
          className="pk-wash"
          style={{ background: washTint }}
          aria-hidden="true"
        />
      )}

      {/* Scorebug: name + HP pips a side, the round as one big number between. */}
      <div className="absolute inset-x-3 top-3 z-[6] flex items-start justify-between gap-3 sm:inset-x-4 sm:top-4">
        <Scorecard name={a.name} lost={lostA} />
        <div className="rounded-lg bg-brand-700/95 px-4 py-1.5 text-center shadow-float">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-200">
            Round
          </p>
          <p className="font-display text-2xl font-extrabold leading-none text-surface sm:text-3xl">
            {current ? Math.min(round + 1, result.rounds.length) : 1}
            <span className="text-base text-brand-300">
              /{Math.max(PK_ROUNDS, result.rounds.length)}
            </span>
          </p>
        </div>
        <Scorecard name={b.name} lost={lostB} align="right" />
      </div>

      {/* Attacks thrown across the stage — colour/art make fire ≠ frost. */}
      {showFx && current && (
        <div className="absolute inset-0 z-[4]" aria-hidden="true">
          <PowerShot side="a" move={current.a} beat={`${round}-${phase}`} />
          <PowerShot side="b" move={current.b} beat={`${round}-${phase}`} />
        </div>
      )}

      {/* Fighters, ~4× the old sprite so they read from the back of the room.
          The row lifts above the scorebug for the taunt only: on a short arena
          the speech bubble reaches up into the name plates, and nothing else
          contends for those layers in that beat (projectiles fly in the clash).
          Any higher outside it and the pets would cover their own attacks. */}
      <div
        className={`absolute inset-x-0 bottom-0 flex items-end justify-between px-4 pb-16 sm:px-8 sm:pb-20 ${
          phase === "taunt" ? "z-[7]" : "z-[3]"
        }`}
      >
        <ArenaSide
          f={a}
          side="a"
          move={current?.a ?? null}
          showMove={showMove}
          shout={phase === "taunt" && taunt?.side === "a" ? taunt.shout : null}
          cast={castClass("a")}
          parity={parity}
          round={round}
        />
        <ArenaSide
          f={b}
          side="b"
          move={current?.b ?? null}
          showMove={showMove}
          shout={phase === "taunt" && taunt?.side === "b" ? taunt.shout : null}
          cast={castClass("b")}
          parity={parity}
          round={round}
        />
      </div>

      {/* ---- transient FX, keyed so each beat restarts its animation ---- */}
      {phase === "countdown" && (
        <span
          key={`count-${count}`}
          className={`pk-countdown font-display font-extrabold ${
            count === 0 ? "pk-countdown-go text-mark-amber" : "text-surface"
          }`}
          style={{
            fontSize: count === 0 ? "clamp(3rem,8vw,6.5rem)" : "clamp(3.75rem,10vw,8rem)",
          }}
        >
          {count === 0 ? "FIGHT!" : count}
        </span>
      )}

      {phase === "announce" && current && (
        <span
          key={`ann-${round}`}
          className="pk-banner font-display font-extrabold text-surface"
          style={{ fontSize: "clamp(2.125rem,5vw,3.625rem)", textShadow: "0 3px 0 var(--color-brand-700)" }}
        >
          {round >= PK_ROUNDS ? "SUDDEN DEATH" : `ROUND ${round + 1}`}
        </span>
      )}

      {phase === "impact" && current && (
        <>
          <span
            key={`imp-${round}`}
            className="pk-impact"
            style={{ fontSize: "5rem" }}
            aria-hidden="true"
          >
            {current.winner === "draw" ? (
              "🛡️"
            ) : (
              <PowerEffect
                powerId={winMove?.power?.id}
                fallback={winMove?.emoji ?? "💥"}
              />
            )}
          </span>
          {winMove?.critical && (
            <span
              key={`crit-${round}`}
              className="pk-crit font-display font-extrabold text-surface"
              style={{ fontSize: "clamp(1.875rem,4.4vw,3rem)" }}
            >
              CRITICAL!
            </span>
          )}
        </>
      )}

      {done && (
        <>
          <span
            key={`win-${result.winner}`}
            className="pk-win font-display font-extrabold text-surface"
            style={{
              fontSize: "clamp(2.5rem,6vw,4.5rem)",
              textShadow: "0 4px 0 var(--color-brand-700)",
            }}
          >
            {result.winner === "draw"
              ? "DRAW!"
              : result.flawless
                ? "FLAWLESS!"
                : result.suddenDeath
                  ? "SUDDEN DEATH!"
                  : "K.O.!"}
          </span>
          {result.winner !== "draw" && (
            <>
              <div
                className="absolute inset-x-0 bottom-14 z-[6] flex justify-center gap-2.5"
                aria-hidden="true"
              >
                {Array.from({ length: 9 }).map((_, i) => (
                  <span
                    key={`crowd-${i}`}
                    className="pk-crowd-face text-2xl sm:text-3xl"
                    style={{ animationDelay: `${(i % 3) * 0.12}s` }}
                  >
                    {["👏", "🎉", "🙌"][i % 3]}
                  </span>
                ))}
              </div>
              <div className="absolute inset-0 z-[7] overflow-hidden" aria-hidden="true">
                {Array.from({ length: 16 }).map((_, i) => (
                  <span
                    key={`confetti-${i}`}
                    className="pk-confetti text-xl"
                    style={{
                      left: `${6 + i * 6}%`,
                      animationDuration: `${2 + (i % 4) * 0.4}s`,
                      animationDelay: `${(i % 5) * 0.15}s`,
                    }}
                  >
                    {["🎉", "⭐", "✨", "🎊"][i % 4]}
                  </span>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* One narrated line rather than a table of numbers. */}
      <div className="absolute inset-x-0 bottom-0 z-[8] bg-paper-900/80 px-5 py-2.5">
        <p className="truncate text-center font-display text-base font-bold text-surface sm:text-xl">
          <Commentary
            a={a}
            b={b}
            result={result}
            current={current}
            phase={phase}
            count={count}
            revealed={revealed}
          />
        </p>
      </div>
    </div>
  );
}

/** A fighter's name plate and the three HP pips beneath it. */
function Scorecard({
  name,
  lost,
  align = "left",
}: {
  name: string;
  lost: number;
  align?: "left" | "right";
}) {
  return (
    <div
      className={`min-w-0 rounded-lg bg-surface/95 px-3 py-2 shadow-float sm:px-4 ${
        align === "right" ? "text-right" : ""
      }`}
    >
      <p className="truncate font-display text-base font-extrabold text-paper-900 sm:text-lg">
        {name}
      </p>
      <span
        className={`mt-1.5 flex gap-1.5 ${align === "right" ? "justify-end" : ""}`}
      >
        {Array.from({ length: PK_ROUNDS }).map((_, i) => (
          <span
            key={i}
            className={`h-2.5 w-7 rounded-sm transition-colors duration-slow sm:w-9 ${
              i < PK_ROUNDS - lost ? "bg-success" : "bg-danger"
            }`}
          />
        ))}
      </span>
    </div>
  );
}

/** The commentary line: who is doing what, and what it cost them. */
function Commentary({
  a,
  b,
  result,
  current,
  phase,
  count,
  revealed,
}: {
  a: PkFighter;
  b: PkFighter;
  result: PkResult;
  current: PkResult["rounds"][number] | null;
  phase: PkPhase;
  count: number;
  revealed: boolean;
}) {
  if (phase === "done") {
    if (result.winner === "draw") return <>🤝 Honours even — a perfect draw!</>;
    const name = result.winner === "a" ? a.name : b.name;
    return (
      <>
        🏆 {name} wins it {Math.max(result.scoreA, result.scoreB)}–
        {Math.min(result.scoreA, result.scoreB)}!
      </>
    );
  }
  if (phase === "countdown") {
    return count === 0 ? (
      <>⚔️ Fight!</>
    ) : (
      <>
        Get ready… {a.name} vs {b.name}
      </>
    );
  }
  if (!current) return <>Ready…</>;
  if (revealed) {
    if (current.winner === "draw") {
      return <>🛡️ Both land for {current.a.total} — the round is split!</>;
    }
    const move = current.winner === "a" ? current.a : current.b;
    const name = current.winner === "a" ? a.name : b.name;
    return (
      <>
        {move.emoji} {move.label}{" "}
        {move.critical ? "lands a CRITICAL" : "connects"} — {name} takes the
        round!
      </>
    );
  }
  return (
    <>
      {current.a.emoji} {current.a.label} vs {current.b.label} {current.b.emoji}
    </>
  );
}

/** A projectile crossing the stage, coloured by the power that threw it. */
function PowerShot({
  side,
  move,
  beat,
}: {
  side: "a" | "b";
  move: PkMove;
  /** Round + phase, so a new beat remounts and replays the animation. */
  beat: string;
}) {
  const tint = move.power?.tint ?? "var(--color-warning)";
  return (
    <span
      key={`shot-${side}-${beat}`}
      className={`pk-fire-${side} absolute`}
      style={{
        left: side === "a" ? "38%" : "62%",
        top: "52%",
        fontSize: "3.25rem",
        filter: `drop-shadow(0 0 14px ${tint})`,
      }}
    >
      <PowerEffect powerId={move.power?.id} fallback={move.emoji} />
    </span>
  );
}

/**
 * One fighter's corner: the move lozenge above, the pet below. Declared at
 * module scope so the sprite isn't remounted every round — that restarted its
 * animation mid-move.
 */
function ArenaSide({
  f,
  side,
  move,
  showMove,
  shout,
  cast,
  parity,
  round,
}: {
  f: PkFighter;
  side: "a" | "b";
  move: PkMove | null;
  showMove: boolean;
  /** The line this pet is calling out right now, if it is this one's turn. */
  shout: PetShout | null;
  /** "is-taunt" | "is-lunge" | "is-hit" | "" for this beat. */
  cast: string;
  parity: number;
  round: number;
}) {
  const powerId = move?.power?.id;
  const casting = cast === "is-lunge";

  return (
    <div className="relative flex flex-col items-center gap-2">
      {shout && (
        // Anchored to the pet's own side rather than centred: a centred bubble
        // this wide runs off the edge of the arena in the outer corners.
        <span
          key={`shout-${round}-${shout.id}`}
          // w-max, not just a max-width: the bubble is absolute inside a column
          // barely wider than the sprite, so it would otherwise shrink to that
          // and stack three words high.
          className={`pk-shout is-${side} w-max max-w-[17rem] rounded-card bg-surface px-4 py-2 text-center font-display text-base font-extrabold leading-tight text-paper-900 shadow-float sm:max-w-[24rem] sm:text-lg lg:text-2xl`}
        >
          “{shout.display}”
        </span>
      )}
      <span
        className="pk-move-call rounded-lg border-2 border-surface/70 px-3 py-1 font-display text-sm font-extrabold text-paper-900 shadow-float sm:text-lg"
        style={{
          background: move?.power?.tint ?? "var(--color-mark-amber)",
          visibility: showMove && move ? "visible" : "hidden",
        }}
      >
        {move ? `${move.emoji} ${move.label}` : "—"}
      </span>
      <div className={`pk-fighter ${side === "b" ? "is-flipped" : ""}`}>
        <div key={`cast-${round}-${cast}-${parity}`} className={`pk-anim ${cast}`}>
          <div
            className={`pet-react-stage ${
              casting && powerId ? `is-power-${powerId}` : ""
            }`}
            style={
              casting && move?.power
                ? { filter: `drop-shadow(0 0 18px ${move.power.tint})` }
                : undefined
            }
          >
            <PetSprite
              species={f.species}
              stageId={f.stageId}
              px={168}
              className={`max-w-full ${cast ? "" : side === "a" ? "pk-bob-a" : "pk-bob-b"}`}
              priority
            />
            {casting &&
              move?.power &&
              move.power.glyphs.map((g, i) => {
                const angle = (-50 + i * 50) * (Math.PI / 180);
                const dist = 84 + i * 12;
                return (
                  <span
                    key={`${round}-${move.label}-${i}`}
                    className={`pet-fx is-burst is-${move.power!.motion}`}
                    style={
                      {
                        "--fx-dx": `${Math.cos(angle) * dist}px`,
                        "--fx-dy": `${Math.sin(angle) * dist - 30}px`,
                        "--fx-rot": `${-24 + i * 24}deg`,
                        fontSize: "2.25rem",
                      } as CSSProperties
                    }
                    aria-hidden="true"
                  >
                    {g}
                  </span>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
