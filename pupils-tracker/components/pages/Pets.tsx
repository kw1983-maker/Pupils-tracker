"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Cookie,
  Eye,
  Hand,
  Heart,
  PawPrint,
  RotateCcw,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useTracker } from "@/lib/store";
import { Pupil } from "@/lib/types";
import {
  PET_SPECIES,
  levelFromExp,
  stageForLevel,
  speciesById,
  spriteFor,
  petEmoji,
} from "@/lib/pets";
import { pickPetLine, voiceNameFor, type CareAction } from "@/lib/pet-voice";
import { speakPetLine, stopPetSpeak } from "@/lib/pet-speak-client";
import { isSfxMuted, playPetCare, setSfxMuted } from "@/lib/sound";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { fieldClassName } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type PetMotion = "idle" | "egg" | "hero" | "none";

type PetFx = {
  id: number;
  glyph: string;
  drift: number;
};

const CARE_GLYPHS: Record<CareAction, string[]> = {
  pat: ["♡", "💖", "✨"],
  cheer: ["★", "✦", "🎉"],
  peek: ["👀", "✨", "?"],
  feed: ["🍎", "🍪", "🥕"],
};

function motionClass(kind: PetMotion): string {
  if (kind === "idle") return "pet-sprite-idle pet-sprite-motion";
  if (kind === "egg") return "pet-sprite-egg pet-sprite-motion";
  if (kind === "hero") return "pet-sprite-hero pet-sprite-motion";
  return "pet-sprite-motion";
}

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

// A pet's picture: the generated sprite when it exists (public/pets/<species>/
// <stage>.png), falling back to an emoji so the feature works before any art is
// generated. `species` may be undefined for a pupil who hasn't chosen a pet — an
// egg stands in for that too.
function PetSprite({
  species,
  stageId,
  px,
  className = "",
  motion = "none",
  floatDelay = 0,
  floatDur,
}: {
  species?: string;
  stageId: string;
  px: number;
  className?: string;
  motion?: PetMotion;
  /** Stagger idle loops so the grid doesn't bob in sync. */
  floatDelay?: number;
  floatDur?: number;
}) {
  const [broken, setBroken] = useState(false);
  const showEmoji = !species || broken;
  const wrapStyle = {
    "--float-delay": `${floatDelay}s`,
    ...(floatDur != null ? { "--float-dur": `${floatDur}s` } : {}),
  } as CSSProperties;

  const face = showEmoji ? (
    <span
      className="inline-flex items-center justify-center leading-none"
      style={{ fontSize: px * 0.82, width: px, height: px }}
      aria-hidden="true"
    >
      {species ? petEmoji(species, stageId) : "🥚"}
    </span>
  ) : (
    // Sprite is a fixed-size static public asset — next/image adds no value here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={spriteFor(species!, stageId)}
      onError={() => setBroken(true)}
      alt=""
      aria-hidden="true"
      width={px}
      height={px}
      className="object-contain"
      style={{ width: px, height: px }}
      draggable={false}
    />
  );

  return (
    <span
      className={`inline-flex ${motionClass(motion)} ${className}`}
      style={wrapStyle}
    >
      {face}
    </span>
  );
}

