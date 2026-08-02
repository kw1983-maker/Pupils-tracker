// What a pet shouts when it calls its move in a PK duel ("Try my Fire Breath!").
//
// A duel used to be narrated only by the commentary bar, so the pets themselves
// were mute in the one place the whole class is watching them. Each fighter now
// names its own attack, in the same ElevenLabs voice it speaks with on the Pets
// tab — the voice is a property of the species, so a pupil hears their pet, not
// a narrator.
//
// The text lives in lib/pet-voice-lines.json → "battleShouts" so the generator
// script and the app read one source. Clips are pre-rendered per species to
// public/pets/voice/<species>/pk-<key>.mp3 (npm run gen:pet-voices) rather than
// synthesised at runtime: a duel schedules its whole soundtrack up-front on one
// AudioContext clock (see schedulePkDuelAudio), which a network round-trip
// mid-fight would break.

import catalog from "./pet-voice-lines.json";
import type { PkMove } from "./pet-pk";
import { voiceSrc, voiceNameFor } from "./pet-voice";

/** Clip id for a species' own signature move, in that species' folder. */
const SIGNATURE_ID = "pk-sig";

type ShoutText = { display: string; speak: string };

const SHOUTS = catalog.battleShouts as {
  powers: Record<string, ShoutText>;
  signatures: Record<string, ShoutText>;
};

export type PetShout = {
  /** Clip id within the species folder — "pk-sig" or "pk-<powerId>". */
  id: string;
  /** Shown in the speech bubble over the pet. */
  display: string;
  /** Static MP3 path for this species. */
  src: string;
  /** ElevenLabs voice name — the same one the Pets tab labels. */
  voiceName: string;
};

/**
 * The clip id a move is announced with, or null when it has nothing to say —
 * a plain tackle, or a power with no line in the catalog.
 */
export function shoutIdFor(move: Pick<PkMove, "power" | "signature">): string | null {
  if (move.signature) return SIGNATURE_ID;
  const powerId = move.power?.id;
  return powerId && SHOUTS.powers[powerId] ? `pk-${powerId}` : null;
}

/** What this pet says as it throws this move, or null if it stays quiet. */
export function battleShout(
  species: string | undefined,
  move: Pick<PkMove, "power" | "signature">
): PetShout | null {
  if (!species) return null;
  const id = shoutIdFor(move);
  if (!id) return null;
  const text =
    id === SIGNATURE_ID ? SHOUTS.signatures[species] : SHOUTS.powers[move.power!.id];
  if (!text) return null;
  return {
    id,
    display: text.display,
    src: voiceSrc(species, id),
    voiceName: voiceNameFor(species),
  };
}

/**
 * Every clip this fighter could shout, so the two chosen pets can be decoded
 * while the teacher is still on the picker rather than at Fight time.
 */
export function shoutIdsFor(species: string, ownedPowerIds: string[]): string[] {
  const ids = new Set<string>();
  if (SHOUTS.signatures[species]) ids.add(SIGNATURE_ID);
  for (const powerId of ownedPowerIds) {
    if (SHOUTS.powers[powerId]) ids.add(`pk-${powerId}`);
  }
  return [...ids];
}
