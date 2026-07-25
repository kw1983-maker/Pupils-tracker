"use client";

import { useEffect, useRef, useState } from "react";
import { Swords, Trophy, X } from "lucide-react";
import { Pupil } from "@/lib/types";
import { levelFromExp, stageForLevel, speciesById } from "@/lib/pets";
import { powerSoundSrc } from "@/lib/pet-powers";
import {
  runPk,
  toFighter,
  PK_ROUNDS,
  type PkFighter,
  type PkResult,
  type PkRound,
} from "@/lib/pet-pk";
import { playPetPowerSound, stopPetSpeak } from "@/lib/pet-speak-client";
import { PetSprite } from "@/components/ui/PetSprite";
import { Button } from "@/components/ui/Button";
import { useCelebrate } from "@/components/ui/Celebration";

/** How long each round sits on screen before the next is revealed. */
const ROUND_MS = 1900;

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
}: {
  /** Only pupils who have a pet can fight. */
  pupils: Pupil[];
  expFor: (pupilId: string) => number;
  powersFor: (pupilId: string) => string[];
  onClose: () => void;
}) {
  const celebrate = useCelebrate();
  const [picked, setPicked] = useState<string[]>([]);
  const [result, setResult] = useState<PkResult | null>(null);
  const [fighters, setFighters] = useState<[PkFighter, PkFighter] | null>(null);
  const [revealed, setRevealed] = useState(0);
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
    setRevealed(0);

    // Reveal one round at a time, sounding whichever move won it.
    res.rounds.forEach((round, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setRevealed(i + 1);
          const move = round.winner === "b" ? round.b : round.a;
          if (move.power) playPetPowerSound(powerSoundSrc(move.power.id));
        }, i * ROUND_MS)
      );
    });
    timers.current.push(
      window.setTimeout(() => {
        if (res.winner !== "draw") celebrate({ intensity: "big" });
      }, PK_ROUNDS * ROUND_MS)
    );
  };

  const reset = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    stopPetSpeak();
    setResult(null);
    setFighters(null);
    setRevealed(0);
    setPicked([]);
  };

  const done = result !== null && revealed >= PK_ROUNDS;

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
                Pick two pets, then press Fight — the duel plays itself while the
                class watches. Nothing is won or lost: marks, powers and levels
                all stay exactly as they are.
              </p>
              {eligible.length < 2 ? (
                <p className="rounded-lg bg-paper-100 p-4 text-sm text-paper-500">
                  At least two pupils need a pet before they can duel.
                </p>
              ) : (
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-2">
                  {eligible.map((p) => {
                    const slot = picked.indexOf(p.id);
                    const stage = stageForLevel(levelFromExp(expFor(p.id)).level);
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
                            {powersFor(p.id).length} ⚡
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
              revealed={revealed}
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

/** The arena: both pets, the rounds as they land, and the verdict. */
function BattleArena({
  a,
  b,
  result,
  revealed,
}: {
  a: PkFighter;
  b: PkFighter;
  result: PkResult;
  revealed: number;
}) {
  const done = revealed >= PK_ROUNDS;
  const latest = revealed > 0 ? result.rounds[revealed - 1] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-card bg-surface p-4">
        <BattleSide
          f={a}
          side="a"
          latest={latest}
          score={result.scoreA}
        />
        <span className="self-center font-display text-lg font-bold text-paper-300">
          vs
        </span>
        <BattleSide
          f={b}
          side="b"
          latest={latest}
          score={result.scoreB}
        />
      </div>

      <ol className="space-y-1.5">
        {result.rounds.slice(0, revealed).map((r) => (
          <li
            key={r.index}
            className="flex items-center gap-2 rounded-lg border border-paper-100 bg-surface px-3 py-2 text-2xs"
          >
            <span className="font-bold text-paper-400">R{r.index + 1}</span>
            <span
              className={`flex-1 truncate ${
                r.winner === "a" ? "font-bold text-paper-800" : "text-paper-500"
              }`}
            >
              {r.a.emoji} {r.a.label} · {r.a.total}
            </span>
            <span className="shrink-0 text-paper-300">|</span>
            <span
              className={`flex-1 truncate text-right ${
                r.winner === "b" ? "font-bold text-paper-800" : "text-paper-500"
              }`}
            >
              {r.b.total} · {r.b.label} {r.b.emoji}
            </span>
          </li>
        ))}
      </ol>

      {done && (
        <div className="rounded-card bg-brand-50 p-4 text-center">
          <p className="flex items-center justify-center gap-2 font-display text-lg font-bold text-brand-700">
            <Trophy className="h-5 w-5" />
            {result.winner === "draw"
              ? "A perfect draw!"
              : `${result.winner === "a" ? a.name : b.name} wins!`}
          </p>
          <p className="text-2xs text-paper-500">
            {result.scoreA}–{result.scoreB} · nothing was won or lost
          </p>
        </div>
      )}
    </div>
  );
}

/** One fighter's corner. Kept out of BattleArena's render so the sprite isn't
 *  remounted each round — that restarted the power animation mid-move. */
function BattleSide({
  f,
  side,
  latest,
  score,
}: {
  f: PkFighter;
  side: "a" | "b";
  latest: PkRound | null;
  score: number;
}) {
  const won = latest?.winner === side;
  const lost = !!latest && latest.winner !== "draw" && latest.winner !== side;
  const move = latest?.[side];
  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      <div
        className={`pet-react-stage ${
          won && move?.power ? `is-power-${move.power.id}` : ""
        }`}
        style={{ opacity: lost ? 0.55 : 1 }}
      >
        <PetSprite
          species={f.species}
          stageId={f.stageId}
          px={110}
          motion="hero"
          priority
        />
      </div>
      <p className="line-clamp-1 text-sm font-bold text-paper-800">{f.name}</p>
      <p className="text-2xs text-paper-400">
        {f.species ? speciesById(f.species).label : ""} · Lv {f.level}
      </p>
      <span className="mt-0.5 rounded-full bg-brand-50 px-2 py-0.5 text-2xs font-extrabold tabular-nums text-brand-700">
        {score} won
      </span>
    </div>
  );
}
