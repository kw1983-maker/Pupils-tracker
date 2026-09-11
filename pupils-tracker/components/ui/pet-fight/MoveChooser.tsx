"use client";

import { Lock } from "lucide-react";
import {
  ELEMENTS,
  elementOf,
  advantage,
  type PetElement,
} from "@/lib/pet-elements";
import { selectableFrom, type MoveOption, type PkFighter } from "@/lib/pet-pk";
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
 *     than something they have to have memorised.
 *
 * The sides take turns, so only the attacker's chooser is ever on screen.
 */
export function MoveChooser({
  fighter,
  options,
  lastLabel,
  defenderName,
  defenderElement,
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
        <PetSprite species={fighter.species} stageId={fighter.stageId} px={40} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm font-extrabold text-paper-900">
            {fighter.name}
          </span>
          <span className="block truncate text-2xs font-bold text-paper-400">
            {title}
          </span>
        </span>
      </div>

      {defenderElement && (
        <p className="text-2xs font-bold text-paper-400">
          <span className="text-paper-600">{defenderName}</span> is a{" "}
          <span aria-hidden="true">{ELEMENTS[defenderElement].emoji}</span>{" "}
          <span className="text-paper-600">{ELEMENTS[defenderElement].label}</span>{" "}
          pet
        </p>
      )}

      <ul className="grid grid-cols-[repeat(auto-fit,minmax(84px,1fr))] gap-1.5">
        {options.map((o) => {
          const el = elementOf(o.power?.id);
          const isSuper = o.kind === "super";
          const repeat = !allowed.has(o.label);
          const strong =
            el && defenderElement ? advantage(el, defenderElement) === 1 : false;

          return (
            <li key={o.label}>
              <button
                type="button"
                disabled={repeat}
                onClick={() => onChoose(o)}
                title={
                  repeat
                    ? "Used last round — pick something else"
                    : o.kind === "melee"
                      ? `${o.label} — 10% damage, and no element to be strong or weak`
                      : isSuper
                        ? `${o.label} — 60% damage. Once per duel, so choose when`
                        : strong
                          ? `${o.label} — 30%, strong against ${defenderName}`
                          : `${o.label} — 20% damage`
                }
                className={`relative flex w-full flex-col items-center gap-0.5 rounded-lg border-2 px-2 py-2 outline-none transition-all focus-visible:shadow-ring disabled:cursor-not-allowed ${
                  repeat
                    ? "border-paper-100 bg-paper-50 opacity-40"
                    : isSuper
                      ? "border-mark-amber bg-warning-bg shadow-float hover:brightness-95"
                      : strong
                        ? "border-brand-400 bg-brand-50 shadow-paper hover:bg-brand-100"
                        : "border-paper-200 bg-surface shadow-paper hover:bg-paper-50"
                }`}
              >
                <span className="text-lg leading-none" aria-hidden="true">
                  {o.emoji}
                </span>
                <span className="line-clamp-1 text-2xs font-extrabold leading-tight text-paper-800">
                  {o.label}
                </span>
                <span className="text-2xs font-bold text-paper-400">
                  {o.kind === "melee" ? (
                    "10%"
                  ) : isSuper ? (
                    <span className="text-warning-ink">60% · once</span>
                  ) : strong ? (
                    <span className="text-brand-600">30% · strong!</span>
                  ) : el ? (
                    <>
                      <span aria-hidden="true">{ELEMENTS[el].emoji}</span> 20%
                    </>
                  ) : (
                    "20%"
                  )}
                </span>
                {repeat && (
                  <Lock
                    className="absolute right-1 top-1 h-3 w-3 text-paper-400"
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
