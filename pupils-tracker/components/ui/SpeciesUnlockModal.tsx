"use client";

import { useState } from "react";
import { Check, Lock, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { PetSprite } from "@/components/ui/PetSprite";
import { playChime, playWomp } from "@/lib/sound";
import { buildUnlockQuiz, UNLOCK_QUESTIONS, type QuizItem } from "@/lib/irregular-verbs";
import type { PetSpecies } from "@/lib/pets";

/**
 * The gate in front of a locked pet: answer five irregular past-tense questions
 * and the pod opens.
 *
 * All five must be right. A wrong answer ends the run rather than deducting a
 * point, because the alternative — letting a child scrape through on 3/5 — makes
 * the pet a prize for guessing. Failing costs nothing but a retry, and the next
 * run draws different verbs, so a pupil who is genuinely stuck sees the same
 * gap from several angles instead of memorising one screen.
 *
 * Nothing here touches marks, balance or EXP: the pet is the whole reward.
 */
export function SpeciesUnlockModal({
  species,
  pupilName,
  onUnlock,
  onClose,
}: {
  species: PetSpecies;
  pupilName: string;
  /** Called once, when the last question is answered correctly. */
  onUnlock: () => void;
  onClose: () => void;
}) {
  // Held in state, not derived: the verbs must stay put while the pupil answers,
  // and change only when they ask for another go.
  const [quiz, setQuiz] = useState<QuizItem[]>(() => buildUnlockQuiz(UNLOCK_QUESTIONS));
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<"asking" | "won" | "lost">("asking");

  const question = quiz[at];

  const answer = (option: string) => {
    if (picked) return; // one shot per question; ignore double taps
    setPicked(option);
    const right = option === question.past;
    if (!right) {
      playWomp();
      window.setTimeout(() => setOutcome("lost"), 900);
      return;
    }
    playChime("ding");
    window.setTimeout(() => {
      if (at + 1 >= quiz.length) {
        setOutcome("won");
        playChime("fanfare");
        onUnlock();
      } else {
        setAt((i) => i + 1);
        setPicked(null);
      }
    }, 700);
  };

  const retry = () => {
    setQuiz(buildUnlockQuiz(UNLOCK_QUESTIONS));
    setAt(0);
    setPicked(null);
    setOutcome("asking");
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      maxWidthClass="max-w-xl"
      titleIcon={<Lock className="h-5 w-5 text-brand-500" />}
      title={`Unlock the ${species.label}`}
      footer={
        outcome === "asking" ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-2xs font-bold text-paper-400">
              {at + 1} of {quiz.length} · all must be right
            </p>
            <Button variant="secondary" onClick={onClose}>
              Not now
            </Button>
          </div>
        ) : outcome === "won" ? (
          <div className="flex justify-end">
            <Button onClick={onClose}>Choose the {species.label}</Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <Button variant="secondary" onClick={onClose}>
              Not now
            </Button>
            <Button onClick={retry}>Try again</Button>
          </div>
        )
      }
    >
      {outcome === "won" ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <PetSprite species={species.id} stageId="baby" px={128} motion="hero" priority />
          <p className="font-display text-2xl font-extrabold text-brand-700">
            Pod open!
          </p>
          <p className="text-sm font-semibold text-paper-600">
            {pupilName} answered all {quiz.length} — the {species.label} is
            unlocked for good.
          </p>
        </div>
      ) : outcome === "lost" ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="text-5xl" aria-hidden="true">
            🔒
          </span>
          <p className="font-display text-xl font-extrabold text-paper-800">
            The pod stayed shut
          </p>
          <p className="text-sm font-semibold text-paper-600">
            The answer was{" "}
            <strong className="text-brand-700">{question.past}</strong> —{" "}
            {question.sentence.replace("___", question.past)}
          </p>
          <p className="text-2xs font-bold text-paper-400">
            Try again with new questions. Nothing is lost.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Progress pips — how far in, and how much is left. */}
          <div className="flex justify-center gap-1.5" aria-hidden="true">
            {quiz.map((q, i) => (
              <span
                key={q.id}
                className={`h-1.5 w-8 rounded-full ${
                  i < at ? "bg-success" : i === at ? "bg-brand-500" : "bg-paper-200"
                }`}
              />
            ))}
          </div>

          <p className="text-center text-2xs font-extrabold uppercase tracking-[0.08em] text-paper-500">
            Put the verb in the past
          </p>

          <p className="text-center font-display text-2xl font-extrabold leading-snug text-paper-900">
            {question.sentence.split("___")[0]}
            <span className="mx-1 rounded-md bg-mark-amber px-3 py-0.5 text-mark-amber-ink">
              {question.base}
            </span>
            {question.sentence.split("___")[1]}
          </p>

          <ul className="grid gap-2 sm:grid-cols-2">
            {question.options.map((option) => {
              const chosen = picked === option;
              const isRight = option === question.past;
              // Only ever reveal the option they touched: showing the correct
              // one on a wrong answer teaches them to look for the highlight.
              const state = !picked
                ? "idle"
                : chosen && isRight
                  ? "right"
                  : chosen
                    ? "wrong"
                    : "idle";
              return (
                <li key={option}>
                  <button
                    type="button"
                    onClick={() => answer(option)}
                    disabled={Boolean(picked)}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg border-2 px-4 py-3.5 font-display text-xl font-extrabold outline-none transition-colors focus-visible:shadow-ring disabled:cursor-default ${
                      state === "right"
                        ? "border-success bg-success-bg text-success-ink"
                        : state === "wrong"
                          ? "border-danger bg-danger-bg text-danger-ink"
                          : "border-paper-200 bg-surface text-paper-800 hover:border-brand-400 hover:bg-brand-50"
                    }`}
                  >
                    {state === "right" && <Check className="h-5 w-5" />}
                    {state === "wrong" && <X className="h-5 w-5" />}
                    {option}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Modal>
  );
}
