"use client";

import { Lock } from "lucide-react";
import {
  ELEMENTS,
  elementOf,
  advantage,
  type PetElement,
} from "@/lib/pet-elements";
import {
  certainDamage,
  selectableFrom,
  type MoveOption,
  type PkFighter,
} from "@/lib/pet-pk";
import { PetSprite } from "@/components/ui/PetSprite";

/**
 * One side's move buttons.
 *
 * Two rules are enforced here rather than in the engine, because both are about
 * what the child sees:
 *   • the move used last round is disabled, so a duel can't be three identical
 *     turns and the pick stays a decision every round — unless it is the pet's
 *     ONLY move, in which case disabling it would leave nothing to click and the
 *     duel could not go on (see selectableFrom);
 *   • a move that is strong against the pet being attacked is highlighted and
 *     labelled, so the element triangle is something a child can act on rather
 *     than something they have to have memorised;
 *   • a move that would take the last of the other pet's life says so, because
 *     the one real decision the duel asks for is WHICH round to spend the star
 *     on, and the computer was the only side able to answer it. It marks only
 *     what is CERTAIN — a critical is a roll, a guard is a guess the other pet
 *     has not made yet, and a promise that misses is worse than no promise at
 *     all. So a finish is only ever called on a super, which breaks through
 *     whatever they pick, or on a pet with no shields left to pick with.
 *
 * The sides take turns, so only the attacker's chooser is ever on screen — and
 * while the pet on the other end is picking its guard, nothing at all is, or the
 * guess would be made with the answer in front of them.
 */
export function MoveChooser({
  fighter,
  options,
  lastLabel,
  defenderName,
  defenderElement,
  defenderHp,
  defenderGuards,
  title,
  side,
  onChoose,
}: {
  fighter: PkFighter;
  options: MoveOption[];
  /** This side's previous move — disabled this round. */
  lastLabel: string | null;
  /** The pet being attacked, and its own type — what a move is strong against. */
  defenderName: string;
  defenderElement: PetElement | null;
  /** Life the defending pet has left, so a finishing blow can be called. */
  defenderHp: number;
  /** Shields it has left — while it holds any, nothing but a super is certain. */
  defenderGuards: number;
  title: string;
  side: "left" | "right";
  onChoose: (option: MoveOption) => void;
}) {
  // The engine's rule, not a second copy of it.
  const allowed = new Set(selectableFrom(options, lastLabel).map((o) => o.label));
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-card border-2 border-paper-200 bg-surface p-3">
      <div
        className={`flex items-center gap-2 ${side === "right" ? "flex-row-reverse text-right" : ""}`}
      >
        <PetSprite species={fighter.species} stageId={fighter.stageId} px={48} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-base font-extrabold text-paper-900 lg:text-lg">
            {fighter.name}
          </span>
          <span className="block truncate text-xs font-bold uppercase tracking-wider text-brand-700">
            {title}
          </span>
        </span>
      </div>

      {defenderElement && (
        <p className="text-sm font-semibold text-paper-500">
          <span className="text-paper-700">{defenderName}</span> is a{" "}
          <span aria-hidden="true">{ELEMENTS[defenderElement].emoji}</span>{" "}
          <span className="text-paper-700">{ELEMENTS[defenderElement].label}</span>{" "}
          pet
        </p>
      )}

      <ul className="grid grid-cols-[repeat(auto-fit,minmax(104px,1fr))] gap-2">
        {options.map((o) => {
          const el = elementOf(o.power?.id);
          const isSuper = o.kind === "super";
          const repeat = !allowed.has(o.label);
          const strong =
            el && defenderElement ? advantage(el, defenderElement) === 1 : false;
          // Only promised when the guard cannot take it away: a super breaks
          // through, and a pet with no shields has nothing to break through.
          const unstoppable = isSuper || defenderGuards <= 0;
          /**
           * What this blow takes off, from the engine rather than from a number
           * typed into this file. Every figure the chooser shows is this one —
           * 10 for a punch, 20 for a power, 30 when it is strong, 60 for the
           * star — so they cannot drift from MOVE_DAMAGE the way three hardcoded
           * copies of them quietly would.
           */
          const dmg = certainDamage(o, defenderElement);
          const finishes = !repeat && unstoppable && dmg >= defenderHp;

          return (
            <li key={o.label}>
              <button
                type="button"
                disabled={repeat}
                onClick={() => onChoose(o)}
                title={
                  repeat
                    ? o.kind === "melee"
                      ? // Every punch flavour is the same move, so a greyed-out
                        // Kick after a Punch needs to say why.
                        "You hit them with a plain attack last turn — pick a power"
                      : "Used last turn — pick something else"
                    : finishes
                      ? `${o.label} — this wins the duel`
                      : o.kind === "melee"
                        ? `${o.label} — ${dmg}% damage, and no element to be strong or weak`
                        : isSuper
                          ? `${o.label} — ${dmg}% damage. Once per duel, so choose when`
                          : strong
                            ? `${o.label} — ${dmg}%, strong against ${defenderName}`
                            : `${o.label} — ${dmg}% damage`
                }
                className={`relative flex w-full flex-col items-center gap-0.5 rounded-md border-2 px-2 py-2.5 outline-none transition-all focus-visible:shadow-ring disabled:cursor-not-allowed ${
                  repeat
                    ? "border-paper-100 bg-paper-50 opacity-40"
                    : finishes
                      ? "border-success bg-success-bg shadow-float hover:brightness-95"
                      : isSuper
                        ? "border-mark-amber bg-warning-bg shadow-float hover:brightness-95"
                        : strong
                          ? "border-brand-400 bg-brand-50 shadow-paper hover:bg-brand-100"
                          : "border-paper-200 bg-surface shadow-paper hover:bg-paper-50"
                }`}
              >
                <span className="text-2xl leading-none" aria-hidden="true">
                  {o.emoji}
                </span>
                <span className="line-clamp-2 text-sm font-extrabold leading-tight text-paper-800">
                  {o.label}
                </span>
                <span className="text-xs font-bold text-paper-500">
                  {finishes ? (
                    <span className="text-success-ink">finishes them!</span>
                  ) : isSuper ? (
                    <span className="text-warning-ink">{dmg}% · once</span>
                  ) : strong ? (
                    <span className="text-brand-600">{dmg}% · strong!</span>
                  ) : el ? (
                    <>
                      <span aria-hidden="true">{ELEMENTS[el].emoji}</span> {dmg}%
                    </>
                  ) : (
                    `${dmg}%`
                  )}
                </span>
                {repeat && (
                  <Lock
                    className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-paper-400"
                    aria-hidden="true"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
