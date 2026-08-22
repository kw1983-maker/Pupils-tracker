"use client";

import { useEffect, useState } from "react";
import {
  Clapperboard,
  Dices,
  Play,
  RotateCcw,
  Swords,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Pupil } from "@/lib/types";
import {
  levelFromExp,
  stageForLevel,
  sceneSrc,
  spriteFor,
  DEFAULT_SCENE,
} from "@/lib/pets";
import {
  movePool,
  runPk,
  toFighter,
  PK_ROUNDS,
  type PkFighter,
  type PkResult,
} from "@/lib/pet-pk";
import { effectSrc } from "@/lib/pet-powers";
import { battleShout, shoutIdsFor } from "@/lib/pet-battle-lines";
import {
  isSfxMuted,
  preloadPkAudio,
  preloadPkShouts,
  schedulePkDuelAudio,
  setSfxMuted,
  type PkAudioCue,
} from "@/lib/sound";
import { pickKoFinale } from "@/lib/pet-battle-sfx";
import { PetSprite } from "@/components/ui/PetSprite";
import { Button } from "@/components/ui/Button";
import { PetFightPlayer } from "@/components/ui/pet-fight/PetFightPlayer";
import {
  type FightCast,
  type FightSpeechLine,
  type FightWinner,
  CAT_AURA,
  DRA_AURA,
  STAR_CAT,
  STAR_DRA,
} from "@/components/ui/pet-fight/PetFightStage";

type FightPhase = "idle" | "playing" | "done";

/** Cinematic clock cues (seconds) — aligned with storyboard attack beats. */
const LEFT_SHOUT_AT = 2.5;
const LEFT_POWER_AT = 3.9;
const LEFT_HIT_AT = 4.5;
const RIGHT_SHOUT_AT = 6.5;
const RIGHT_POWER_AT = 7.85;
const RIGHT_HIT_AT = 8.85;
const CHEER_AT = 24.0;

/** Build cast look from the move this side actually throws in round 1. */
function castFromMove(
  f: PkFighter,
  move: { power?: { id: string; tint: string } | null },
  side: "left" | "right"
): FightCast {
  const power = move.power ?? null;
  const tint = power?.tint ?? (side === "left" ? CAT_AURA : DRA_AURA);
  return {
    name: f.name,
    spriteSrc: spriteFor(f.species || "cat", f.stageId || "adult"),
    aura: tint,
    starColor: side === "left" ? STAR_CAT : STAR_DRA,
    projectileSrc: power ? effectSrc(power.id) : undefined,
    tint,
  };
}

function winnerSide(result: PkResult): FightWinner {
  if (result.winner === "a") return "left";
  if (result.winner === "b") return "right";
  return "draw";
}

/**
 * Speech bubbles + duel SFX on the cinematic clock.
 * Uses each side's first-round move so the power clip matches the projectile
 * (the baked fight-mix is NOT used for live PK — it always played bubble then fire).
 */
