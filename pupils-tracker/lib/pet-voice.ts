// Class-pet spoken lines for care interactions. Text lives in
// lib/pet-voice-lines.json; MP3s are per-species under
// public/pets/voice/<species>/<id>.mp3 (egg clips under voice/egg/).
// Generate with: npm run gen:pet-voices

import catalog from "./pet-voice-lines.json";
import { DEFAULT_SPECIES } from "./pets";

export type CareAction = "pat" | "cheer" | "peek" | "feed";

export type PetVoiceLine = {
  id: string;
  display: string;
  speak: string;
  /** Static MP3 path for this species (or egg). */
  src: string;
  /** Playback rate tweak — babies sound a touch younger. */
  playbackRate: number;
};

type RawLine = {
  id: string;
  kind: "shared" | "egg" | "species";
  action?: CareAction;
  species?: string;
  display: string;
  speak: string;
};

// Bump when regenerating voice clips so browsers drop cached MP3s.
export const PET_VOICE_VERSION = String(catalog.version ?? 1);

export function voiceSrc(folder: string, id: string): string {
  return `/pets/voice/${folder}/${id}.mp3?v=${PET_VOICE_VERSION}`;
}

function rateForStage(stageId?: string): number {
  if (stageId === "baby") return 1.12; // slightly higher / younger
  if (stageId === "egg") return 1.08;
  if (stageId === "adult") return 1.0;
  return 1.04; // teen
}

function toLine(
  raw: RawLine,
  folder: string,
  stageId?: string
): PetVoiceLine {
  return {
    id: raw.id,
    display: raw.display,
    speak: raw.speak,
    src: voiceSrc(folder, raw.id),
    playbackRate: rateForStage(stageId),
  };
}

function pickOne(lines: PetVoiceLine[]): PetVoiceLine {
  return lines[Math.floor(Math.random() * lines.length)]!;
}

/** Pick a lively first-person line for this care action / species / stage. */
export function pickPetLine(
  action: CareAction,
  speciesId?: string,
  stageId?: string
): PetVoiceLine {
  const raw = catalog.lines as RawLine[];

  if (stageId === "egg" || !speciesId) {
    return pickOne(raw.filter((l) => l.kind === "egg").map((l) => toLine(l, "egg", "egg")));
  }

  const folder = speciesId || DEFAULT_SPECIES;
  const bank = raw.filter(
    (l) =>
      (l.kind === "shared" && l.action === action) ||
      (l.kind === "species" &&
        l.species === speciesId &&
        l.action === action)
  );
  return pickOne(bank.map((l) => toLine(l, folder, stageId)));
}
