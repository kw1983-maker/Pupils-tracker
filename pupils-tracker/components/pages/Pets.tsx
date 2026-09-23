"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import {
  Check,
  Clapperboard,
  Cookie,
  Eye,
  Hand,
  Heart,
  Megaphone,
  Moon,
  Music,
  PawPrint,
  Lock,
  RotateCcw,
  Settings,
  Sparkles,
  Sun,
  Star,
  Swords,
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useTracker } from "@/lib/store";
import {
  SHOP_POWERS,
  powerById,
  powerSoundSrc,
  type PetPower,
  type PowerMotion,
} from "@/lib/pet-powers";
import { Pupil } from "@/lib/types";
import {
  PET_SPECIES,
  levelFromExp,
  stageForLevel,
  speciesById,
  stageIndexOf,
  PET_SCENES,
  DEFAULT_SCENE,
  sceneSrc,
  sceneAmbientSrc,
  type PetStage,
  type PetSpecies,
} from "@/lib/pets";
import {
  pickPetLine,
  pickSceneLine,
  type CareAction,
} from "@/lib/pet-voice";
import {
  speakPetLine,
  stopPetSpeak,
  playSceneAmbience,
  stopSceneAmbience,
  playPetPowerSound,
} from "@/lib/pet-speak-client";
import { isSfxMuted, playPetCare, setSfxMuted } from "@/lib/sound";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal, Overlay } from "@/components/ui/Modal";
import { Field, fieldClassName } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Button } from "@/components/ui/Button";
import { useCelebrate } from "@/components/ui/Celebration";
import { PetSprite, type PetMotion } from "@/components/ui/PetSprite";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { SPECIES_SIGNATURE } from "@/lib/pet-pk";
import { PetBattleModal } from "@/components/ui/PetBattle";
import { PetFightCinematic } from "@/components/ui/pet-fight/PetFightCinematic";
import { PowerEffect } from "@/components/ui/PowerEffect";
import { SpeciesUnlockModal } from "@/components/ui/SpeciesUnlockModal";

type PetFx = {
  id: number;
  glyph: string;
  drift: number;
  /** Set for superpower bursts: throw vector + spin, in place of a gentle rise. */
  dx?: number;
  dy?: number;
  rot?: number;
  /** Which `.pet-fx.is-<motion>` keyframes to run. */
  motion?: PowerMotion;
  /** Power whose sprite to draw instead of the emoji glyph. */
  powerId?: string;
};

const CARE_GLYPHS: Record<CareAction, string[]> = {
  pat: ["♡", "💖", "✨"],
  cheer: ["★", "✦", "🎉"],
  peek: ["👀", "✨", "?"],
  feed: ["🍎", "🍪", "🥕"],
  roar: ["🔊", "💥", "❗"],
  sleep: ["💤", "😴", "🌙"],
  wake: ["☀️", "✨", "❗"],
  dance: ["🎵", "🎶", "✨"],
  tickle: ["😆", "😹", "✨"],
  dizzy: ["💫", "🌀", "😵"],
};

const POWER_PARTICLES = 12;

/**
 * Where each of a power's particles flies. Every power used to throw the same
 * radial fan, which made eight powers read as one effect in eight colours —
 * flames drifted sideways like confetti and ice floated upward. Each motion
 * gets its own spread; the matching `.pet-fx.is-<motion>` keyframes in
 * globals.css carry the timing and wobble.
 */
function buildPowerFx(power: PetPower, nextId: () => number): PetFx[] {
  const rand = (min: number, max: number) => min + Math.random() * (max - min);

  return Array.from({ length: POWER_PARTICLES }, (_, i) => {
    const t = i / (POWER_PARTICLES - 1); // 0..1 across the burst
    let dx = 0;
    let dy = 0;
    let rot = 0;

    switch (power.motion) {
      case "rise": // flames: a narrow column licking upward
        dx = rand(-46, 46);
        dy = -rand(90, 170);
        rot = rand(-25, 25);
        break;
      case "fall": // ice: shards dropping and scattering
        dx = rand(-95, 95);
        dy = rand(30, 110);
        rot = rand(-180, 180);
        break;
      case "jagged": // lightning: snaps out barely, all speed and no travel
        dx = rand(-70, 70);
        dy = rand(-55, 25);
        rot = rand(-40, 40);
        break;
      case "float": // bubbles: drift lazily up and outward
        dx = rand(-70, 70);
        dy = -rand(40, 110);
        rot = rand(-15, 15);
        break;
      case "spiral": { // vortex: evenly around, flung outward
        const a = t * Math.PI * 2;
        const r = rand(70, 120);
        dx = Math.cos(a) * r;
        dy = Math.sin(a) * r * 0.6 - 10;
        rot = 360;
        break;
      }
      case "arc": { // rainbow: a sweeping bow overhead
        const a = Math.PI * t; // left to right
        dx = -Math.cos(a) * rand(90, 130);
        dy = -Math.sin(a) * rand(70, 100) - 15;
        rot = rand(-20, 20);
        break;
      }
      case "soar": // flight: launched hard, straight up
        dx = rand(-38, 38);
        dy = -rand(130, 200);
        rot = rand(-12, 12);
        break;
      case "beam": // laser: fired dead level, no spread and no tumble
        dx = rand(120, 210);
        dy = rand(-10, 10);
        rot = 0;
        break;
      default: { // spray: an even radial burst
        const a = (-160 + 320 * t) * (Math.PI / 180);
        const r = rand(70, 150);
        dx = Math.sin(a) * r;
        dy = -Math.abs(Math.cos(a)) * r * 0.8 - 20;
        rot = rand(-180, 180);
      }
    }

    return {
      id: nextId(),
      glyph: power.glyphs[i % power.glyphs.length],
      drift: 0,
      dx: Math.round(dx),
      dy: Math.round(dy),
      rot: Math.round(rot),
      motion: power.motion,
      powerId: power.id,
    };
  });
}

// Tapping the pet escalates while you keep going: a couple of pats, then
// giggling, then completely dizzy. The streak resets after a short pause so a
// later visit starts gently again.
const TAP_TICKLE_AT = 3;
const TAP_DIZZY_AT = 6;
const TAP_RESET_MS = 1800;
// Superpower animations run up to 1.25s (Super Flight); hold the reaction class
// past that or the pet snaps back mid-move.
const POWER_REACTION_MS = 1400;

