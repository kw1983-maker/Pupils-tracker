# Turn the full-size scene backdrops in docs/References/scenes/ into web assets.
#
# The sources are ~1.7 MB PNGs each — fine as masters, far too heavy to ship six
# of. Backdrops have no transparency and are soft, flat illustrations, so WebP
# compresses them enormously: ~40 KB at 1200px instead of ~1.7 MB.
#
# Writes two sizes per scene:
#   public/pets/scenes/<id>.webp        1200px — the backdrop behind the pet
#   public/pets/scenes/<id>-thumb.webp   240px — the picker swatch
# Separate thumbs matter because the picker shows all six at once; without them
# opening a pet modal would pull ~240 KB instead of ~24 KB.
#
# Usage:
#   python scripts/prepare-pet-scenes.py
#
# Requires Pillow. Bump PET_SCENE_VERSION in lib/pets.ts if you replace a scene.

import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "docs", "References", "scenes")
OUT = os.path.join(ROOT, "public", "pets", "scenes")

FULL_WIDTH = 1200
THUMB_WIDTH = 240
QUALITY = 82


def main() -> None:
    if not os.path.isdir(SRC):
        raise SystemExit(f"No scene sources at {SRC}")
    os.makedirs(OUT, exist_ok=True)

    total = 0
    for scene in sorted(os.listdir(SRC)):
        src_dir = os.path.join(SRC, scene)
        if not os.path.isdir(src_dir):
            continue
        pngs = [f for f in os.listdir(src_dir) if f.lower().endswith((".png", ".jpg", ".jpeg"))]
        if not pngs:
            print(f"{scene}: no image, skipping")
            continue

        im = Image.open(os.path.join(src_dir, pngs[0])).convert("RGB")
        for width, suffix in ((FULL_WIDTH, ""), (THUMB_WIDTH, "-thumb")):
            out_path = os.path.join(OUT, f"{scene}{suffix}.webp")
            resized = im.resize(
                (width, round(width * im.height / im.width)), Image.LANCZOS
            )
            resized.save(out_path, "WEBP", quality=QUALITY, method=6)
            total += os.path.getsize(out_path)
        print(f"{scene}: ok")

    print(f"\nWrote {OUT} — {total / 1024:.0f} KB total.")


if __name__ == "__main__":
    main()
