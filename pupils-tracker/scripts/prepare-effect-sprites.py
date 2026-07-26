# Turn the full-size effect art in docs/References/effects/ into the particle
# sprites the superpowers throw.
#
# Three steps per image: make the white background transparent, trim to the
# artwork, and shrink hard. Particles are drawn at roughly 26 CSS px and peak
# around 42, so 128 square is already 3x a retina screen — the sources are
# ~1250px and ~800 KB each, which would be absurd for something twelve of are
# on screen for a second.
#
# The transparency is a flood fill inward from the border, NOT a colour key:
# keying every white pixel would punch holes through the bubble's highlight and
# the cloud's body.
#
# Usage:
#   python scripts/prepare-effect-sprites.py
#
# Requires Pillow + numpy. Bump PET_EFFECT_VERSION in lib/pet-powers.ts after
# replacing art.

import os
from collections import deque

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "docs", "References", "effects")
OUT = os.path.join(ROOT, "public", "pets", "effects")

# Source filename -> power id. Two were saved under a different name than the
# power they belong to.
NAME_TO_POWER = {
    "fire": "fire",
    "frost": "frost",
    "lighting": "lightning",   # saved as "lighting"
    "bubble": "bubble",
    "sparkle": "sparkle",
    "wind": "whirlwind",       # saved as "wind"
    "rainbow": "rainbow",
    "flight": "flight",
}

OUT_SIZE = 128
WHITE_THRESHOLD = 238
EDGE_SOFTNESS = 14.0
MARGIN = 6


def cutout(path: str) -> Image.Image:
    """Transparent PNG, background flood-filled inward from the border."""
    im = Image.open(path).convert("RGB")
    rgb = np.asarray(im)
    h, w = rgb.shape[:2]
    near_white = (rgb > WHITE_THRESHOLD).all(axis=2)

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
    touching = (
        (np.roll(bg, 1, 0) | np.roll(bg, -1, 0) | np.roll(bg, 1, 1) | np.roll(bg, -1, 1))
        & ~bg
    )
    softness = np.clip((255 - rgb.max(axis=2)) / EDGE_SOFTNESS, 0.0, 1.0)
    alpha = np.where(touching, np.minimum(alpha, softness), alpha)

    return Image.fromarray(np.dstack([rgb, (alpha * 255).astype(np.uint8)]), "RGBA")


def trim_square(im: Image.Image) -> Image.Image:
    """Crop to the artwork, then centre it on a transparent square."""
    a = np.asarray(im)[:, :, 3]
    ys, xs = np.where(a > 8)
    if len(xs) == 0:
        return im
    x0, x1 = max(0, xs.min() - MARGIN), min(im.width, xs.max() + 1 + MARGIN)
    y0, y1 = max(0, ys.min() - MARGIN), min(im.height, ys.max() + 1 + MARGIN)
    subject = im.crop((x0, y0, x1, y1))
    side = max(subject.width, subject.height)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(subject, ((side - subject.width) // 2, (side - subject.height) // 2))
    return canvas.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)


def main() -> None:
    if not os.path.isdir(SRC):
        raise SystemExit(f"No effect art at {SRC}")
    os.makedirs(OUT, exist_ok=True)

    total = 0
    done = 0
    for name, power_id in NAME_TO_POWER.items():
        src = os.path.join(SRC, f"{name}.png")
        if not os.path.exists(src):
            print(f"  {power_id}: missing {name}.png, skipping")
            continue
        out_path = os.path.join(OUT, f"{power_id}.png")
        img = trim_square(cutout(src))
        img.save(out_path, optimize=True)
        size = os.path.getsize(out_path)
        total += size
        done += 1
        opaque = (np.asarray(img)[:, :, 3] > 8).mean()
        flag = "" if 0.05 < opaque < 0.95 else "  !! check this one"
        print(f"  {power_id:<10} {size / 1024:5.1f} KB  {opaque:.0%} opaque{flag}")

    print(f"\n{done} sprite(s), {total / 1024:.0f} KB total -> {OUT}")
    print("Bump PET_EFFECT_VERSION in lib/pet-powers.ts if you replaced art.")


if __name__ == "__main__":
    main()
