import { describe, expect, it } from "vitest";
import {
  pickPetLine,
  pickSceneLine,
  voiceNameFor,
  voiceSrc,
  type CareAction,
} from "@/lib/pet-voice";
import { PET_SCENES, PET_SPECIES, PET_STAGES } from "@/lib/pets";
import catalog from "@/lib/pet-voice-lines.json";

const ACTIONS: CareAction[] = [
  "pat",
  "cheer",
  "peek",
  "feed",
  "roar",
  "sleep",
  "wake",
  "dance",
  "tickle",
  "dizzy",
];

/**
 * Actions whose whole point is one specific reaction. These must bypass the
 * egg-stage fallback, or a level-1 pet — which most pupils have — answers a
 * roar with "Someday I'll hatch…" instead of roaring.
 */
const ALWAYS_OWN_LINE: CareAction[] = [
  "roar",
  "sleep",
  "wake",
  "dance",
  "tickle",
  "dizzy",
];

describe("the voice catalog", () => {
  it("gives every species a voice", () => {
    const voices = catalog.voices as Record<string, { id: string; name: string }>;
    for (const s of PET_SPECIES) {
      expect(voices[s.id], `no voice for ${s.id}`).toBeTruthy();
      expect(voices[s.id].id).toBeTruthy();
    }
    expect(voices.egg).toBeTruthy();
  });

  it("has unique line ids", () => {
    const ids = (catalog.lines as { id: string }[]).map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers every care action", () => {
    const lines = catalog.lines as { action?: string }[];
    for (const action of ACTIONS) {
      expect(
        lines.some((l) => l.action === action),
        `no lines for ${action}`
      ).toBe(true);
    }
  });

  it("gives every scene something to say", () => {
    const lines = catalog.lines as { scene?: string }[];
    for (const scene of PET_SCENES) {
      expect(
        lines.some((l) => l.scene === scene.id),
        `no line for scene ${scene.id}`
      ).toBe(true);
    }
  });

  it("cache-busts clip urls so a regenerated voice is not served stale", () => {
    expect(voiceSrc("tiger", "roar-0")).toMatch(
      /^\/pets\/voice\/tiger\/roar-0\.mp3\?v=\d+&pet=tiger$/
    );
  });
});

describe("picking a care line", () => {
  it("always answers with a line in that pet's own folder", () => {
    for (const action of ACTIONS) {
      for (const species of PET_SPECIES) {
        for (const stage of PET_STAGES) {
          const line = pickPetLine(action, species.id, stage.id);
          expect(line.src).toContain(`/${species.id}/`);
          expect(line.display).toBeTruthy();
        }
      }
    }
  });

  // Regression: this is exactly how Roar shipped broken — the egg branch
  // swallowed it, so a level-1 pet spoke egg dialogue instead of roaring.
  it("uses its own line at the egg stage for the actions that need one", () => {
    for (const action of ALWAYS_OWN_LINE) {
      for (const species of PET_SPECIES) {
        for (let i = 0; i < 10; i++) {
          const line = pickPetLine(action, species.id, "egg");
          expect(
            line.id.startsWith("egg-"),
            `${action} fell back to egg dialogue for ${species.id}`
          ).toBe(false);
        }
      }
    }
  });

  it("still uses egg dialogue for the gentler actions while unhatched", () => {
    for (let i = 0; i < 40; i++) {
      expect(pickPetLine("pat", "panda", "egg").id.startsWith("egg-")).toBe(true);
    }
  });

  it("falls back to shared egg clips when no species is chosen", () => {
    const line = pickPetLine("pat", undefined, "egg");
    expect(line.src).toContain("/egg/");
  });
});

describe("picking a scene line", () => {
  it("names the scene it was asked for, in that pet's folder", () => {
    for (const scene of PET_SCENES) {
      for (const species of PET_SPECIES) {
        const line = pickSceneLine(scene.id, species.id);
        expect(line, `no line for ${scene.id}/${species.id}`).toBeTruthy();
        expect(line!.id).toBe(`scene-${scene.id}`);
        expect(line!.src).toContain(`/${species.id}/`);
      }
    }
  });

  it("has nothing to say without a species", () => {
    expect(pickSceneLine("snow", undefined)).toBeNull();
  });

  // Scene lines carry `scene` instead of `action`; if that ever slipped, a pet
  // would answer a pat by announcing the weather.
  it("never leaks a scene line into a care action", () => {
    for (const action of ACTIONS) {
      for (const species of PET_SPECIES) {
        for (const stage of PET_STAGES) {
          for (let i = 0; i < 6; i++) {
            expect(
              pickPetLine(action, species.id, stage.id).id.startsWith("scene-")
            ).toBe(false);
          }
        }
      }
    }
  });
});

describe("the voice label", () => {
  it("names the species' own voice even while it is still an egg", () => {
    for (const s of PET_SPECIES) {
      expect(voiceNameFor(s.id, "egg")).toBe(voiceNameFor(s.id, "adult"));
    }
  });

  it("falls back to the shared egg voice with no species", () => {
    expect(voiceNameFor(undefined, "egg")).toBeTruthy();
  });
});