function petMood(
  stageId: string,
  recentPositives: { date: string }[]
): { label: string; tip: string; tone: string } {
  if (stageId === "egg") {
    return {
      label: "Waiting",
      tip: "Keep awarding positives — the egg is listening.",
      tone: "bg-paper-100 text-paper-600",
    };
  }
  const latest = recentPositives[0]?.date;
  if (!latest) {
    return {
      label: "Sleepy",
      tip: "A pat or cheer wakes them up. Positive points grow them.",
      tone: "bg-mark-purple text-mark-purple-ink",
    };
  }
  const days =
    (Date.now() - new Date(`${latest}T12:00:00`).getTime()) / 86_400_000;
  if (days <= 3) {
    return {
      label: "Happy",
      tip: "Recent positives have them glowing.",
      tone: "bg-success-bg text-success-ink",
    };
  }
  if (days <= 10) {
    return {
      label: "Curious",
      tip: "Ready for another win in class.",
      tone: "bg-brand-50 text-brand-700",
    };
  }
  return {
    label: "Sleepy",
    tip: "A little cheer (or a positive point) perks them up.",
    tone: "bg-mark-purple text-mark-purple-ink",
  };
}

/** The tappable pet on the detail modal: sprite + reaction animation + floaters. */
function InteractivePet({
  species,
  stageId,
  px,
  motion,
  reaction,
  fx,
  onTap,
  label,
  asleep,
  flash,
}: {
  species?: string;
  stageId: string;
  px: number;
  motion: PetMotion;
  /** Drives the `is-*` animation class; a CareAction or "power". */
  reaction: string | null;
  fx: PetFx[];
  onTap: () => void;
  label: string;
  /** Keeps the pet slumped and dimmed between reactions until it's woken. */
  asleep?: boolean;
  /** Colour of the one-shot wash when a superpower fires. */
  flash?: string | null;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={label}
      className={`pet-react-stage ${reaction ? `is-${reaction}` : ""} ${
        asleep && reaction !== "wake" ? "is-asleep" : ""
      }`}
    >
      <PetSprite
        species={species}
        stageId={stageId}
        px={px}
        motion={motion}
        priority
      />
      {fx.map((f) => (
        <span
          key={f.id}
          className={`pet-fx ${f.dx !== undefined ? "is-burst" : ""} ${
            f.motion ? `is-${f.motion}` : ""
          }`}
          style={
            {
              "--fx-drift": `${f.drift}px`,
              ...(f.dx !== undefined
                ? {
                    "--fx-dx": `${f.dx}px`,
                    "--fx-dy": `${f.dy}px`,
                    "--fx-rot": `${f.rot}deg`,
                  }
                : {}),
            } as CSSProperties
          }
          aria-hidden="true"
        >
          <PowerEffect powerId={f.powerId} fallback={f.glyph} />
        </span>
      ))}
      {flash && (
        <>
          {/* Behind the sprite: a coloured bloom, so the pet looks lit from
              within rather than just brightened. */}
          <span
            className="pet-power-glow"
            style={{ "--power-tint": flash } as CSSProperties}
            aria-hidden="true"
          />
          <span
            className="pet-shockwave"
            style={{ "--power-tint": flash } as CSSProperties}
            aria-hidden="true"
          />
          <span
            className="pet-power-flash"
            style={{ "--power-tint": flash } as CSSProperties}
            aria-hidden="true"
          />
        </>
      )}
    </button>
  );
}

// A thin EXP progress bar (fraction of the current level completed).
function ExpBar({ progress }: { progress: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-paper-100">
      <div
        className="h-full rounded-full bg-brand-500 transition-[width] duration-500"
        style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }}
      />
    </div>
  );
}

/** How many pets the leaderboard lists before "Show all". */
const BOARD_PREVIEW = 10;

