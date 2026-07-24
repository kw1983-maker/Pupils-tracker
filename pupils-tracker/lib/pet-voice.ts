// Class-pet spoken lines for care interactions. Text lives in
// lib/pet-voice-lines.json; MP3s are per-species under
// public/pets/voice/<species>/<id>.mp3 (egg clips under voice/egg/).
// Generate with: npm run gen:pet-voices

import catalog from "./pet-voice-lines.json";

// "roar" is the pet's own animal cry (woof / meow / squeak / ROAR…), so every
// species defines its own roar lines — see the species entries in
// pet-voice-lines.json. The shared roar lines below are only a safety net.
export type CareAction = "pat" | "cheer" | "peek" | "feed" | "roar";

export type PetVoiceLine = {
  id: string;
  display: string;
  speak: string;
  /** Static MP3 path for this species (or egg). */
  src: string;
  /** Label shown in the speech bubble (ElevenLabs voice name). */
  voiceName: string;
};

type RawLine = {
  id: string;
  kind: "shared" | "egg" | "species";
  action?: CareAction;
  species?: string;
  display: string;
  speak: string;
};

type VoiceMeta = { id: string; name: string; age?: string };

// Bump when regenerating voice clips so browsers drop cached MP3s.
export const PET_VOICE_VERSION = String(catalog.version ?? 1);

export function voiceSrc(folder: string, id: string): string {
  // Include folder in the query so caches can't reuse another species' clip
  // that shares the same filename (pat-0.mp3, etc.).
  return `/pets/voice/${folder}/${id}.mp3?v=${PET_VOICE_VERSION}&pet=${folder}`;
}

function voiceMeta(folder: string): VoiceMeta {
  const voices = catalog.voices as Record<string, VoiceMeta>;
  return voices[folder] ?? voices.egg ?? { id: "", name: "Pet" };
}

/** ElevenLabs character name for this species/stage (for the UI label). */
export function voiceNameFor(speciesId?: string, _stageId?: string): string {
  // Species wins even while the sprite is still an egg — otherwise every
  // level-1 pet would show/speak as the shared egg voice (kuon).
  if (!speciesId) return voiceMeta("egg").name;
  return voiceMeta(speciesId).name;
}

function toLine(raw: RawLine, folder: string): PetVoiceLine {
  const meta = voiceMeta(folder);
  return {
    id: raw.id,
    display: raw.display,
    speak: raw.speak,
    src: voiceSrc(folder, raw.id),
    voiceName: meta.name,
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

  // No species chosen yet — shared egg clips.
  if (!speciesId) {
    return pickOne(raw.filter((l) => l.kind === "egg").map((l) => toLine(l, "egg")));
  }

  const folder = speciesId;

  // A roar is the animal's own cry — a real sound effect, not speech — so it
  // plays at EVERY stage. Without this, a level-1 pet (still an egg, which most
  // pupils are) would fall into the egg branch below and speak generic egg
  // dialogue instead of roaring.
  if (action === "roar") {
    const roars = raw
      .filter(
        (l) => l.kind === "species" && l.species === speciesId && l.action === "roar"
      )
      .map((l) => toLine(l, folder));
    if (roars.length) return pickOne(roars);
  }

  // Still an egg sprite, but already a chosen species — use egg dialogue in
  // THAT species' voice (clips live at voice/<species>/egg-*.mp3).
  if (stageId === "egg") {
    return pickOne(raw.filter((l) => l.kind === "egg").map((l) => toLine(l, folder)));
  }

  const speciesLines = raw
    .filter(
      (l) =>
        l.kind === "species" && l.species === speciesId && l.action === action
    )
    .map((l) => toLine(l, folder));
  const sharedLines = raw
    .filter((l) => l.kind === "shared" && l.action === action)
    .map((l) => toLine(l, folder));

  // Prefer the species-flavoured line when it exists so a dragon/fox/etc.
  // sounds more like itself after switching pets.
  if (speciesLines.length && Math.random() < 0.65) {
    return pickOne(speciesLines);
  }
  const bank = [...sharedLines, ...speciesLines];
  return pickOne(bank.length ? bank : sharedLines);
}
