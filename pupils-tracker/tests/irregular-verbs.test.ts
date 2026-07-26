import { describe, expect, it } from "vitest";
import {
  UNLOCK_QUESTIONS,
  VERB_QUESTIONS,
  buildUnlockQuiz,
} from "@/lib/irregular-verbs";
import { PET_SPECIES } from "@/lib/pets";

describe("the irregular-verb bank", () => {
  it("has unique verbs", () => {
    const ids = VERB_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never offers the right answer twice in one question", () => {
    // A distractor equal to the answer would make two buttons both correct, and
    // only one of them would be accepted.
    for (const q of VERB_QUESTIONS) {
      expect(q.wrong, `${q.id} repeats its answer`).not.toContain(q.past);
      expect(new Set(q.wrong).size, `${q.id} has duplicate distractors`).toBe(3);
    }
  });

  it("leaves a gap for the verb in every sentence", () => {
    for (const q of VERB_QUESTIONS) {
      expect(q.sentence, `${q.id} has no ___`).toContain("___");
    }
  });

  it("has enough verbs to fill a run", () => {
    expect(VERB_QUESTIONS.length).toBeGreaterThanOrEqual(UNLOCK_QUESTIONS);
  });
});

describe("building one unlock run", () => {
  it("asks the requested number of questions", () => {
    expect(buildUnlockQuiz().length).toBe(UNLOCK_QUESTIONS);
    expect(buildUnlockQuiz(3).length).toBe(3);
  });

  it("never repeats a verb inside a run", () => {
    // 200 runs: a shuffle bug that repeats occasionally still shows up here.
    for (let i = 0; i < 200; i++) {
      const ids = buildUnlockQuiz().map((q) => q.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("gives four options with exactly one correct", () => {
    for (let i = 0; i < 200; i++) {
      for (const q of buildUnlockQuiz()) {
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.options.filter((o) => o === q.past)).toHaveLength(1);
      }
    }
  });

  it("does not always put the answer in the same place", () => {
    // The position is the shortcut a child finds long before the grammar.
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) {
      for (const q of buildUnlockQuiz()) {
        seen.add(q.options.indexOf(q.past));
      }
    }
    expect(seen).toEqual(new Set([0, 1, 2, 3]));
  });

  it("cannot ask for more verbs than exist", () => {
    expect(buildUnlockQuiz(999).length).toBe(VERB_QUESTIONS.length);
  });
});

describe("the locked pet", () => {
  it("keeps the robot behind the quiz", () => {
    const robot = PET_SPECIES.find((s) => s.id === "robot");
    expect(robot, "no robot species").toBeTruthy();
    expect(robot!.locked).toBe(true);
  });

  it("leaves every other species freely pickable", () => {
    // A species accidentally marked locked would silently vanish from the picker.
    const locked = PET_SPECIES.filter((s) => s.locked).map((s) => s.id);
    expect(locked).toEqual(["robot"]);
  });
});
