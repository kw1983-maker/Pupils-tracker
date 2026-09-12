import { describe, expect, it } from "vitest";
import { DAMAGE_BEATS, livesAt, type FightHud } from "@/lib/pet-fight/lives";
import {
  BEAT,
  SEGMENT,
  FIGHT_DURATION,
  XFORM_IN,
  XFORM_OUT,
} from "@/lib/pet-fight/storyboard";
import { PK_ROUNDS } from "@/lib/pet-pk";

const hud = (over: Partial<FightHud> = {}): FightHud => ({
  leftName: "Ash",
  rightName: "Blaze",
  roundWinners: [],
  maxHp: PK_ROUNDS,
  ...over,
});

describe("carrying pips between rounds", () => {
  // The round-by-round modes play one round per clip. Without priorLosses every
  // clip opens on full bars and the score resets in front of the class.
  it("opens the clip where the previous round left the bars", () => {
    const h = hud({ roundWinners: [], priorLosses: { a: 1, b: 2 } });
    expect(livesAt(SEGMENT.round.from, "a", h)).toBe(PK_ROUNDS - 1);
    expect(livesAt(SEGMENT.round.from, "b", h)).toBe(PK_ROUNDS - 2);
  });

  it("is the same as playing those rounds in one pass", () => {
    // Two rounds to the left pet, then a third being watched on its own.
    const whole = hud({ roundWinners: ["a", "a", "b"] });
    const segment = hud({ roundWinners: ["b"], priorLosses: { a: 0, b: 2 } });
    expect(livesAt(FIGHT_DURATION, "b", segment)).toBe(
      livesAt(FIGHT_DURATION, "b", whole)
    );
    expect(livesAt(FIGHT_DURATION, "a", segment)).toBe(
      livesAt(FIGHT_DURATION, "a", whole)
    );
  });

  it("defaults to nothing carried in, so watch mode is untouched", () => {
    const h = hud({ roundWinners: ["a", "b"] });
    expect(livesAt(0, "a", h)).toBe(PK_ROUNDS);
    expect(livesAt(0, "b", h)).toBe(PK_ROUNDS);
  });

  it("never reads below empty, however many rounds were carried in", () => {
    const h = hud({ roundWinners: ["a"], priorLosses: { a: 0, b: 9 } });
    expect(livesAt(FIGHT_DURATION, "b", h)).toBe(0);
  });
});

describe("a single round drains the right bar", () => {
  // Regression risk: the choreography's direction is fixed, so a loss dealt onto
  // the wrong beat shows a pet hurting itself as its own attack connects.
  it("takes the pip from the side that is shown being hit", () => {
    const leftWins = hud({ roundWinners: ["a"], priorLosses: { a: 0, b: 0 } });
    // The right pet takes the blow, and only after the beat where it lands.
    const beat = DAMAGE_BEATS.find((d) => d.hits === "b")!.t;
    expect(livesAt(beat - 0.01, "b", leftWins)).toBe(PK_ROUNDS);
    expect(livesAt(beat, "b", leftWins)).toBe(PK_ROUNDS - 1);
    expect(livesAt(SEGMENT.round.to, "a", leftWins)).toBe(PK_ROUNDS);
  });

  it("resolves inside the round segment, not after it", () => {
    for (const winner of ["a", "b"] as const) {
      const h = hud({ roundWinners: [winner] });
      const loser = winner === "a" ? "b" : "a";
      expect(livesAt(SEGMENT.round.to, loser, h)).toBe(PK_ROUNDS - 1);
    }
  });

  it("empties the loser's bar at the K.O. on the deciding round", () => {
    const h = hud({
      roundWinners: ["a"],
      priorLosses: { a: 1, b: 1 },
      duelWinner: "left",
    });
    expect(livesAt(BEAT.ko, "b", h)).toBe(0);
    expect(livesAt(BEAT.ko, "a", h)).toBeGreaterThan(0);
  });
});

