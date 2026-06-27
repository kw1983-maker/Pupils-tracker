// Pupil avatar pool: public/avatars/01.png .. 40.png, cropped from the sprite
// sheets in docs/References/avatar/ by scripts/crop-avatars.ps1. The pool is
// shared by every class; each pupil gets a stable pick from their name so the
// same pupil shows the same avatar on every device without storing anything.
export const AVATAR_COUNT = 40;

// Bumped whenever the avatar PNGs are regenerated. The files keep stable names
// (01.png..40.png), so browsers/CDNs would otherwise serve stale cached copies
// (e.g. the old opaque-background versions) after a redraw — this query string
// busts that cache so the latest transparent avatars always load.
const AVATAR_VERSION = "3";

export function avatarSrc(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const n = (Math.abs(hash) % AVATAR_COUNT) + 1;
  return `/avatars/${String(n).padStart(2, "0")}.png?v=${AVATAR_VERSION}`;
}
