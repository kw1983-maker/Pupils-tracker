// Pupil avatar pool: public/avatars/01.png .. 40.png, cropped from the sprite
// sheets in docs/References/avatar/ by scripts/crop-avatars.ps1. Each pupil gets
// a stable pick from their name so the same pupil shows the same avatar on every
// device without storing anything.
export const AVATAR_COUNT = 40;

// Bumped whenever the avatar PNGs are regenerated. The files keep stable names
// (01.png..40.png), so browsers/CDNs would otherwise serve stale cached copies
// (e.g. the old opaque-background versions) after a redraw — this query string
// busts that cache so the latest transparent avatars always load.
const AVATAR_VERSION = "3";

// Stable 0..AVATAR_COUNT-1 index from a name.
function avatarIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(hash) % AVATAR_COUNT;
}

function avatarUrl(index: number): string {
  return `/avatars/${String(index + 1).padStart(2, "0")}.png?v=${AVATAR_VERSION}`;
}

// Single-name pick (used for non-pupil labels and as a fallback).
export function avatarSrc(name: string): string {
  return avatarUrl(avatarIndex(name));
}

// Unique avatar per pupil within one class. The plain name-hash collides when
// two different names land on the same index, so two pupils could share a face;
// here each name keeps its preferred avatar and any clash probes forward to the
// next free slot. With <= AVATAR_COUNT pupils every avatar is distinct. Iterating
// in the given (stable roster) order makes the result deterministic across
// devices. Beyond AVATAR_COUNT pupils, repeats are unavoidable and wrap around.
export function assignClassAvatars(names: string[]): Map<string, string> {
  const used = new Set<number>();
  const map = new Map<string, string>();
  for (const name of names) {
    if (map.has(name)) continue;
    let idx = avatarIndex(name);
    let tries = 0;
    while (used.has(idx) && tries < AVATAR_COUNT) {
      idx = (idx + 1) % AVATAR_COUNT;
      tries++;
    }
    used.add(idx);
    map.set(name, avatarUrl(idx));
  }
  return map;
}
