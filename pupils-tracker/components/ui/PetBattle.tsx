"use client";

import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  Bot,
  Clapperboard,
  Dices,
  Eye,
  Play,
  RotateCcw,
  Swords,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Pupil } from "@/lib/types";
import {
  levelFromExp,
  stageForLevel,
  sceneSrc,
  DEFAULT_SCENE,
} from "@/lib/pets";
import {
  movePool,
  runPk,
  toFighter,
  PK_ROUNDS,
  type PkFighter,
} from "@/lib/pet-pk";
import { BOSSES, bossFighter, bossFor, type Difficulty } from "@/lib/pet-boss";
import { shoutIdsFor } from "@/lib/pet-battle-lines";
import {
  isSfxMuted,
  preloadPkAudio,
  preloadPkShouts,
  schedulePkDuelAudio,
  setSfxMuted,
} from "@/lib/sound";
import { pickFinale } from "@/lib/pet-fight/finales";
import { pickPowerUp } from "@/lib/pet-fight/powerups";
import { duelAudio } from "@/lib/pet-fight/pk-audio";
import type { FightSpeechLine } from "@/lib/pet-fight/poses";
import { PetSprite } from "@/components/ui/PetSprite";
import { Button } from "@/components/ui/Button";
import { PetFightPlayer } from "@/components/ui/pet-fight/PetFightPlayer";
import { castFromMove, winnerSide } from "@/components/ui/pet-fight/fight-cast";
import { InteractiveDuel } from "@/components/ui/pet-fight/InteractiveDuel";

/**
 * How a duel is played.
 *
 * "watch" is the original and still the default: the teacher picks two pets, the
 * maths is rolled in one call and the class watches 32 seconds of cinematic. The
 * other two hand the moves to whoever is in the room — which is the whole point
 * of them, since in watch mode nobody is actually playing.
 */
type Mode = "watch" | "pc" | "duo";

const MODES: Array<{
  id: Mode;
  label: string;
  hint: string;
  icon: typeof Eye;
  /** Pets the teacher has to pick before it can start. */
  needs: number;
}> = [
  {
    id: "watch",
    label: "Watch",
    hint: "Two pets duel, the class cheers. Nobody plays.",
    icon: Eye,
    needs: 2,
  },
  {
    id: "pc",
    label: "vs Computer",
    hint: "One pupil picks every move against a house pet.",
    icon: Bot,
    needs: 1,
  },
  {
    id: "duo",
    label: "2 Players",
    hint: "Two pupils pick their own moves, one screen.",
    icon: Users,
    needs: 2,
  },
];

/** What a started match needs — the interactive modes take it round by round. */
type Match = {
  a: PkFighter;
  b: PkFighter;
  ai?: Difficulty;
  scene: string;
};