/** Tappable hero sprite — play care reactions without changing EXP. */
function InteractivePet({
  species,
  stageId,
  px,
  motion,
  reaction,
  fx,
  onTap,
  label,
}: {
  species?: string;
  stageId: string;
  px: number;
  motion: PetMotion;
  reaction: CareAction | null;
  fx: PetFx[];
  onTap: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={label}
      className={`pet-react-stage ${reaction ? `is-${reaction}` : ""}`}
    >
      <PetSprite species={species} stageId={stageId} px={px} motion={motion} />
      {fx.map((f) => (
        <span
          key={f.id}
          className="pet-fx"
          style={{ "--fx-drift": `${f.drift}px` } as CSSProperties}
          aria-hidden="true"
        >
          {f.glyph}
        </span>
      ))}
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

export function Pets() {
  const {
    pupils,
    behavior,
    getPupilExp,
    setPupilPet,
    setPupilPetName,
    clearPupilPet,
  } = useTracker();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);

  // Read mute after mount so SSR/hydration don't disagree, and stay in sync
  // with the Students-tab Sound toggle (shared localStorage key).
  useEffect(() => {
    setMuted(isSfxMuted());
  }, []);

  const selected = pupils.find((p) => p.id === selectedId) ?? null;

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setSfxMuted(next);
    // Audible confirm when turning sound back on.
    if (!next) playPetCare("pat");
  };

  // Class leaderboard: highest EXP first, name as tie-break.
  const ranked = [...pupils]
    .map((p) => ({ pupil: p, exp: getPupilExp(p.id) }))
    .sort((a, b) => b.exp - a.exp || a.pupil.name.localeCompare(b.pupil.name));

  const withPet = pupils.filter((p) => p.pet?.species).length;

  return (
    <div className="space-y-4">
      <SectionCard
        title="Class pets"
        action={
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={!muted}
              title={muted ? "Pet sounds off — click to enable" : "Pet sounds on"}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-2xs font-bold uppercase tracking-wider outline-none transition-colors focus-visible:shadow-ring ${
                muted
                  ? "bg-warning-bg text-warning-ink hover:brightness-95"
                  : "text-paper-400 hover:bg-paper-100 hover:text-paper-600"
              }`}
            >
              {muted ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 text-brand-500" />
              )}
              {muted ? "Sound off" : "Sound"}
            </button>
            <span className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-paper-400">
              <PawPrint className="h-3.5 w-3.5" />
              {withPet}/{pupils.length} hatched
            </span>
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
              <Sparkles className="h-4 w-4 text-brand-500" />
              Positive points grow pets. Open a pet to pat, cheer, peek, or
              feed — they talk back! Play never changes EXP.
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
                      aria-label={`${p.name}'s pet — level ${info.level} ${stage.label}`}
                      className="pet-card flex h-full w-full flex-col items-center gap-1.5 rounded-[14px] border border-paper-100 bg-surface p-3 outline-none focus-visible:shadow-ring"
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
                        <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-500 px-1 text-2xs font-extrabold tabular-nums text-surface">
                          {hasPet ? info.level : "?"}
                        </span>
                      </span>
                      <span className="line-clamp-1 text-center text-sm font-bold text-paper-800">
                        {hasPet ? petName : p.name}
                      </span>
                      {hasPet ? (
                        <>
                          <span className="text-2xs font-semibold uppercase tracking-wider text-paper-400">
                            {stage.label} · Lv {info.level}
                          </span>
                          <div className="w-full px-0.5">
                            <ExpBar progress={info.progress} />
                          </div>
                          <span className="text-2xs tabular-nums text-paper-400">
                            {info.intoLevel}/{info.needForNext} EXP
                          </span>
                        </>
                      ) : (
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-2xs font-bold text-brand-700">
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

      {pupils.length > 0 && (
        <SectionCard
          title="Pet leaderboard"
          action={
            <span className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-paper-400">
              <Trophy className="h-3.5 w-3.5" />
              by EXP
            </span>
          }
        >
          <ul className="thin-scroll max-h-[min(28rem,55vh)] space-y-1.5 overflow-auto pr-1">
            {ranked.map(({ pupil, exp }, i) => {
              const info = levelFromExp(exp);
              const stage = stageForLevel(info.level);
              const petName = pupil.pet?.name?.trim() || pupil.name;
              return (
                <li
                  key={pupil.id}
                  className="flex items-center gap-3 rounded-lg border border-paper-100 px-3 py-2"
                >
                  <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-paper-400">
                    {i + 1}
                  </span>
                  <PetSprite
                    species={pupil.pet?.species}
                    stageId={stage.id}
                    px={32}
                    motion={pupil.pet?.species ? "idle" : "egg"}
                    floatDelay={(i % 5) * 0.4}
                    floatDur={3 + (i % 3) * 0.3}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-paper-700">
                      {petName}
                    </span>
                    <span className="text-2xs text-paper-400">
                      {pupil.pet?.species
                        ? `${speciesById(pupil.pet.species).label} · ${stage.label}`
                        : "No pet yet"}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 text-sm font-bold tabular-nums text-brand-600">
                    <Star className="h-3.5 w-3.5" />
                    Lv {info.level}
                  </span>
                  <span className="w-14 shrink-0 text-right text-xs tabular-nums text-paper-400">
                    {exp} EXP
                  </span>
                </li>
              );
            })}
          </ul>
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
          onRename={(name) => setPupilPetName(selected.id, name)}
          onReset={() => clearPupilPet(selected.id)}
        />
      )}
    </div>
  );
}

function PetDetailModal({
  pupil,
  exp,
  recentPositives,
  onClose,
  onChooseSpecies,
  onRename,
  onReset,
}: {
  pupil: Pupil;
  exp: number;
  recentPositives: { id: string; points: number; note: string; date: string }[];
  onClose: () => void;
  onChooseSpecies: (species: string) => void;
  onRename: (name: string) => void;
  onReset: () => void;
}) {
  const confirm = useConfirm();
  const info = levelFromExp(exp);
  const stage = stageForLevel(info.level);
  const species = pupil.pet?.species;
  const hasPet = !!species;
  const mood = petMood(stage.id, recentPositives);
  const currentVoice = voiceNameFor(species, stage.id);

  const [reaction, setReaction] = useState<CareAction | null>(null);
  const [fx, setFx] = useState<PetFx[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [voiceName, setVoiceName] = useState<string | null>(null);
  const fxId = useRef(0);
  const clearReact = useRef<number | null>(null);
  const clearHint = useRef<number | null>(null);
  // Always read the latest species/stage at tap time — avoids a stale handler
  // still playing the previous pet's clips after "Change pet".
  const speciesRef = useRef(species);
  const stageIdRef = useRef(stage.id);
  speciesRef.current = species;
  stageIdRef.current = stage.id;

  useEffect(() => {
    return () => {
      if (clearReact.current) window.clearTimeout(clearReact.current);
      if (clearHint.current) window.clearTimeout(clearHint.current);
      stopPetSpeak();
    };
  }, []);

  const playCare = (action: CareAction) => {
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
    setHint(line.display);
    setVoiceName(line.voiceName);
    speakPetLine(line);

    if (clearReact.current) window.clearTimeout(clearReact.current);
    if (clearHint.current) window.clearTimeout(clearHint.current);
    clearReact.current = window.setTimeout(() => {
      setReaction(null);
      setFx([]);
    }, 900);
    clearHint.current = window.setTimeout(() => {
      setHint(null);
      setVoiceName(null);
    }, 4200);
  };

  const handleReset = async () => {
    const ok = await confirm({
      title: "Reset pet?",
      message: `Clear ${pupil.name}'s pet so you can choose again? Level and EXP stay the same — only the species and name are removed.`,
      confirmLabel: "Reset",
    });
    if (ok) onReset();
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={
        hasPet
          ? pupil.pet?.name?.trim() || `${pupil.name}'s pet`
          : `${pupil.name} — choose a pet`
      }
      titleIcon={<PawPrint className="h-5 w-5 text-brand-500" />}
      maxWidthClass="max-w-xl"
    >
      {hasPet ? (
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-3 rounded-card bg-surface p-5">
            <InteractivePet
              species={species}
              stageId={stage.id}
              px={160}
              motion={
                reaction ? "none" : stage.id === "egg" ? "egg" : "hero"
              }
              reaction={reaction}
              fx={fx}
              onTap={() => playCare("pat")}
              label={`Pat ${pupil.pet?.name?.trim() || `${pupil.name}'s pet`}`}
            />
            {hint ? (
              <div
                key={hint}
                className="pet-speech-bubble w-full max-w-sm"
                role="status"
                aria-live="polite"
              >
                <p className="text-sm font-bold leading-snug text-paper-800">
                  “{hint}”
                </p>
                {voiceName ? (
                  <p className="mt-1.5 text-2xs font-bold uppercase tracking-wider text-paper-400">
                    Voice · {voiceName}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-2xs font-semibold uppercase tracking-wider text-paper-400">
                Tap the pet — they talk back
              </p>
            )}
            <div className="text-center">
              <p className="font-display text-lg font-bold text-paper-800">
                {speciesById(species!).label}
                <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 align-middle text-2xs font-bold uppercase tracking-wider text-brand-700">
                  {stage.label}
                </span>
              </p>
              <p className="text-sm text-paper-500">
                {speciesById(species!).blurb}
              </p>
              <span
                className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider ${mood.tone}`}
                title={mood.tip}
              >
                Mood · {mood.label}
              </span>
            </div>

            <div className="w-full max-w-sm space-y-1">
              <div className="flex items-center justify-between text-sm font-semibold text-paper-600">
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-brand-500" /> Level {info.level}
                </span>
                <span className="tabular-nums text-paper-400">
                  {info.intoLevel}/{info.needForNext} EXP to Lv {info.level + 1}
                </span>
              </div>
              <ExpBar progress={info.progress} />
              <p className="flex items-center gap-1 text-2xs text-paper-400">
                <TrendingUp className="h-3.5 w-3.5" />
                {exp} total EXP from positive points
              </p>
            </div>

            <div className="w-full max-w-sm space-y-2">
              <p className="text-2xs font-bold uppercase tracking-wider text-paper-400">
                Play with pet
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={() => playCare("pat")}
                  className="pet-care-btn flex flex-col items-center gap-1 rounded-xl border border-paper-100 bg-surface px-2 py-2.5 text-paper-700 outline-none hover:border-brand-300 hover:bg-brand-50 focus-visible:shadow-ring"
                >
                  <Hand className="h-4 w-4 text-brand-500" />
                  <span className="text-2xs font-bold">Pat</span>
                </button>
                <button
                  type="button"
                  onClick={() => playCare("cheer")}
                  className="pet-care-btn flex flex-col items-center gap-1 rounded-xl border border-paper-100 bg-surface px-2 py-2.5 text-paper-700 outline-none hover:border-brand-300 hover:bg-brand-50 focus-visible:shadow-ring"
                >
                  <Heart className="h-4 w-4 text-danger" />
                  <span className="text-2xs font-bold">Cheer</span>
                </button>
                <button
                  type="button"
                  onClick={() => playCare("peek")}
                  className="pet-care-btn flex flex-col items-center gap-1 rounded-xl border border-paper-100 bg-surface px-2 py-2.5 text-paper-700 outline-none hover:border-brand-300 hover:bg-brand-50 focus-visible:shadow-ring"
                >
                  <Eye className="h-4 w-4 text-mark-purple-ink" />
                  <span className="text-2xs font-bold">Peek</span>
                </button>
                <button
                  type="button"
                  onClick={() => playCare("feed")}
                  className="pet-care-btn flex flex-col items-center gap-1 rounded-xl border border-paper-100 bg-surface px-2 py-2.5 text-paper-700 outline-none hover:border-brand-300 hover:bg-brand-50 focus-visible:shadow-ring"
                >
                  <Cookie className="h-4 w-4 text-warning-ink" />
                  <span className="text-2xs font-bold">Feed</span>
                </button>
              </div>
              <p className="text-center text-2xs text-paper-400">{mood.tip}</p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-2xs font-bold uppercase tracking-wider text-paper-400">
              Pet name
            </label>
            <input
              type="text"
              defaultValue={pupil.pet?.name ?? ""}
              placeholder={`${pupil.name}'s pet`}
              onBlur={(e) => onRename(e.target.value)}
              className={`w-full ${fieldClassName}`}
            />
          </div>

          <div>
            <p className="mb-2 text-2xs font-bold uppercase tracking-wider text-paper-400">
              Change pet
            </p>
            <p className="mb-2 text-center text-2xs font-semibold text-brand-700">
              Speaks as · {currentVoice}
            </p>
            <SpeciesPicker
              current={species}
              onPick={(id) => {
                stopPetSpeak();
                setHint(null);
                setVoiceName(null);
                onChooseSpecies(id);
              }}
              stageId={stage.id}
            />
          </div>

          <div>
            <p className="mb-2 text-2xs font-bold uppercase tracking-wider text-paper-400">
              Recent growth
            </p>
            {recentPositives.length === 0 ? (
              <p className="text-sm text-paper-500">
                No positive points yet. Award some in the Students tab to help
                this pet grow.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {recentPositives.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center gap-2 rounded-md border border-paper-100 px-3 py-2 text-sm"
                  >
                    <span className="font-bold tabular-nums text-success">
                      +{Math.abs(b.points)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-paper-600">
                      {b.note || "Positive behaviour"}
                    </span>
                    <span className="shrink-0 text-xs text-paper-400">
                      {b.date}
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
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-paper-500">
            Pick a pet for{" "}
            <span className="font-semibold text-paper-700">{pupil.name}</span>.
            It hatches from an egg and grows as they earn positive points.
          </p>
          <SpeciesPicker onPick={onChooseSpecies} stageId="baby" />
        </div>
      )}
    </Modal>
  );
}

function SpeciesPicker({
  current,
  onPick,
  stageId,
}: {
  current?: string;
  onPick: (species: string) => void;
  stageId: string;
}) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2">
      {PET_SPECIES.map((s, i) => {
        const active = s.id === current;
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onPick(s.id)}
              aria-pressed={active}
              title={s.blurb}
              className={`pet-pick flex w-full flex-col items-center gap-1 rounded-xl border p-2 outline-none transition-colors focus-visible:shadow-ring ${
                active
                  ? "border-brand-400 bg-brand-50"
                  : "border-paper-100 bg-surface hover:bg-paper-50"
              }`}
            >
              <PetSprite
                species={s.id}
                stageId={stageId}
                px={44}
                motion="idle"
                floatDelay={(i % 4) * 0.3}
                floatDur={2.6 + (i % 3) * 0.2}
              />
              <span className="text-2xs font-semibold text-paper-600">
                {s.label}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
