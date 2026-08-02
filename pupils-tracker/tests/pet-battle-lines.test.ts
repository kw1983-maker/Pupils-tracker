import { describe, expect, it } from "vitest";
import { battleShout, shoutIdsFor, shoutIdFor } from "@/lib/pet-battle-lines";
import { movePool, runPk, toFighter, SPECIES_SIGNATURE } from "@/lib/pet-pk";
import { SHOP_POWERS, powerById } from "@/lib/pet-powers";
import { PET_SPECIES } from "@/lib/pets";

const fighter = (species: string, powers: string[] = []) =>
  toFighter({
    pupilId: "p1",
    pupilName: "Pat",
    species,
    stageId: "adult",
    exp: 40,
    powers,
  });

describe("what a pet shouts in a duel", () => {
  // The whole point is that a duel is never narrated by a move nobody names.
  it("gives every move any pet can throw a line to call it with", () => {
    for (const s of PET_SPECIES) {
      const pool = movePool(fighter(s.id, SHOP_POWERS.map((p) => p.id)));
      for (const move of pool) {
        const shout = battleShout(s.id, move);
        expect(shout, `${s.id} has nothing to say for ${move.label}`).toBeTruthy();
        expect(shout!.display).toBeTruthy();
      }
    }
  });

  it("speaks from the pet's own voice folder", () => {
    for (const s of PET_SPECIES) {
      const shout = battleShout(s.id, movePool(fighter(s.id))[0]);
      expect(shout!.src).toContain(`/pets/voice/${s.id}/pk-sig.mp3`);
      expect(shout!.voiceName).toBeTruthy();
    }
  });

  // A dragon that has also bought Fire Breath must not announce "Dragon Flame"
  // with the shop line, or its signature stops being its own.
  it("keeps a signature apart from the bought power it borrows its look from", () => {
    const pool = movePool(fighter("dragon", ["fire"]));
    const signature = pool.find((m) => m.label === SPECIES_SIGNATURE.dragon.label)!;
    const bought = pool.find((m) => m.label === powerById("fire")!.label)!;
    expect(signature.power!.id).toBe(bought.power!.id);
    expect(shoutIdFor(signature)).toBe("pk-sig");
    expect(shoutIdFor(bought)).toBe("pk-fire");
    expect(battleShout("dragon", signature)!.display).not.toBe(
      battleShout("dragon", bought)!.display
    );
  });

  it("names the move it is about to throw", () => {
    const shout = battleShout("penguin", movePool(fighter("penguin", ["frost"]))
      .find((m) => m.label === "Frost Breath")!);
    expect(shout!.display).toContain("Frost Breath");
  });

  it("has nothing to say without a species", () => {
    expect(battleShout(undefined, movePool(fighter("cat"))[0])).toBeNull();
  });

  it("preloads exactly the clips a fighter could use, and no others", () => {
    expect(shoutIdsFor("tiger", []).sort()).toEqual(["pk-sig"]);
    expect(shoutIdsFor("tiger", ["fire", "fire", "frost"]).sort()).toEqual([
      "pk-fire",
      "pk-frost",
      "pk-sig",
    ]);
    // A power id that never made it into the catalog is silently skipped
    // rather than queued as a 404.
    expect(shoutIdsFor("tiger", ["not-a-power"])).toEqual(["pk-sig"]);
  });

  it("covers every move that actually comes up over many duels", () => {
    for (let i = 0; i < 300; i++) {
      const a = fighter("robot");
      const b = fighter("mouse", ["sparkle", "whirlwind"]);
      for (const round of runPk(a, b).rounds) {
        expect(battleShout(a.species, round.a)).toBeTruthy();
        expect(battleShout(b.species, round.b)).toBeTruthy();
      }
    }
  });
});
