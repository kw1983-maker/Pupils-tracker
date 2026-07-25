# Make the white background of every pet sprite transparent, in place.
#
# The sprites are generated on a plain white background (see the Gemini prompts
# in docs/pet-art-prompts.md), which is fine on the white pet cards but shows as
# an ugly white rectangle once a pet sits on a scene backdrop.
#
# The white is flood-filled FROM THE BORDER inward rather than keyed by colour.
# That distinction matters: a naive "make every white pixel transparent" would
# punch holes straight through the panda's belly, the unicorn's body and the
# dog's chest. Only white connected to the edge is background.
#
# Usage:
#   python scripts/cutout-pet-sprites.py            # convert any opaque sprites
#   python scripts/cutout-pet-sprites.py --force    # redo ones already RGBA
#   python scripts/cutout-pet-sprites.py panda fox  # only these species
#
# Requires Pillow + numpy. Bump PET_ART_VERSION in lib/pets.ts afterwards so
# browsers drop the cached opaque copies.

import os
import sys
from collections import deque

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PETS_DIR = os.path.join(ROOT, "public", "pets")
STAGES = ["egg", "baby", "teen", "adult"]

# A pixel counts as background only if every channel is above this. Kept high so
# cream/off-white pet fur is never mistaken for the backdrop.
WHITE_THRESHOLD = 238
# Alpha ramps to 0 over this many levels of brightness, softening the cut so the
# anti-aliased outline doesn't leave a hard white halo.
EDGE_SOFTNESS = 14.0


def cutout(path: str) -> Image.Image:
    """Return the sprite with its outer white background made transparent."""
    im = Image.open(path).convert("RGB")
    rgb = np.asarray(im)
    h, w = rgb.shape[:2]
    near_white = (rgb > WHITE_THRESHOLD).all(axis=2)

    # Flood fill inward from every border pixel that is near-white.
    bg = np.zeros((h, w), dtype=bool)
    dq: deque = deque()

    def seed(y: int, x: int) -> None:
        if near_white[y, x] and not bg[y, x]:
            bg[y, x] = True
            dq.append((y, x))

    for x in range(w):
        seed(0, x)
        seed(h - 1, x)
    for y in range(h):
        seed(y, 0)
        seed(y, w - 1)

    while dq:
        y, x = dq.popleft()
        if y > 0:
            seed(y - 1, x)
        if y < h - 1:
            seed(y + 1, x)
        if x > 0:
            seed(y, x - 1)
        if x < w - 1:
            seed(y, x + 1)

    alpha = np.where(bg, 0.0, 1.0)

    # Feather only the rim: pixels kept, but touching background.
    touching = (
        (np.roll(bg, 1, 0) | np.roll(bg, -1, 0) | np.roll(bg, 1, 1) | np.roll(bg, -1, 1))
        & ~bg
    )
    softness = np.clip((255 - rgb.max(axis=2)) / EDGE_SOFTNESS, 0.0, 1.0)
    alpha = np.where(touching, np.minimum(alpha, softness), alpha)

    return Image.fromarray(
        np.dstack([rgb, (alpha * 255).astype(np.uint8)]), "RGBA"
    )


def main() -> None:
    args = sys.argv[1:]
    force = "--force" in args
    only = [a for a in args if not a.startswith("--")]

    species = sorted(
        d
        for d in os.listdir(PETS_DIR)
        if os.path.isdir(os.path.join(PETS_DIR, d)) and d != "voice"
    )
    if only:
        species = [s for s in species if s in only]

    done = skipped = warned = 0
    for sp in species:
        for stage in STAGES:
            path = os.path.join(PETS_DIR, sp, f"{stage}.png")
            if not os.path.exists(path):
                continue
            if not force and Image.open(path).mode == "RGBA":
                skipped += 1
                continue

            out = cutout(path)
            opaque = (np.asarray(out)[:, :, 3] > 8).mean()
            # A sane sprite covers a decent chunk of its square. Anything wildly
            # outside that means the flood fill ate the pet or found no edge.
            if not 0.05 < opaque < 0.95:
                print(f"  !! {sp}/{stage}: {opaque:.0%} opaque — check this one")
                warned += 1
            out.save(path)
            done += 1
        print(f"{sp}: done")

    print(f"\nConverted {done}, skipped {skipped} (already transparent).")
    if warned:
        print(f"{warned} sprite(s) flagged above — eyeball them before shipping.")
    print("Bump PET_ART_VERSION in lib/pets.ts so browsers reload the sprites.")


if __name__ == "__main__":
    main()