export function Pets() {
  const {
    pupils,
    behavior,
    getPupilExp,
    setPupilPet,
    unlockSpecies,
    setPupilPetName,
    clearPupilPet,
    markPetStageSeen,
    setPupilPetScene,
    getPupilBalance,
    getPupilPowers,
    buyPetPower,
  } = useTracker();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pkOpen, setPkOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  // Shared with the Students-tab Sound toggle (one localStorage key). Read on
  // first render: the Shell only mounts tabs after hydration, so there is no
  // server render for this to disagree with.
  const [muted, setMuted] = useState(() => isSfxMuted());
  const [showAllBoard, setShowAllBoard] = useState(false);

  const selected = pupils.find((p) => p.id === selectedId) ?? null;

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setSfxMuted(next);
    // Audible confirm when turning sound back on.
    if (!next) playPetCare("pat");
  };

  // Class leaderboard: pets only — a pupil with no pet has nothing to rank —
  // highest EXP first, name as tie-break.
  const ranked = pupils
    .filter((p) => p.pet?.species)
    .map((p) => ({ pupil: p, exp: getPupilExp(p.id) }))
    .sort((a, b) => b.exp - a.exp || a.pupil.name.localeCompare(b.pupil.name));
  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3, showAllBoard ? undefined : BOARD_PREVIEW);

  const withPet = ranked.length;

  // ---- hatching ceremony ----------------------------------------------------
  // A pet's stage is derived from behaviour points, which are awarded over in
  // the Students tab, so growth happens while this tab is closed. Comparing the
  // live stage with the last one we celebrated (pet.seenStage) lets us throw the
  // party when the teacher next opens Pets.
  const petStageNow = (p: Pupil) =>
    p.pet?.species ? stageForLevel(levelFromExp(getPupilExp(p.id)).level) : null;

  // Pets that grew since we last looked. Only forward moves count, so removing
  // points can't re-trigger a ceremony.
  const pendingHatch = pupils.filter((p) => {
    const now = petStageNow(p);
    if (!now || !p.pet?.seenStage) return false;
    return stageIndexOf(now.id) > stageIndexOf(p.pet.seenStage);
  });

  // Keep seenStage in step with any pet that is NOT ahead of it, silently and
  // with no ceremony. Two cases:
  //   • no seenStage yet — a pet from before this feature shipped, or one just
  //     chosen; catching it up stops whole rosters hatching at once on first open.
  //   • the pet went backwards — a positive award was undone or deleted, so EXP
  //     fell and the pet returned to an earlier stage. Following it down means
  //     re-earning those points hatches it (and celebrates) all over again.
  useEffect(() => {
    for (const p of pupils) {
      if (!p.pet?.species) continue;
      const now = petStageNow(p);
      if (!now) continue;
      const seen = p.pet.seenStage;
      if (!seen || stageIndexOf(now.id) < stageIndexOf(seen)) {
        markPetStageSeen(p.id, now.id);
      }
    }
    // petStageNow/markPetStageSeen are redefined each render; the pupil roster
    // and their points are what actually decide this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pupils, behavior]);

  const hatching = pendingHatch[0] ?? null;

  return (
    <div className="space-y-4">
      <SectionCard
        title="Class pets"
        action={
          <span className="flex flex-wrap items-center justify-end gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold tabular-nums text-paper-500">
              <PawPrint className="h-3.5 w-3.5" aria-hidden />
              {withPet}/{pupils.length} hatched
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDemoOpen(true)}
              title="Watch a sample fight with the same animation Pet PK uses"
            >
              <Clapperboard className="h-4 w-4" aria-hidden />
              Showcase
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSound}
              aria-pressed={!muted}
              title={muted ? "Pet sounds off — click to turn on" : "Pet sounds on — click to mute"}
              className={muted ? "bg-warning-bg text-warning-ink hover:bg-warning-bg hover:brightness-95" : ""}
            >
              {muted ? (
                <VolumeX className="h-4 w-4" aria-hidden />
              ) : (
                <Volume2 className="h-4 w-4 text-brand-500" aria-hidden />
              )}
              {muted ? "Sound off" : "Sound on"}
            </Button>
            <Button
              size="sm"
              onClick={() => setPkOpen(true)}
              disabled={withPet < 1}
              title={
                withPet < 1
                  ? "A pupil needs a pet before there is anything to duel with"
                  : "Watch two pets duel, or play a round-by-round fight"
              }
            >
              <Swords className="h-4 w-4" aria-hidden />
              Pet PK
            </Button>
          </span>
        }
      >
        {pupils.length === 0 ? (
          <EmptyState title="No pupils yet">
            Add a namelist in the Homework tab, then come back to raise pets.
          </EmptyState>
        ) : (
          <>
            <p className="mb-3 flex items-center gap-1.5 text-sm text-paper-500">
              <Sparkles className="h-4 w-4 shrink-0 text-brand-500" aria-hidden />
              Positive points grow pets. Open a pet to play with it — they talk
              back! Play never changes EXP.
            </p>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
              {pupils.map((p, i) => {
                const exp = getPupilExp(p.id);
                const info = levelFromExp(exp);
                const stage = stageForLevel(info.level);
                const hasPet = !!p.pet?.species;
                const petName = p.pet?.name?.trim() || p.name;
                const spriteMotion: PetMotion = hasPet
                  ? stage.id === "egg"
                    ? "egg"
                    : "idle"
                  : "egg";
                return (
                  <li
                    key={p.id}
                    className="pet-enter"
                    style={
                      {
                        "--enter-delay": `${Math.min(i, 24) * 40}ms`,
                      } as CSSProperties
                    }
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      aria-label={
                        hasPet
                          ? `${petName}, ${p.name}'s pet — level ${info.level} ${stage.label}`
                          : `${p.name} — choose a pet`
                      }
                      className="pet-card flex h-full w-full flex-col items-center gap-1.5 rounded-md border border-paper-100 bg-surface p-3 shadow-paper outline-none focus-visible:shadow-ring"
                    >
                      <span className="relative">
                        <PetSprite
                          species={p.pet?.species}
                          stageId={stage.id}
                          px={72}
                          motion={spriteMotion}
                          floatDelay={(i % 7) * 0.35}
                          floatDur={2.8 + (i % 5) * 0.25}
                        />
                        {hasPet && (
                          <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-500 px-1 text-xs font-extrabold tabular-nums text-surface">
                            {info.level}
                          </span>
                        )}
                      </span>
                      <span className="line-clamp-1 text-center text-sm font-bold text-paper-800">
                        {petName}
                      </span>
                      {hasPet ? (
                        <>
                          {p.pet?.name?.trim() && (
                            <span className="-mt-1 line-clamp-1 text-xs text-paper-500">
                              {p.name}
                            </span>
                          )}
                          <span className="text-2xs font-semibold uppercase tracking-wider text-paper-500">
                            {stage.label} · Lv {info.level}
                          </span>
                          <div className="w-full px-0.5">
                            <ExpBar progress={info.progress} />
                          </div>
                          <span className="text-xs tabular-nums text-paper-500">
                            {info.intoLevel}/{info.needForNext} EXP
                          </span>
                        </>
                      ) : (
                        <span className="mt-auto rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700">
                          Choose a pet
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </SectionCard>

      {ranked.length > 0 && (
        <SectionCard
          title="Pet leaderboard"
          action={
            <span className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-paper-400">
              <Trophy className="h-3.5 w-3.5" aria-hidden />
              by EXP
            </span>
          }
        >
          {/* Podium: 2nd, 1st, 3rd from sm up, so the winner stands in the
              middle; in rank order on a phone, where the three stack. */}
          <ol className="grid gap-3 sm:grid-cols-3 sm:items-end">
            {podium.map(({ pupil, exp }, i) => {
              const info = levelFromExp(exp);
              const stage = stageForLevel(info.level);
              const first = i === 0;
              return (
                <li
                  key={pupil.id}
                  className={`${i === 0 ? "sm:order-2" : i === 1 ? "sm:order-1" : "sm:order-3"}`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(pupil.id)}
                    className={`flex w-full flex-col items-center gap-1 rounded-md border bg-surface px-3 text-center outline-none transition-shadow hover:shadow-float focus-visible:shadow-ring ${
                      first
                        ? "border-brand-300 py-4 shadow-float"
                        : "border-paper-100 py-3 shadow-paper"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full font-display text-sm font-bold tabular-nums ${
                        first ? "bg-brand-500 text-surface" : "bg-paper-100 text-paper-600"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <PetSprite
                      species={pupil.pet?.species}
                      stageId={stage.id}
                      px={first ? 88 : 64}
                      motion="idle"
                      floatDelay={i * 0.4}
                    />
                    <span className="line-clamp-1 font-display text-base font-bold text-paper-800">
                      {pupil.pet?.name?.trim() || pupil.name}
                    </span>
                    <span className="line-clamp-1 text-xs text-paper-500">
                      {pupil.name} · {speciesById(pupil.pet!.species).label}
                    </span>
                    <span className="flex items-center gap-1 text-sm font-bold tabular-nums text-brand-600">
                      <Star className="h-3.5 w-3.5" aria-hidden />
                      Lv {info.level}
                      <span className="font-semibold text-paper-500">· {exp} EXP</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          {rest.length > 0 && (
            <ol start={4} className="mt-3 space-y-1.5">
              {rest.map(({ pupil, exp }, j) => {
                const i = j + 3;
                const info = levelFromExp(exp);
                const stage = stageForLevel(info.level);
                return (
                  <li key={pupil.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(pupil.id)}
                      className="flex w-full items-center gap-3 rounded-md border border-paper-100 px-3 py-2 text-left outline-none transition-colors hover:bg-paper-50 focus-visible:shadow-ring"
                    >
                      <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-paper-500">
                        {i + 1}
                      </span>
                      <PetSprite
                        species={pupil.pet?.species}
                        stageId={stage.id}
                        px={32}
                        motion="idle"
                        floatDelay={(i % 5) * 0.4}
                        floatDur={3 + (i % 3) * 0.3}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-paper-700">
                          {pupil.pet?.name?.trim() || pupil.name}
                        </span>
                        <span className="block truncate text-xs text-paper-500">
                          {pupil.name} · {speciesById(pupil.pet!.species).label} · {stage.label}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-sm font-bold tabular-nums text-brand-600">
                        <Star className="h-3.5 w-3.5" aria-hidden />
                        Lv {info.level}
                      </span>
                      <span className="w-16 shrink-0 text-right text-xs tabular-nums text-paper-500">
                        {exp} EXP
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}

          {ranked.length > BOARD_PREVIEW && (
            <div className="mt-3 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllBoard((v) => !v)}
                aria-expanded={showAllBoard}
              >
                {showAllBoard ? "Show top 10" : `Show all ${ranked.length}`}
              </Button>
            </div>
          )}
        </SectionCard>
      )}

      {selected && (
        <PetDetailModal
          key={selected.id}
          pupil={selected}
          exp={getPupilExp(selected.id)}
          recentPositives={behavior
            .filter((b) => b.pupilId === selected.id && b.type === "positive")
            .slice(0, 6)}
          onClose={() => setSelectedId(null)}
          onChooseSpecies={(species) => setPupilPet(selected.id, species)}
          onUnlockSpecies={(species) => unlockSpecies(selected.id, species)}
          onChooseScene={(sceneId) => setPupilPetScene(selected.id, sceneId)}
          balance={getPupilBalance(selected.id)}
          ownedPowers={getPupilPowers(selected.id)}
          onBuyPower={(powerId, cost) =>
            buyPetPower(selected.id, powerId, cost)
          }
          onRename={(name) => setPupilPetName(selected.id, name)}
          onReset={() => clearPupilPet(selected.id)}
        />
      )}

      {pkOpen && (
        <PetBattleModal
          pupils={pupils}
          expFor={getPupilExp}
          powersFor={getPupilPowers}
          onClose={() => setPkOpen(false)}
          onMutedChange={setMuted}
          onWatchDemo={() => {
            setPkOpen(false);
            setDemoOpen(true);
          }}
        />
      )}

      {demoOpen && (
        <PetFightCinematic
          onClose={() => setDemoOpen(false)}
          soundEnabled={!muted}
          onMutedChange={setMuted}
        />
      )}

      {hatching && (
        <HatchCeremony
          key={`${hatching.id}-${petStageNow(hatching)?.id}`}
          pupil={hatching}
          fromStageId={hatching.pet!.seenStage!}
          toStage={petStageNow(hatching)!}
          remaining={pendingHatch.length - 1}
          onDone={() =>
            markPetStageSeen(hatching.id, petStageNow(hatching)!.id)
          }
        />
      )}
    </div>
  );
}

/**
 * Full-screen "your pet hatched!" moment — the payoff for earning points, meant
 * to be seen by the whole class on the projector. Shows the old stage giving way
 * to the new one, fires the shared confetti/fanfare, and plays the pet's own
 * cry. Dismissing it records the stage so it only ever fires once per hatch.
 *
 * Only the button (or Escape) dismisses it: a stray click on the backdrop used
 * to end the moment before the class had seen it.
 */
function HatchCeremony({
  pupil,
  fromStageId,
  toStage,
  remaining,
  onDone,
}: {
  pupil: Pupil;
  fromStageId: string;
  toStage: PetStage;
  remaining: number;
  onDone: () => void;
}) {
  const celebrate = useCelebrate();
  const species = pupil.pet!.species;
  const petName = pupil.pet?.name?.trim() || `${pupil.name}'s pet`;
  const isHatch = fromStageId === "egg";

  useEffect(() => {
    celebrate({ intensity: "big" });
    // Let the fanfare land first, then the animal's own cry.
    const t = window.setTimeout(() => {
      speakPetLine(pickPetLine("roar", species, toStage.id));
    }, 550);
    return () => {
      window.clearTimeout(t);
      stopPetSpeak();
    };
    // Fire once per ceremony — the key on the element remounts it for the next.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Overlay
      label={`${petName} evolved to ${toStage.label}`}
      onEscape={onDone}
      // Under the confetti layer (z-55/60), so the celebration falls in front.
      className="z-50 bg-paper-900/60 p-4 backdrop-blur-sm"
    >
      <div className="card pet-hatch-card flex w-full max-w-md flex-col items-center gap-4 p-8 text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-600">
          {isHatch ? "It hatched!" : "It evolved!"}
        </p>

        <div
          className="pet-scene flex w-full items-end justify-center gap-3 px-3"
          style={{ backgroundImage: `url("${sceneSrc(pupil.pet?.scene)}")` }}
        >
          <span className="pet-hatch-before opacity-40">
            <PetSprite species={species} stageId={fromStageId} px={64} motion="none" priority />
          </span>
          <Sparkles className="h-5 w-5 shrink-0 self-center text-warning" aria-hidden />
          <span className="pet-hatch-after">
            <PetSprite species={species} stageId={toStage.id} px={150} motion="none" priority />
          </span>
        </div>

        <div>
          <h3 className="font-display text-2xl font-bold text-paper-800">
            {petName}
          </h3>
          <p className="text-base text-paper-600">
            is now a{" "}
            <span className="font-bold text-brand-700">
              {toStage.label} {speciesById(species).label}
            </span>
          </p>
          <p className="mt-1 text-xs text-paper-500">
            Earned by {pupil.name}&apos;s positive points
          </p>
        </div>

        <Button onClick={onDone} autoFocus>
          {remaining > 0 ? `Next pet (${remaining} more)` : "Hooray!"}
        </Button>
      </div>
    </Overlay>
  );
}

/** The care buttons, in the order they sit on the Play tab. Sleep/Wake is one slot. */
const CARE_BUTTONS: ReadonlyArray<{
  action: CareAction;
  label: string;
  Icon: typeof Hand;
}> = [
  { action: "pat", label: "Pat", Icon: Hand },
  { action: "cheer", label: "Cheer", Icon: Heart },
  { action: "peek", label: "Peek", Icon: Eye },
  { action: "feed", label: "Feed", Icon: Cookie },
  { action: "roar", label: "Roar", Icon: Megaphone },
  { action: "sleep", label: "Sleep", Icon: Moon },
  { action: "dance", label: "Dance", Icon: Music },
];

type DetailTab = "play" | "shop" | "settings";

/** "2026-09-20" → "20 Sep", read at noon so no timezone slips it a day. */
function shortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function PetDetailModal({
  pupil,
  exp,
  recentPositives,
  onClose,
  onChooseSpecies,
  onChooseScene,
  onUnlockSpecies,
  balance,
  ownedPowers,
  onBuyPower,
  onRename,
  onReset,
}: {
  pupil: Pupil;
  exp: number;
  recentPositives: { id: string; points: number; note: string; date: string }[];
  onClose: () => void;
  onChooseSpecies: (species: string) => void;
  onChooseScene: (sceneId: string) => void;
  /** Called when this pupil passes a locked species' quiz. */
  onUnlockSpecies: (species: string) => void;
  /** Marks this pupil still has to spend. */
  balance: number;
  ownedPowers: string[];
  onBuyPower: (powerId: string, cost: number) => boolean;
  onRename: (name: string) => void;
  onReset: () => void;
}) {
  const confirm = useConfirm();
  const celebrate = useCelebrate();
  const info = levelFromExp(exp);
  const stage = stageForLevel(info.level);
  const species = pupil.pet?.species;
  const hasPet = !!species;
  const mood = petMood(stage.id, recentPositives);
  const petName = pupil.pet?.name?.trim() || `${pupil.name}'s pet`;
  // The species' own attack, under its own name — "Dragon Flame", not the
  // "Fire Breath" it borrows its look from. Same pairing PK fights with.
  const signatureMove = (() => {
    const sig = species ? SPECIES_SIGNATURE[species] : undefined;
    const power = sig ? powerById(sig.powerId) : undefined;
    return sig && power ? { power, label: sig.label, emoji: sig.emoji } : null;
  })();

  // Play first: that is what the modal is opened for in front of a class. The
  // admin (rename, change species, reset) sits a tab away so a stray tap in the
  // middle of a lesson cannot reach it.
  const [tab, setTab] = useState<DetailTab>("play");
  const [reaction, setReaction] = useState<string | null>(null);
  // Sleep is the one care action that leaves the pet in a lasting state, so the
  // teacher can settle the class and wake it again later. Deliberately local:
  // it's a moment in the lesson, not something worth syncing to the cloud.
  const [asleep, setAsleep] = useState(false);
  const [fx, setFx] = useState<PetFx[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  // Small caption over the bubble — the power's name when one fires. Pet lines
  // carry none: the TTS voice name meant nothing to the children reading it.
  const [hintTag, setHintTag] = useState<string | null>(null);
  // The locked species whose quiz is open, if any.
  const [quizFor, setQuizFor] = useState<PetSpecies | null>(null);
  const unlocked = pupil.unlockedSpecies ?? [];
  const fxId = useRef(0);
  const clearReact = useRef<number | null>(null);
  const clearHint = useRef<number | null>(null);
  // How many taps in the current streak, and the timer that ends it.
  const tapStreak = useRef(0);
  const tapReset = useRef<number | null>(null);
  const clearFlash = useRef<number | null>(null);
  // Always read the latest species/stage at tap time — avoids a stale handler
  // still playing the previous pet's clips after "Change pet".
  const speciesRef = useRef(species);
  const stageIdRef = useRef(stage.id);
  useEffect(() => {
    speciesRef.current = species;
    stageIdRef.current = stage.id;
  }, [species, stage.id]);

  useEffect(() => {
    // The pet's surroundings are audible the whole time it's open, not only in
    // the moment the scene is switched. Opening the modal is a user gesture, so
    // autoplay is permitted; it loops until the modal closes.
    if (pupil.pet?.species) {
      playSceneAmbience(sceneAmbientSrc(pupil.pet.scene));
    }
    return () => {
      if (clearReact.current) window.clearTimeout(clearReact.current);
      if (clearHint.current) window.clearTimeout(clearHint.current);
      if (tapReset.current) window.clearTimeout(tapReset.current);
      if (clearFlash.current) window.clearTimeout(clearFlash.current);
      stopPetSpeak();
      stopSceneAmbience();
    };
    // Runs once per opened pet — the modal is remounted (keyed) for each pupil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showHint = (text: string, tag: string | null) => {
    setHint(text);
    setHintTag(tag);
    if (clearHint.current) window.clearTimeout(clearHint.current);
    clearHint.current = window.setTimeout(() => {
      setHint(null);
      setHintTag(null);
    }, 4200);
  };

  // Fire a bought superpower: its own sound effect, glyphs and animation. No
  // spoken line — a flame whoosh is the same whichever animal makes it, so the
  // clips are shared across species and the shout is shown as text.
  const playPower = (power: PetPower, label = power.label) => {
    setAsleep(false);
    const nextFx: PetFx[] = buildPowerFx(power, () => (fxId.current += 1));
    setFx(nextFx);
    setFlash(power.tint);
    if (clearFlash.current) window.clearTimeout(clearFlash.current);
    clearFlash.current = window.setTimeout(() => setFlash(null), 700);
    setReaction(`power-${power.id}`);
    showHint(power.shout, label);
    playPetPowerSound(powerSoundSrc(power.id));

    if (clearReact.current) window.clearTimeout(clearReact.current);
    clearReact.current = window.setTimeout(() => {
      setReaction(null);
      setFx([]);
    }, POWER_REACTION_MS);
  };

  const playCare = (action: CareAction) => {
    // Sleep settles the pet; anything else — Wake included — rouses it.
    setAsleep(action === "sleep");
    // Skip the shared SFX blips — they sound identical on every pet and drown
    // out the species voice clips.
    const line = pickPetLine(action, speciesRef.current, stageIdRef.current);
    const glyphs = CARE_GLYPHS[action];
    const nextFx: PetFx[] = [0, 1, 2].map((i) => {
      fxId.current += 1;
      return {
        id: fxId.current,
        glyph: glyphs[i % glyphs.length],
        drift: (i - 1) * 28 + (Math.random() * 10 - 5),
      };
    });
    setFx(nextFx);
    setReaction(action);
    showHint(line.display, null);
    speakPetLine(line);

    if (clearReact.current) window.clearTimeout(clearReact.current);
    clearReact.current = window.setTimeout(() => {
      setReaction(null);
      setFx([]);
    }, 900);
  };

  // Moving the pet to a new backdrop: it says something about where it now is.
  const playScene = (sceneId: string) => {
    // Ambience first so the pet's line lands on top of it, not after.
    playSceneAmbience(sceneAmbientSrc(sceneId));
    const line = pickSceneLine(sceneId, speciesRef.current);
    if (!line) return; // no species chosen yet — the ambience still plays
    showHint(line.display, null);
    speakPetLine(line);
  };

  // Tapping the pet itself: pat → tickle → dizzy the more you keep going.
  const handleTap = () => {
    if (tapReset.current) window.clearTimeout(tapReset.current);
    tapReset.current = window.setTimeout(() => {
      tapStreak.current = 0;
    }, TAP_RESET_MS);
    tapStreak.current += 1;
    const n = tapStreak.current;
    playCare(n >= TAP_DIZZY_AT ? "dizzy" : n >= TAP_TICKLE_AT ? "tickle" : "pat");
  };

  // Spending marks used to happen in silence — the balance just dropped. Now the
  // power fires on the spot, so the class sees what was bought.
  const handleBuy = (power: PetPower) => {
    if (!onBuyPower(power.id, power.cost)) return;
    celebrate();
    playPower(power);
  };

  // Changing species is as permanent as a reset — the old pet is gone — so it
  // asks the same way a reset does.
  const handleChangeSpecies = async (next: string) => {
    if (next === species) return;
    const ok = await confirm({
      title: "Change pet?",
      message: `Swap ${petName} for a ${speciesById(next).label}? Level and EXP stay the same.`,
      confirmLabel: "Change pet",
      tone: "brand",
    });
    if (!ok) return;
    stopPetSpeak();
    setHint(null);
    setHintTag(null);
    onChooseSpecies(next);
  };

  const handleReset = async () => {
    const ok = await confirm({
      title: "Reset pet?",
      message: `Clear ${pupil.name}'s pet so you can choose again? Level and EXP stay the same — only the species and name are removed.`,
      confirmLabel: "Reset",
    });
    if (ok) onReset();
  };

  const openLocked = (s: PetSpecies) => {
    stopPetSpeak();
    setQuizFor(s);
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={hasPet ? petName : `${pupil.name} — choose a pet`}
      titleIcon={<PawPrint className="h-5 w-5 text-brand-500" />}
      maxWidthClass="max-w-xl"
    >
      {hasPet ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3">
            {/* The pet stands in its chosen scene. The backdrop is decorative,
                so it stays out of the accessibility tree. */}
            <div
              className="pet-scene flex w-full max-w-sm items-end justify-center"
              style={{ backgroundImage: `url("${sceneSrc(pupil.pet?.scene)}")` }}
            >
              <InteractivePet
                species={species}
                stageId={stage.id}
                px={160}
                motion={
                  reaction || asleep
                    ? "none"
                    : stage.id === "egg"
                      ? "egg"
                      : "hero"
                }
                reaction={reaction}
                asleep={asleep}
                flash={flash}
                fx={fx}
                onTap={handleTap}
                label={`Pat ${petName}`}
              />
            </div>
            {hint ? (
              <div
                key={hint}
                className="pet-speech-bubble w-full max-w-sm"
                role="status"
                aria-live="polite"
              >
                {hintTag ? (
                  <p className="mb-1 text-2xs font-bold uppercase tracking-wider text-brand-700">
                    {hintTag}
                  </p>
                ) : null}
                <p className="text-base font-bold leading-snug text-paper-800">
                  “{hint}”
                </p>
              </div>
            ) : (
              <p className="text-2xs font-semibold uppercase tracking-wider text-paper-500">
                Tap the pet — they talk back
              </p>
            )}

            <div className="text-center">
              <p className="font-display text-xl font-bold text-paper-800">
                {speciesById(species!).label}
                <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 align-middle font-sans text-2xs font-bold uppercase tracking-wider text-brand-700">
                  {stage.label}
                </span>
                <span
                  className={`ml-1.5 rounded-full px-2 py-0.5 align-middle font-sans text-2xs font-bold uppercase tracking-wider ${mood.tone}`}
                >
                  {mood.label}
                </span>
              </p>
              <p className="text-sm text-paper-500">
                {speciesById(species!).blurb}
              </p>
            </div>

            <div className="w-full max-w-sm space-y-1">
              <div className="flex items-center justify-between text-sm font-semibold text-paper-600">
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-brand-500" /> Level {info.level}
                </span>
                <span className="tabular-nums text-paper-500">
                  {info.intoLevel}/{info.needForNext} EXP to Lv {info.level + 1}
                </span>
              </div>
              <ExpBar progress={info.progress} />
            </div>
          </div>

          <div className="flex justify-center">
            <SegmentedControl<DetailTab>
              ariaLabel="Pet sections"
              value={tab}
              onChange={setTab}
              options={[
                { id: "play", label: "Play", icon: <Sparkles className="h-3.5 w-3.5" /> },
                {
                  id: "shop",
                  label: `Shop · ${balance}`,
                  icon: <Star className="h-3.5 w-3.5" />,
                },
                { id: "settings", label: "Settings", icon: <Settings className="h-3.5 w-3.5" /> },
              ]}
            />
          </div>

          {tab === "play" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {CARE_BUTTONS.map(({ action, label, Icon }) => {
                    // Sleep's slot turns into Wake while the pet is asleep.
                    const waking = action === "sleep" && asleep;
                    const SlotIcon = waking ? Sun : Icon;
                    return (
                      <button
                        key={action}
                        type="button"
                        onClick={() => playCare(waking ? "wake" : action)}
                        className="pet-care-btn flex min-h-[3.5rem] flex-col items-center justify-center gap-1 rounded-md border border-paper-100 bg-surface px-2 py-2.5 text-paper-700 shadow-paper outline-none hover:border-brand-300 hover:bg-brand-50 focus-visible:shadow-ring"
                      >
                        <SlotIcon className="h-5 w-5 text-brand-600" aria-hidden />
                        <span className="text-xs font-bold">
                          {waking ? "Wake" : label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-center text-xs text-paper-500">{mood.tip}</p>
              </div>

              {(signatureMove || ownedPowers.length > 0) && (
                <div className="space-y-2 border-t border-paper-100 pt-3">
                  <p className="text-2xs font-bold uppercase tracking-wider text-paper-400">
                    Superpowers
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {/* The pet's own move comes first and is never bought — it
                        used to exist only inside a duel, so a pupil could own a
                        pet for weeks without ever hearing what it does. */}
                    {signatureMove && (
                      <button
                        type="button"
                        onClick={() =>
                          playPower(signatureMove.power, signatureMove.label)
                        }
                        title={`${signatureMove.label} — ${speciesById(species!).label}'s own move`}
                        className="pet-care-btn flex flex-col items-center gap-1 rounded-md border-2 border-warning bg-warning-bg px-2 py-2.5 text-paper-700 outline-none hover:brightness-95 focus-visible:shadow-ring"
                      >
                        <span aria-hidden className="text-xl leading-none">
                          {signatureMove.emoji}
                        </span>
                        <span className="text-xs font-bold leading-tight">
                          {signatureMove.label}
                        </span>
                        <span className="text-2xs font-bold uppercase tracking-wide text-warning-ink">
                          Own move
                        </span>
                      </button>
                    )}
                    {ownedPowers.map((id) => {
                      const power = powerById(id);
                      if (!power) return null;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => playPower(power)}
                          title={power.blurb}
                          className="pet-care-btn flex flex-col items-center gap-1 rounded-md border border-brand-200 bg-brand-50 px-2 py-2.5 text-paper-700 outline-none hover:border-brand-400 focus-visible:shadow-ring"
                        >
                          <span aria-hidden className="text-xl leading-none">
                            {power.emoji}
                          </span>
                          <span className="text-xs font-bold leading-tight">
                            {power.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "shop" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-2xs font-bold uppercase tracking-wider text-paper-400">
                  Superpower shop
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-extrabold tabular-nums text-brand-700">
                  <Star className="h-3.5 w-3.5" aria-hidden />
                  {balance} marks to spend
                </span>
              </div>
              <PowerShop balance={balance} owned={ownedPowers} onBuy={handleBuy} />
              <p className="text-xs text-paper-500">
                Spending marks never changes {pupil.name}&apos;s level — the pet
                keeps everything it has grown. Bought powers live on the Play tab.
              </p>
            </div>
          )}

          {tab === "settings" && (
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-2xs font-bold uppercase tracking-wider text-paper-400">
                  Scene
                </p>
                <ScenePicker
                  current={pupil.pet?.scene}
                  onPick={(id) => {
                    stopPetSpeak();
                    onChooseScene(id);
                    playScene(id);
                  }}
                />
              </div>

              <PetNameField
                initial={pupil.pet?.name ?? ""}
                placeholder={`${pupil.name}'s pet`}
                onCommit={onRename}
              />

              <div>
                <p className="mb-2 text-2xs font-bold uppercase tracking-wider text-paper-400">
                  Change pet
                </p>
                <SpeciesPicker
                  current={species}
                  onPick={handleChangeSpecies}
                  onOpenLocked={openLocked}
                  unlocked={unlocked}
                  stageId={stage.id}
                />
              </div>

              <div>
                <p className="mb-2 text-2xs font-bold uppercase tracking-wider text-paper-400">
                  Recent growth
                </p>
                {recentPositives.length === 0 ? (
                  <p className="text-sm text-paper-500">
                    No positive points yet. Award some in the Students tab to
                    help this pet grow.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {recentPositives.map((b) => (
                      <li
                        key={b.id}
                        className="flex items-center gap-2 rounded-md border border-paper-100 px-3 py-2 text-sm"
                      >
                        <span className="font-bold tabular-nums text-success-ink">
                          +{Math.abs(b.points)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-paper-600">
                          {b.note || "Positive behaviour"}
                        </span>
                        <span className="shrink-0 text-xs text-paper-500">
                          {shortDate(b.date)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="border-t border-paper-100 pt-4">
                <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset pet
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-paper-500">
            Pick a pet for{" "}
            <span className="font-semibold text-paper-700">{pupil.name}</span>.
            It hatches from an egg and grows as they earn positive points.
          </p>
          <SpeciesPicker
            onPick={onChooseSpecies}
            onOpenLocked={openLocked}
            unlocked={unlocked}
            stageId="baby"
          />
        </div>
      )}

      {quizFor && (
        <SpeciesUnlockModal
          species={quizFor}
          pupilName={pupil.name}
          onUnlock={() => onUnlockSpecies(quizFor.id)}
          onClose={() => setQuizFor(null)}
        />
      )}
    </Modal>
  );
}

/**
 * The pet's name, saved on Enter, on blur, and when the field goes away.
 *
 * Saving on blur alone lost the name whenever the modal was closed with Escape:
 * the input unmounts without ever blurring, so whatever was typed vanished.
 */
function PetNameField({
  initial,
  placeholder,
  onCommit,
}: {
  initial: string;
  placeholder: string;
  onCommit: (name: string) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(initial);
  const saved = useRef(initial);
  const latest = useRef({ draft, onCommit });
  useEffect(() => {
    latest.current = { draft, onCommit };
  }, [draft, onCommit]);

  const commit = (value: string) => {
    if (value === saved.current) return;
    saved.current = value;
    onCommit(value);
  };

  useEffect(
    () => () => {
      const { draft: d, onCommit: save } = latest.current;
      if (d !== saved.current) save(d);
    },
    []
  );

  return (
    <Field label="Pet name" htmlFor={id}>
      <input
        id={id}
        type="text"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
          }
        }}
        className={`w-full ${fieldClassName}`}
      />
    </Field>
  );
}

/**
 * Superpowers a pupil can buy with the marks they've earned. Owned ones are
 * marked here and played from the Play tab — listing them twice, with a second
 * "try it" button, was the same thing in two places.
 */
function PowerShop({
  balance,
  owned,
  onBuy,
}: {
  balance: number;
  owned: string[];
  onBuy: (power: PetPower) => void;
}) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {SHOP_POWERS.map((power) => {
        const isOwned = owned.includes(power.id);
        const canAfford = balance >= power.cost;
        const short = power.cost - balance;
        return (
          <li key={power.id}>
            <div
              className={`flex h-full flex-col items-center gap-1 rounded-md border p-2.5 text-center ${
                isOwned
                  ? "border-brand-300 bg-brand-50"
                  : "border-paper-100 bg-surface shadow-paper"
              }`}
            >
              <span aria-hidden className="text-2xl leading-none">
                {power.emoji}
              </span>
              <span className="text-sm font-bold text-paper-800">
                {power.label}
              </span>
              <span className="text-xs leading-snug text-paper-500">
                {power.blurb}
              </span>

              {isOwned ? (
                <span className="mt-auto inline-flex w-full items-center justify-center gap-1 rounded-md bg-surface px-2 py-1.5 text-xs font-bold text-brand-700">
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  Owned
                </span>
              ) : (
                <button
                  type="button"
                  disabled={!canAfford}
                  onClick={() => onBuy(power)}
                  title={
                    canAfford
                      ? `Buy for ${power.cost} marks`
                      : `${short} more mark${short === 1 ? "" : "s"} needed`
                  }
                  className={`mt-auto inline-flex w-full items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-bold tabular-nums outline-none transition-colors focus-visible:shadow-ring ${
                    canAfford
                      ? "bg-brand-500 text-surface hover:bg-brand-600"
                      : "cursor-not-allowed bg-paper-100 text-paper-500"
                  }`}
                >
                  {canAfford ? (
                    <>
                      Buy · <Star className="h-3 w-3" aria-hidden /> {power.cost}
                    </>
                  ) : (
                    `${short} more needed`
                  )}
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Backdrop chooser — swatches of each scene, matching the species picker. */
function ScenePicker({
  current,
  onPick,
}: {
  current?: string;
  onPick: (sceneId: string) => void;
}) {
  const active = PET_SCENES.some((s) => s.id === current) ? current : DEFAULT_SCENE;
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {PET_SCENES.map((s) => {
        const isActive = s.id === active;
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onPick(s.id)}
              aria-pressed={isActive}
              title={s.label}
              className={`flex w-full flex-col items-center gap-1 rounded-xl border p-1 outline-none transition-colors focus-visible:shadow-ring ${
                isActive
                  ? "border-brand-400 bg-brand-50"
                  : "border-paper-100 bg-surface hover:bg-paper-50"
              }`}
            >
              <span
                className="h-10 w-full rounded-lg bg-paper-100 bg-cover bg-center"
                style={{ backgroundImage: `url("${sceneSrc(s.id, true)}")` }}
                aria-hidden="true"
              />
              <span className="text-xs font-semibold text-paper-600">
                {s.label}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function SpeciesPicker({
  current,
  onPick,
  onOpenLocked,
  unlocked,
  stageId,
}: {
  current?: string;
  onPick: (species: string) => void;
  /** A locked species was tapped — open its quiz instead of choosing it. */
  onOpenLocked: (species: PetSpecies) => void;
  /** Locked species ids this pupil has already earned. */
  unlocked: string[];
  stageId: string;
}) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2">
      {PET_SPECIES.map((s, i) => {
        const active = s.id === current;
        // A locked species stays a sealed box until this pupil earns it — the
        // sprite is the reward, so showing it up front gives the surprise away.
        const sealed = Boolean(s.locked) && !unlocked.includes(s.id);
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => (sealed ? onOpenLocked(s) : onPick(s.id))}
              aria-pressed={active}
              title={sealed ? `${s.label} — locked. Answer to open.` : s.blurb}
              className={`pet-pick flex w-full flex-col items-center gap-1 rounded-xl border p-2 outline-none transition-colors focus-visible:shadow-ring ${
                sealed
                  ? "border-dashed border-brand-300 bg-brand-50/60 hover:bg-brand-50"
                  : active
                    ? "border-brand-400 bg-brand-50"
                    : "border-paper-100 bg-surface hover:bg-paper-50"
              }`}
            >
              {sealed ? (
                <span
                  className="relative flex h-11 w-11 items-center justify-center"
                  aria-hidden="true"
                >
                  <span className="text-3xl">📦</span>
                  <Lock className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-brand-500 p-0.5 text-surface" />
                </span>
              ) : (
                <PetSprite
                  species={s.id}
                  stageId={stageId}
                  px={44}
                  motion="idle"
                  floatDelay={(i % 4) * 0.3}
                  floatDur={2.6 + (i % 3) * 0.2}
                />
              )}
              <span className="text-xs font-semibold text-paper-600">
                {sealed ? "???" : s.label}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