/**
 * Pet PK.
 *
 * Nothing is at stake in any mode: no marks change hands, no power is spent and
 * the pet is unaffected. A duel is entertainment, so losing one costs a child
 * nothing — see the header of lib/pet-pk.ts.
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
  const [mode, setMode] = useState<Mode>("watch");
  const [picked, setPicked] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [match, setMatch] = useState<Match | null>(null);
  const [muted, setMuted] = useState(() => isSfxMuted());
  const [runKey, setRunKey] = useState(0);
  // The player freezes the fight on its last frame when the OS asks for reduced
  // motion, which reads as "broken" on a classroom PC — so say so out loud.
  const reduced = useReducedMotion();

  const eligible = useMemo(
    () => pupils.filter((p) => p.pet?.species),
    [pupils]
  );
  const spec = MODES.find((m) => m.id === mode)!;
  const needs = spec.needs;

  useEffect(() => {
    void preloadPkAudio();
  }, []);

  // Decode the fighters' shout clips while the teacher is still picking.
  useEffect(() => {
    if (picked.length === 0) return;
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
    setPicked((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (needs === 1) return [id];
      return cur.length >= 2 ? [cur[1], id] : [...cur, id];
    });

  const surprise = () => {
    if (eligible.length < needs) return;
    const pool = [...eligible];
    const a = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]!;
    if (needs === 1) {
      setPicked([a.id]);
      return;
    }
    const b = pool[Math.floor(Math.random() * pool.length)]!;
    setPicked([a.id, b.id]);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    // A pick made for a two-pet mode is meaningless in a one-pet mode and vice
    // versa, so start the choosing over rather than silently keeping half of it.
    setPicked([]);
  };

  const start = () => {
    const a = build(picked[0]!);
    const b =
      mode === "pc" ? bossFighter(bossFor(difficulty), a.level) : build(picked[1]!);
    const scene =
      pupils.find((p) => p.id === picked[0])?.pet?.scene ?? DEFAULT_SCENE;
    setMatch({ a, b, ai: mode === "pc" ? difficulty : undefined, scene });
    setRunKey((k) => k + 1);
    if (!muted) {
      setSfxMuted(false);
      onSoundEnabled?.();
    }
  };

  const newMatch = () => {
    setMatch(null);
    setPicked([]);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setSfxMuted(next);
    if (!next) onSoundEnabled?.();
  };

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-paper-900/80 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Pet PK"
      onClick={onClose}
    >
      <div
        className="thin-scroll flex max-h-full w-full max-w-6xl flex-col gap-3 overflow-y-auto"
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

        {reduced && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-card border border-warning/50 bg-warning/20 px-4 py-3 shadow-float"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-mark-amber" />
            <p className="text-xs font-bold text-surface sm:text-sm">
              Animations are switched off on this PC, so the fight shows as a
              still picture. Turn them back on in{" "}
              <span className="text-mark-amber">
                Settings → Accessibility → Visual effects → Animation effects
              </span>
              , then reload this page.
            </p>
          </div>
        )}

        {!match ? (
          <SetupScreen
            mode={mode}
            onMode={switchMode}
            eligible={eligible}
            picked={picked}
            onToggle={toggle}
            onSurprise={surprise}
            difficulty={difficulty}
            onDifficulty={setDifficulty}
            needs={needs}
            expFor={expFor}
            powersFor={powersFor}
            onStart={start}
          />
        ) : match.ai || mode === "duo" ? (
          <InteractiveDuel
            key={runKey}
            a={match.a}
            b={match.b}
            ai={match.ai}
            scene={match.scene}
            muted={muted}
            onRestart={() => setRunKey((k) => k + 1)}
            onExit={newMatch}
          />
        ) : (
          <WatchDuel
            key={runKey}
            a={match.a}
            b={match.b}
            scene={match.scene}
            muted={muted}
            onReplay={() => setRunKey((k) => k + 1)}
            onExit={newMatch}
          />
        )}
      </div>
    </div>
  );
}

/** Mode picker, fighter picker, and whatever else the chosen mode needs. */
function SetupScreen({
  mode,
  onMode,
  eligible,
  picked,
  onToggle,
  onSurprise,
  difficulty,
  onDifficulty,
  needs,
  expFor,
  powersFor,
  onStart,
}: {
  mode: Mode;
  onMode: (m: Mode) => void;
  eligible: Pupil[];
  picked: string[];
  onToggle: (id: string) => void;
  onSurprise: () => void;
  difficulty: Difficulty;
  onDifficulty: (d: Difficulty) => void;
  needs: number;
  expFor: (pupilId: string) => number;
  powersFor: (pupilId: string) => string[];
  onStart: () => void;
}) {
  const slotA = picked[0] ? eligible.find((p) => p.id === picked[0]) : undefined;
  const slotB = picked[1] ? eligible.find((p) => p.id === picked[1]) : undefined;
  const boss = bossFor(difficulty);
  const enough = eligible.length >= needs;

  return (
    <div className="card flex max-h-[84vh] flex-col overflow-hidden">
      <div className="flex flex-wrap gap-1.5 border-b border-paper-200 bg-paper-50 px-4 py-3 sm:px-6">
        {MODES.map((m) => {
          const Icon = m.icon;
          const on = m.id === mode;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onMode(m.id)}
              aria-pressed={on}
              title={m.hint}
              className={`flex items-center gap-1.5 rounded-lg border-2 px-3 py-2 text-xs font-extrabold outline-none transition-all focus-visible:shadow-ring ${
                on
                  ? "border-brand-400 bg-brand-50 text-brand-600 shadow-paper"
                  : "border-paper-200 bg-surface text-paper-500 hover:bg-paper-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {m.label}
            </button>
          );
        })}
        <p className="w-full text-2xs font-bold text-paper-400 sm:w-auto sm:self-center sm:pl-2">
          {MODES.find((m) => m.id === mode)!.hint}
        </p>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 bg-gradient-to-r from-brand-50 via-surface to-mark-pink/30 px-4 py-4 sm:px-6">
        <SlotPreview pupil={slotA} expFor={expFor} powersFor={powersFor} />
        <span className="font-display text-2xl font-extrabold text-paper-300 sm:text-3xl">
          VS
        </span>
        {mode === "pc" ? (
          <BossPreview difficulty={difficulty} playerLevel={
            slotA ? levelFromExp(expFor(slotA.id)).level : 1
          } />
        ) : (
          <SlotPreview
            pupil={slotB}
            expFor={expFor}
            powersFor={powersFor}
            flip
          />
        )}
      </div>

      {mode === "pc" && (
        <fieldset className="border-b border-paper-200 bg-surface px-4 pb-3 pt-3 sm:px-6">
          <legend className="mb-2 text-2xs font-extrabold uppercase tracking-[0.08em] text-paper-500">
            Who are they up against?
          </legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {BOSSES.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => onDifficulty(b.difficulty)}
                aria-pressed={b.difficulty === difficulty}
                className={`flex items-center gap-2 rounded-lg border-2 p-2 text-left outline-none transition-all focus-visible:shadow-ring ${
                  b.difficulty === difficulty
                    ? "border-brand-400 bg-brand-50 shadow-paper"
                    : "border-paper-200 bg-surface hover:bg-paper-50"
                }`}
              >
                <PetSprite species={b.species} stageId="adult" px={36} />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-extrabold text-paper-800">
                    {b.name}
                  </span>
                  <span className="block text-2xs font-bold uppercase tracking-wider text-paper-400">
                    {b.difficulty}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-2xs font-bold text-paper-400">{boss.blurb}</p>
        </fieldset>
      )}

      <div className="thin-scroll flex-1 overflow-y-auto bg-surface px-4 pb-2 pt-4 sm:px-6">
        {!enough ? (
          <p className="rounded-lg bg-paper-100 p-4 text-sm text-paper-500">
            {needs === 1
              ? "A pupil needs a pet before they can take on the computer."
              : "At least two pupils need a pet before they can duel."}
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-2xs font-extrabold uppercase tracking-[0.08em] text-paper-500">
                {needs === 1 ? "Pick a fighter" : "Pick two fighters"}
              </p>
              <Button variant="secondary" onClick={onSurprise}>
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
                      onClick={() => onToggle(p.id)}
                      aria-pressed={slot >= 0}
                      className={`relative flex w-full flex-col items-center gap-1 rounded-lg border-2 p-3 outline-none transition-all focus-visible:shadow-ring ${
                        slot >= 0
                          ? "border-brand-400 bg-brand-50 shadow-float"
                          : "border-paper-100 bg-surface shadow-paper hover:bg-paper-50"
                      }`}
                    >
                      {slot >= 0 && needs > 1 && (
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
          {picked.length}/{needs} chosen
        </p>
        <Button onClick={onStart} disabled={picked.length !== needs}>
          <Swords className="h-4 w-4" />
          Fight!
        </Button>
      </div>
    </div>
  );
}

/**
 * The original watched duel: the whole thing is rolled in one call and the class
 * watches 32 seconds of choreography with the real winner slammed at the end.
 */
function WatchDuel({
  a,
  b,
  scene,
  muted,
  onReplay,
  onExit,
}: {
  a: PkFighter;
  b: PkFighter;
  scene: string;
  muted: boolean;
  onReplay: () => void;
  onExit: () => void;
}) {
  const [done, setDone] = useState(false);
  // Drawn once per pass so two matches in a row neither level up nor end the
  // same way.
  const [run] = useState(() => {
    const result = runPk(a, b);
    const finale = pickFinale();
    const powerUp = pickPowerUp();
    return { result, finale, powerUp };
  });

  const { result, finale, powerUp } = run;

  const [speech] = useState<FightSpeechLine[]>(() => {
    const { lines, cues } = duelAudio(a, b, result.rounds[0], {
      announce: true,
      finish: { finale, powerUp, winner: result.winner },
    });
    // Live PK schedules its own cues here rather than handing them to the
    // player, because the shouts have to be decoded before the click.
    if (!muted && cues.length) schedulePkDuelAudio(cues);
    return lines;
  });

  return (
    <>
      <PetFightPlayer
        left={castFromMove(a, result.rounds[0]?.a ?? {}, "left")}
        right={castFromMove(b, result.rounds[0]?.b ?? {}, "right")}
        winner={winnerSide(result)}
        sceneSrc={sceneSrc(scene)}
        finale={finale}
        powerUp={powerUp}
        sound={false}
        loop={false}
        speech={speech}
        hud={{
          leftName: a.name,
          rightName: b.name,
          roundWinners: result.rounds.map((r) => r.winner),
          maxHp: PK_ROUNDS,
          duelWinner: winnerSide(result),
        }}
        onComplete={() => setDone(true)}
      />

      <div className="flex items-center justify-between gap-3">
        <p className="hidden text-xs font-bold text-paper-400 sm:block">
          {done
            ? result.winner === "draw"
              ? "Honours even — a perfect draw!"
              : `${result.winner === "a" ? a.name : b.name} takes it ${Math.max(result.scoreA, result.scoreB)}–${Math.min(result.scoreA, result.scoreB)}.`
            : "The full fight plays out — sit back and cheer."}
        </p>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-1.5 rounded-md border border-paper-200/30 bg-surface/10 px-4 py-2 text-sm font-extrabold text-paper-200 outline-none transition-colors hover:bg-surface/20 focus-visible:shadow-ring"
          >
            <RotateCcw className="h-4 w-4" />
            New match
          </button>
          <Button onClick={onReplay} disabled={!done}>
            <Play className="h-4 w-4" />
            Replay duel
          </Button>
        </div>
      </div>
    </>
  );
}

function BossPreview({
  difficulty,
  playerLevel,
}: {
  difficulty: Difficulty;
  playerLevel: number;
}) {
  const boss = bossFor(difficulty);
  const fighter = bossFighter(boss, playerLevel);
  return (
    <div className="flex flex-row-reverse items-center gap-3 text-right">
      <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-paper-200 bg-paper-50 sm:h-20 sm:w-20">
        <span className="-scale-x-100">
          <PetSprite species={boss.species} stageId={fighter.stageId} px={60} />
        </span>
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-base font-extrabold text-paper-900 sm:text-lg">
          {boss.name}
        </span>
        <span className="block truncate text-xs font-bold text-paper-400">
          The computer · Lv {fighter.level} ·{" "}
          {movePool(fighter).length} move
          {movePool(fighter).length === 1 ? "" : "s"}
        </span>
      </span>
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