function cinematicAudioForDuel(
  a: PkFighter,
  b: PkFighter,
  result: PkResult
): { lines: FightSpeechLine[]; cues: PkAudioCue[] } {
  const lines: FightSpeechLine[] = [];
  const cues: PkAudioCue[] = [];
  const r0 = result.rounds[0];
  if (!r0) return { lines, cues };

  cues.push({ atMs: 700, kind: "announce" });

  const leftShout = battleShout(a.species, r0.a);
  if (leftShout && a.species) {
    lines.push({
      side: "left",
      text: leftShout.display,
      from: LEFT_SHOUT_AT,
      to: LEFT_POWER_AT,
    });
    cues.push({
      atMs: LEFT_SHOUT_AT * 1000,
      kind: "shout",
      species: a.species,
      shoutId: leftShout.id,
    });
  }
  cues.push({ atMs: (LEFT_POWER_AT - 0.55) * 1000, kind: "charge" });
  if (r0.a.power) {
    cues.push({
      atMs: LEFT_POWER_AT * 1000,
      kind: "power",
      powerId: r0.a.power.id,
      pan: -0.55,
    });
  } else {
    cues.push({ atMs: LEFT_POWER_AT * 1000, kind: "tackle" });
  }
  cues.push({
    atMs: LEFT_HIT_AT * 1000,
    kind: r0.a.critical ? "critical" : "hit",
  });

  const rightShout = battleShout(b.species, r0.b);
  if (rightShout && b.species) {
    lines.push({
      side: "right",
      text: rightShout.display,
      from: RIGHT_SHOUT_AT,
      to: RIGHT_POWER_AT,
    });
    cues.push({
      atMs: RIGHT_SHOUT_AT * 1000,
      kind: "shout",
      species: b.species,
      shoutId: rightShout.id,
    });
  }
  cues.push({ atMs: (RIGHT_POWER_AT - 0.55) * 1000, kind: "charge" });
  if (r0.b.power) {
    cues.push({
      atMs: RIGHT_POWER_AT * 1000,
      kind: "power",
      powerId: r0.b.power.id,
      pan: 0.55,
    });
  } else {
    cues.push({ atMs: RIGHT_POWER_AT * 1000, kind: "tackle" });
  }
  cues.push({
    atMs: RIGHT_HIT_AT * 1000,
    kind: r0.b.critical ? "critical" : "hit2",
  });

  // Combo exchange — alternate hits so it isn't one thud repeated.
  ([11.6, 12.2, 12.9, 13.6, 14.3] as const).forEach((t, i) => {
    cues.push({
      atMs: t * 1000,
      kind: i % 2 === 0 ? "hit" : "hit2",
    });
  });

  cues.push({ atMs: 18500, kind: "charge" });
  // Dragon Ball last-resort: winner's continuous power stream.
  if (result.winner !== "draw") {
    cues.push({
      atMs: 18550,
      kind: "beam",
      pan: result.winner === "a" ? -0.5 : 0.5,
    });
    // Layer the winner's own power voice under the beam if they have one.
    const winRound = result.rounds[0];
    const winMove =
      result.winner === "a" ? winRound?.a : result.winner === "b" ? winRound?.b : null;
    if (winMove?.power) {
      cues.push({
        atMs: 18700,
        kind: "power",
        powerId: winMove.power.id,
        pan: result.winner === "a" ? -0.45 : 0.45,
      });
    }
  }
  cues.push({ atMs: 19050, kind: "critical" });
  // Drastic K.O. slam as the loser falls — one of three finales at random.
  cues.push({ atMs: 22900, kind: "ko", koId: pickKoFinale() });
  cues.push({ atMs: 23200, kind: "victory" });
  if (result.winner !== "draw") {
    cues.push({ atMs: 23500, kind: "crowd" });
  }

  const winnerSpecies =
    result.winner === "a"
      ? a.species
      : result.winner === "b"
        ? b.species
        : undefined;
  if (winnerSpecies) {
    cues.push({
      atMs: CHEER_AT * 1000,
      kind: "cheer",
      species: winnerSpecies,
    });
  }

  return { lines, cues };
}

/**
 * Two pupils' pets duel on the storyboard cinematic stage.
 *
 * Scoring still comes from runPk (three rounds under the hood); the class watches
 * the same 25s choreography used in the showcase, with their pets and the real
 * winner slammed at the end. Nothing is at stake — marks and powers stay put.
 */
