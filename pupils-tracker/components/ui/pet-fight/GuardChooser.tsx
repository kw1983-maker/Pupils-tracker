"use client";

import { Shield } from "lucide-react";
import { type GuardChoice, type PkFighter } from "@/lib/pet-pk";
import { PetSprite } from "@/components/ui/PetSprite";

/**
 * The defending side's three buttons — the other half of a turn.
 *
 * It is on screen INSTEAD of the attacker's chooser and while the attack is
 * still hidden, which is the whole point: the guard is a guess, and a guess you
 * make after seeing the answer is not one. See GuardChoice in lib/pet-pk.ts for
 * why the duel needed this at all.
 *
 * Two rules are said in words rather than left to be discovered, because a child
 * gets about one bout to work them out:
 *   • a dodge slips anything thrown, and walks into a fist;
 *   • a super breaks through whatever you do, so shields are never wasted on it
 *     — they are simply not spent.
 */
const GUARDS: ReadonlyArray<{
  id: GuardChoice;
  label: string;
  emoji: string;
  blurb: string;
  hint: string;
}> = [
  {
    id: "block",
    label: "Block",
    emoji: "🛡️",
    blurb: "half damage",
    hint: "Block — takes half of whatever lands. Safe, and it never backfires.",
  },
  {
    id: "dodge",
    label: "Dodge",
    emoji: "💨",
    blurb: "all or nothing",
    hint: "Dodge — slips anything they throw for nothing at all, but a punch catches you wide open and hurts double.",
  },
  {
    id: "take",
    label: "Take it",
    emoji: "😤",
    blurb: "keep a shield",
    hint: "Take it on the chin — the blow lands in full, and you keep the shield for a blow that matters more.",
  },
];

export function GuardChooser({
  fighter,
  guardsLeft,
  guardsTotal,
  attackerName,
  title,
  side,
  onChoose,
}: {
  /** The pet about to be hit. */
  fighter: PkFighter;
  guardsLeft: number;
  /**
   * How many this pet started with — NOT a shared constant, because the pet that
   * goes second is given one more (see SECOND_STRIKE_SHIELD). Drawing three pips
   * for a pet holding four is how a child learns not to trust the pips.
   */
  guardsTotal: number;
  attackerName: string;
  title: string;
  side: "left" | "right";
  onChoose: (guard: GuardChoice) => void;
}) {
  const bare = guardsLeft <= 0;
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-card border-2 border-paper-200 bg-surface p-3">
      <div
        className={`flex items-center gap-2 ${side === "right" ? "flex-row-reverse text-right" : ""}`}
      >
        <PetSprite species={fighter.species} stageId={fighter.stageId} px={40} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm font-extrabold text-paper-900">
            {fighter.name}
          </span>
          <span className="block truncate text-2xs font-bold text-paper-400">
            {title}
          </span>
        </span>
        <span
          className="flex shrink-0 items-center gap-0.5"
          aria-label={`${guardsLeft} of ${guardsTotal} shields left`}
        >
          {Array.from({ length: guardsTotal }, (_, i) => (
            <Shield
              key={i}
              aria-hidden="true"
              className={`h-3.5 w-3.5 ${
                i < guardsLeft
                  ? "fill-brand-300 text-brand-500"
                  : "text-paper-200"
              }`}
            />
          ))}
        </span>
      </div>

      <p className="text-2xs font-bold text-paper-400">
        <span className="text-paper-600">{attackerName}</span> is attacking —{" "}
        {bare ? (
          <span className="text-warning-ink">no shields left, brace!</span>
        ) : (
          "you cannot see what is coming"
        )}
      </p>

      <ul className="grid grid-cols-[repeat(auto-fit,minmax(84px,1fr))] gap-1.5">
        {GUARDS.map((g) => {
          const costsShield = g.id !== "take";
          const locked = bare && costsShield;
          return (
            <li key={g.id}>
              <button
                type="button"
                disabled={locked}
                onClick={() => onChoose(g.id)}
                title={locked ? "No shields left" : g.hint}
                className={`relative flex w-full flex-col items-center gap-0.5 rounded-lg border-2 px-2 py-2 outline-none transition-all focus-visible:shadow-ring disabled:cursor-not-allowed ${
                  locked
                    ? "border-paper-100 bg-paper-50 opacity-40"
                    : g.id === "dodge"
                      ? "border-warning bg-warning-bg shadow-paper hover:brightness-95"
                      : g.id === "block"
                        ? "border-brand-400 bg-brand-50 shadow-paper hover:bg-brand-100"
                        : "border-paper-200 bg-surface shadow-paper hover:bg-paper-50"
                }`}
              >
                <span className="text-lg leading-none" aria-hidden="true">
                  {g.emoji}
                </span>
                <span className="line-clamp-1 text-2xs font-extrabold leading-tight text-paper-800">
                  {g.label}
                </span>
                <span className="text-2xs font-bold text-paper-400">
                  {g.blurb}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="text-2xs font-bold text-paper-400">
        🛡️ halves it · 💨 slips a power but a 👊 punch catches you · ⭐ always
        breaks through
      </p>
    </div>
  );
}