describe("the super scene", () => {
  // It opens at the power-up, long past the 4.5 / 8.85 attack beats, so without
  // damageAt every one of those beats reads as already passed and the pip came
  // off the instant the clip started — before the pet had even transformed.
  it("holds the pip until the finisher connects", () => {
    const h = hud({ roundWinners: ["a"], damageAt: BEAT.impact });
    expect(livesAt(SEGMENT.super.from, "b", h)).toBe(PK_ROUNDS);
    expect(livesAt(BEAT.flash, "b", h)).toBe(PK_ROUNDS);
    expect(livesAt(BEAT.impact - 0.01, "b", h)).toBe(PK_ROUNDS);
    expect(livesAt(BEAT.impact, "b", h)).toBe(PK_ROUNDS - 1);
  });

  it("still carries in what earlier rounds took", () => {
    const h = hud({
      roundWinners: ["a"],
      priorLosses: { a: 1, b: 1 },
      damageAt: BEAT.impact,
    });
    expect(livesAt(SEGMENT.super.from, "b", h)).toBe(PK_ROUNDS - 1);
    expect(livesAt(BEAT.impact, "b", h)).toBe(PK_ROUNDS - 2);
  });

  it("leaves the attacker's own bar alone", () => {
    const h = hud({ roundWinners: ["a"], damageAt: BEAT.impact });
    expect(livesAt(SEGMENT.super.to, "a", h)).toBe(PK_ROUNDS);
  });

  it("stops before anyone is knocked down", () => {
    // The duel carries on after a super, so the scene must end short of the
    // push and the K.O.
    expect(SEGMENT.super.to).toBeLessThan(BEAT.push);
    expect(SEGMENT.super.to).toBeGreaterThan(BEAT.impact);
    expect(SEGMENT.super.from).toBeLessThan(BEAT.quake);
  });
});

describe("the knockout clip", () => {
  // Regression: the blow that finished a pet used to jump to SEGMENT.finish and
  // replay the whole 30-second piece from the top — which after three-second
  // turns read as the game having stopped, and showed the LEFT pet attacking
  // even when the right pet had struck the final blow.
  it("is short, and is only the ending", () => {
    expect(SEGMENT.knockout.from).toBeGreaterThan(BEAT.levelBanner);
    expect(SEGMENT.knockout.from).toBeLessThan(BEAT.release);
    expect(SEGMENT.knockout.to - SEGMENT.knockout.from).toBeLessThan(
      SEGMENT.finish.to - SEGMENT.finish.from
    );
  });

  it("covers the finisher, the fall and the winner's name", () => {
    for (const beat of [BEAT.release, BEAT.impact, BEAT.ko, BEAT.wins]) {
      expect(beat).toBeGreaterThanOrEqual(SEGMENT.knockout.from);
      expect(beat).toBeLessThanOrEqual(SEGMENT.knockout.to);
    }
  });
});

describe("the ending after a super", () => {
  // Regression: a pet that supered early and then won with an ordinary punch
  // fired the finisher TWICE in one duel — once as its super, once on the way
  // to the knockdown — and the class read the second beam as the computer
  // spending a second superpower.
  it("never fires the finisher a second time", () => {
    expect(SEGMENT.knockdown.from).toBeGreaterThan(BEAT.release);
    expect(SEGMENT.knockdown.from).toBeGreaterThan(BEAT.impact);
  });

  it("still delivers the knockdown and the winner's name", () => {
    for (const beat of [BEAT.push, BEAT.ko, BEAT.wins]) {
      expect(beat).toBeGreaterThanOrEqual(SEGMENT.knockdown.from);
      expect(beat).toBeLessThanOrEqual(SEGMENT.knockdown.to);
    }
  });

  it("resumes on the exact frame the super scene stopped on", () => {
    // No gap and no overlap: the super withholds the knockdown, this supplies
    // it, and between them they play the ending once.
    expect(SEGMENT.knockdown.from).toBe(SEGMENT.super.to);
  });

  // It opens with the damage already done — there is no blow left to deal.
  it("opens with the loser already out and empties them at the K.O.", () => {
    const h = hud({
      roundWinners: [],
      priorLosses: { a: 20, b: 100 },
      maxHp: 100,
      duelWinner: "left",
    });
    expect(livesAt(SEGMENT.knockout.from, "b", h)).toBe(0);
    expect(livesAt(SEGMENT.knockout.from, "a", h)).toBe(80);
    expect(livesAt(BEAT.ko, "b", h)).toBe(0);
    expect(livesAt(BEAT.wins, "a", h)).toBe(80);
  });

  it("follows a turn rather than replacing it", () => {
    // Both halves of the exchange stay available for the killing turn itself.
    expect(SEGMENT.turnA.to).toBeLessThanOrEqual(SEGMENT.turnB.from);
    expect(SEGMENT.turnB.to).toBeLessThan(SEGMENT.knockout.from);
  });
});

