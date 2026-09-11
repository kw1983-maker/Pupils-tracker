import { describe, expect, it } from "vitest";
import {
  ELEMENTS,
  ELEMENT_BONUS,
  ELEMENT_OF,
  advantage,
  advantageLine,
  elementBonus,
  elementOf,
  type PetElement,
} from "@/lib/pet-elements";
import { PET_POWERS } from "@/lib/pet-powers";
import { SPECIES_SIGNATURE } from "@/lib/pet-pk";
import { PET_SPECIES } from "@/lib/pets";

const ALL = Object.keys(ELEMENTS) as PetElement[];

describe("the element ring", () => {
  it("is a true cycle — every element beats exactly one and loses to one", () => {
    for (const el of ALL) {
      const beaten = ELEMENTS[el].beats;
      expect(beaten).not.toBe(el);
      expect(advantage(el, beaten)).toBe(1);
      expect(advantage(beaten, el)).toBe(-1);
    }
    // Following `beats` from any element visits all three and comes home.
    let at = ALL[0];
    const seen = new Set<PetElement>();
    for (let i = 0; i < ALL.length; i++) {
      seen.add(at);
      at = ELEMENTS[at].beats;
    }
    expect(seen.size).toBe(ALL.length);
    expect(at).toBe(ALL[0]);
  });

  it("treats same-element and tackle match-ups as neutral", () => {
    for (const el of ALL) expect(advantage(el, el)).toBe(0);
    expect(advantage(null, "fire")).toBe(0);
    expect(advantage("fire", null)).toBe(0);
    expect(advantage(null, null)).toBe(0);
  });

  // A wrong pick should feel like a missed chance, never a punishment.
  it("pays the bonus for an advantage and never charges for a disadvantage", () => {
    for (const el of ALL) {
      const beaten = ELEMENTS[el].beats;
      expect(elementBonus(el, beaten)).toBe(ELEMENT_BONUS);
      expect(elementBonus(beaten, el)).toBe(0);
      expect(elementBonus(el, el)).toBe(0);
    }
    expect(ELEMENT_BONUS).toBeGreaterThan(0);
  });
});

describe("every move has an element", () => {
  it("covers the whole power catalog exactly once", () => {
    for (const p of PET_POWERS) {
      expect(ELEMENT_OF[p.id], `no element for ${p.id}`).toBeTruthy();
      expect(elementOf(p.id)).toBe(ELEMENT_OF[p.id]);
    }
    expect(Object.keys(ELEMENT_OF).sort()).toEqual(
      PET_POWERS.map((p) => p.id).sort()
    );
  });

  // A pet that has never been shopped for still has to be readable, or the
  // triangle is invisible until a pupil spends marks.
  it("gives every species an element through its signature", () => {
    for (const s of PET_SPECIES) {
      const sig = SPECIES_SIGNATURE[s.id];
      expect(elementOf(sig.powerId), `${s.id} has no element`).toBeTruthy();
    }
  });

  it("spreads the powers across the groups rather than stacking one", () => {
    for (const el of ALL) {
      const n = PET_POWERS.filter((p) => ELEMENT_OF[p.id] === el).length;
      expect(n, `${el} holds ${n} powers`).toBeGreaterThan(1);
    }
  });

  it("has no element for a plain tackle", () => {
    expect(elementOf(null)).toBeNull();
    expect(elementOf(undefined)).toBeNull();
    expect(elementOf("tackle")).toBeNull();
  });
});

describe("what the class is told", () => {
  it("reads as a sentence", () => {
    expect(advantageLine("fire", "frost")).toBe("Fire melts Frost!");
    expect(advantageLine("frost", "storm")).toBe("Frost freezes Storm!");
    expect(advantageLine("storm", "fire")).toBe("Storm blows out Fire!");
  });
});
