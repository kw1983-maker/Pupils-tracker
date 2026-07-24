// Class-pet spoken lines for care interactions. Source of truth for the text
 // is lib/pet-voice-lines.json; MP3s live in public/pets/voice/<id>.mp3 and are
// generated once with: npm run gen:pet-voices

import catalog from "./pet-voice-lines.json";

export type CareAction = "pat" | "cheer" | "peek" | "feed";

export type PetVoiceLine = {
  id: string;
  display: string;
  speak: string;
  /** Static MP3 path (public/pets/voice/<id>.mp3). */
  src: string;
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

export function voiceSrc(id: string): string {
  return `/pets/voice/${id}.mp3?v=${PET_VOICE_VERSION}`;
}

function toLine(raw: RawLine): PetVoiceLine {
  return {
    id: raw.id,
    display: raw.display,
    speak: raw.speak,
    src: voiceSrc(raw.id),
  };
}

const LINES = (catalog.lines as RawLine[]).map(toLine);
const BY_ID = new Map(LINES.map((l) => [l.id, l]));

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

  if (stageId === "egg") {
    return pickOne(raw.filter((l) => l.kind === "egg").map(toLine));
  }

  const bank = raw.filter(
    (l) =>
      (l.kind === "shared" && l.action === action) ||
      (l.kind === "species" &&
        l.species === speciesId &&
        l.action === action)
  );
  return pickOne(bank.map(toLine));
}

export function petVoiceById(id: string): PetVoiceLine | undefined {
  return BY_ID.get(id);
}

export const ALL_PET_VOICE_LINES = LINES;