describe("a super that finishes the duel", () => {
  // Regression: the clip was chosen twice — once for the soundtrack and once
  // for the picture — and the two disagreed. The audio played the whole
  // power-up and finisher while the picture played a three-second turn, then a
  // separate knockout clip fired a SECOND finisher. It read as the computer
  // using two supers back to back.
  const clipFor = (superThrown: boolean, finishes: boolean, attacker: "a" | "b") => {
    if (superThrown && finishes) {
      return { from: SEGMENT.super.from, to: SEGMENT.finish.to, endsDuel: true };
    }
    if (superThrown) return { ...SEGMENT.super, endsDuel: false };
    return {
      ...(attacker === "b" ? SEGMENT.turnB : SEGMENT.turnA),
      endsDuel: false,
    };
  };

  it("runs as one continuous ending, with nothing after it", () => {
    const clip = clipFor(true, true, "b");
    expect(clip.endsDuel).toBe(true);
    // The power-up, the finisher AND the knockdown are all inside this one clip.
    for (const beat of [BEAT.quake, BEAT.flash, BEAT.release, BEAT.ko, BEAT.wins]) {
      expect(beat).toBeGreaterThanOrEqual(clip.from);
      expect(beat).toBeLessThanOrEqual(clip.to);
    }
  });

  it("does not end the duel when the other pet is still standing", () => {
    const clip = clipFor(true, false, "b");
    expect(clip.endsDuel).toBe(false);
    // Stops short of the knockdown, so the duel can carry on.
    expect(clip.to).toBeLessThan(BEAT.push);
  });

  it("leaves an ordinary killing blow to the separate knockout clip", () => {
    const clip = clipFor(false, true, "b");
    expect(clip.endsDuel).toBe(false);
    expect(clip).toMatchObject({ from: SEGMENT.turnB.from, to: SEGMENT.turnB.to });
  });

  it("only ever fires one finisher, whichever route the duel ends by", () => {
    const routes = [
      [clipFor(true, true, "a")],
      [clipFor(false, true, "a"), { ...SEGMENT.knockout, endsDuel: true }],
    ];
    for (const clips of routes) {
      const releases = clips.filter(
        (c) => BEAT.release >= c.from && BEAT.release <= c.to
      );
      expect(releases).toHaveLength(1);
    }
  });
});

describe("powering up belongs to the super alone", () => {
  // Regression: the ending's clip began inside the power-up window with the
  // transformation switched on, so an ORDINARY killing blow flared the winner
  // gold and fired a finisher — and pupils asked why their super had gone off
  // when they had not spent it.
  it("starts the ending after the transformation is over", () => {
    expect(SEGMENT.knockout.from).toBeGreaterThanOrEqual(XFORM_OUT);
    expect(SEGMENT.knockout.from).toBeLessThanOrEqual(BEAT.chargeStart);
  });

  it("contains no part of the power-up scene", () => {
    for (const beat of [BEAT.quake, BEAT.ignite, BEAT.storm, BEAT.pillar, BEAT.flash]) {
      expect(beat).toBeLessThan(SEGMENT.knockout.from);
    }
  });

  it("still contains the whole ending", () => {
    for (const beat of [BEAT.release, BEAT.impact, BEAT.push, BEAT.ko, BEAT.wins]) {
      expect(beat).toBeGreaterThanOrEqual(SEGMENT.knockout.from);
      expect(beat).toBeLessThanOrEqual(SEGMENT.knockout.to);
    }
  });

  it("keeps the power-up inside the super's own clip", () => {
    expect(SEGMENT.super.from).toBeLessThanOrEqual(XFORM_IN);
    expect(BEAT.flash).toBeGreaterThan(SEGMENT.super.from);
    expect(BEAT.flash).toBeLessThan(SEGMENT.super.to);
  });
});