export function PetBattleModal({
  pupils,
  expFor,
  powersFor,
  onClose,
  onSoundEnabled,
  onWatchDemo,
}: {
  pupils: Pupil[];
  expFor: (pupilId: string) => number;
  powersFor: (pupilId: string) => string[];
  onClose: () => void;
  onSoundEnabled?: () => void;
  onWatchDemo?: () => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [result, setResult] = useState<PkResult | null>(null);
  const [fighters, setFighters] = useState<[PkFighter, PkFighter] | null>(null);
  const [phase, setPhase] = useState<FightPhase>("idle");
  const [muted, setMuted] = useState(() => isSfxMuted());
  const [replayKey, setReplayKey] = useState(0);
  const [speechLines, setSpeechLines] = useState<FightSpeechLine[]>([]);

  const eligible = pupils.filter((p) => p.pet?.species);

  useEffect(() => {
    void preloadPkAudio();
  }, []);

  // Decode the two fighters' shout clips while the teacher is still picking.
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

  const surprise = () => {
    if (eligible.length < 2) return;
    const pool = [...eligible];
    const a = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]!;
    const b = pool[Math.floor(Math.random() * pool.length)]!;
    setPicked([a.id, b.id]);
  };

  const startDuel = () => {
    const a = build(picked[0]!);
    const b = build(picked[1]!);
    const res = runPk(a, b);
    const { lines, cues } = cinematicAudioForDuel(a, b, res);
    setFighters([a, b]);
    setResult(res);
    setSpeechLines(lines);
    setPhase("playing");
    setReplayKey((k) => k + 1);
    if (!muted) {
      setSfxMuted(false);
      onSoundEnabled?.();
      // Live PK: schedule real power / shout / hit cues — do NOT play the
      // baked fight-mix (it hardcodes bubble then fire regardless of pets).
      if (cues.length) schedulePkDuelAudio(cues);
    }
  };

  const newMatch = () => {
    setResult(null);
    setFighters(null);
    setSpeechLines([]);
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
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2.5 font-display text-xl font-extrabold text-surface sm:text-2xl">
            <Swords className="h-6 w-6 text-brand-300" />
            Pet PK
            <span className="rounded-full border border-brand-300/40 bg-brand-500/20 px-2.5 py-0.5 font-sans text-2xs font-extrabold uppercase tracking-[0.14em] text-brand-300">
              Big screen
            </span>
          </h2>
          <div className="flex items-center gap-3">
            {onWatchDemo && (
              <button
                type="button"
                onClick={onWatchDemo}
                className="flex items-center gap-1.5 rounded-md border border-brand-300/40 bg-brand-500/20 px-3 py-1.5 text-2xs font-extrabold uppercase tracking-wider text-brand-300 outline-none transition-colors hover:bg-brand-500/30 focus-visible:shadow-ring"
              >
                <Clapperboard className="h-3.5 w-3.5" />
                Showcase
              </button>
            )}
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
            <PetFightPlayer
              key={replayKey}
              left={castFromMove(
                fighters[0],
                result?.rounds[0]?.a ?? {},
                "left"
              )}
              right={castFromMove(
                fighters[1],
                result?.rounds[0]?.b ?? {},
                "right"
              )}
              winner={result ? winnerSide(result) : "left"}
              sceneSrc={sceneSrc(arenaScene)}
              sound={false}
              loop={false}
              speech={speechLines}
              hud={
                result
                  ? {
                      leftName: fighters[0].name,
                      rightName: fighters[1].name,
                      roundWinners: result.rounds.map((r) => r.winner),
                      maxHp: PK_ROUNDS,
                      duelWinner: winnerSide(result),
                    }
                  : undefined
              }
              onComplete={() => setPhase("done")}
            />

            <div className="flex items-center justify-between gap-3">
              <p className="hidden text-xs font-bold text-paper-400 sm:block">
                {done
                  ? result
                    ? result.winner === "draw"
                      ? "Honours even — a perfect draw!"
                      : `${result.winner === "a" ? fighters[0].name : fighters[1].name} takes it ${Math.max(result.scoreA, result.scoreB)}–${Math.min(result.scoreA, result.scoreB)}.`
                    : ""
                  : "The full fight plays out — sit back and cheer."}
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

function SlotPreview({
  pupil,
  expFor,
  powersFor,
  flip = false,
}: {
  pupil?: Pupil;
  expFor: (pupilId: string) => number;
  powersFor: (pupilId: string) => string[];
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
