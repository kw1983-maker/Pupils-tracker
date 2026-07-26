# Split 2x2 pet "evolution sheets" into the four stage sprites the app uses.
#
# Workflow: generate one image per species in Gemini (or anywhere) laid out as a
# 2x2 grid, read left->right, top->bottom:
#     egg  (top-left)     baby (top-right)
#     teen (bottom-left)  adult (bottom-right)
# Save each as docs/References/Pets/<Folder>/<file>.png, then run:
#     python scripts/split-pet-strips.py
# It finds the gutter between rows/columns (the whitest lines near centre so no
# neighbouring tile is caught), trims each pet, centres it on a white square, and
# writes public/pets/<species>/<stage>.png. Bump PET_ART_VERSION in lib/pets.ts
# after replacing existing art. Requires Pillow + numpy (pip install pillow numpy).

import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "docs", "References", "Pets")
OUT = os.path.join(ROOT, "public", "pets")

# source folder -> (app species id, strip filename). Edit to match your files.
SPECIES = {
    "Dragon": ("dragon", "dragon.png"),
    "cat": ("cat", "kitten.png"),
    "dino": ("dino", "dino.png"),
    "fox": ("fox", "fox.png"),
    "owl": ("owl", "owl.png"),
    "penguin": ("penguin", "penguin.png"),
    "rabbit": ("rabbit", "rabbit.png"),
    "unicorn": ("unicorn", "unicorn.png"),
    "dog": ("dog", "dog.png"),
    "panda": ("panda", "panda.png"),
    "koala": ("koala", "koala.png"),
    "piglet": ("pig", "piglet.png"),
    "monkey": ("monkey", "monkey.png"),
    "tiger": ("tiger", "tiger.png"),
    "mouse": ("mouse", "mouse.png"),
    "robot": ("robot", "robot.png"),
}
QUADRANTS = [("egg", 0, 0), ("baby", 1, 0), ("teen", 0, 1), ("adult", 1, 1)]
# The largest a sprite is ever drawn is 160 CSS px (the detail modal), so 320
# covers a 2x retina screen with room to spare. The source sheets are ~1250px
# square, but shipping that to a class of 36 pets meant ~10 MB per page load.
OUT_SIZE = 320
WHITE_CUTOFF = 244
MARGIN = 22
# Some sheets come back with thin rules drawn around and between the tiles.
# They are darker than WHITE_CUTOFF, so trim_square treats them as artwork and
# every sprite keeps a stray line down one edge; the flood fill in
# cutout-pet-sprites.py then stops at that line instead of clearing the corner.
# A fixed inset cannot fix this -- best_split lands on the emptiest column in the
# middle third, which may be either side of the rule and any distance from it.
# Peel edges instead, while they look like a rule: a line spanning essentially
# the whole tile edge. Art never does that, having been drawn inside a margin.
RULE_SPAN = 0.9


def ink_mask(arr):
    return ~np.all(arr > WHITE_CUTOFF, axis=2)


def best_split(profile, n):
    lo, hi = int(n * 0.35), int(n * 0.65)
    return lo + int(np.argmin(profile[lo:hi]))


def strip_rules(sub_arr):
    """Peel any full-width/full-height rules off the edges of one tile."""
    top, bottom, left, right = 0, sub_arr.shape[0], 0, sub_arr.shape[1]
    for _ in range(sub_arr.shape[0]):
        mask = ink_mask(sub_arr[top:bottom, left:right])
        if mask.shape[0] < 3 or mask.shape[1] < 3:
            break
        if mask[0].mean() >= RULE_SPAN:
            top += 1
        elif mask[-1].mean() >= RULE_SPAN:
            bottom -= 1
        elif mask[:, 0].mean() >= RULE_SPAN:
            left += 1
        elif mask[:, -1].mean() >= RULE_SPAN:
            right -= 1
        else:
            break
    return sub_arr[top:bottom, left:right]


def trim_square(sub_arr):
    sub_arr = strip_rules(sub_arr)
    mask = ink_mask(sub_arr)
    ys, xs = np.where(mask)
    if len(xs) == 0:
        return None
    x0, x1 = max(0, xs.min() - MARGIN), min(sub_arr.shape[1], xs.max() + 1 + MARGIN)
    y0, y1 = max(0, ys.min() - MARGIN), min(sub_arr.shape[0], ys.max() + 1 + MARGIN)
    subj = Image.fromarray(sub_arr[y0:y1, x0:x1])
    side = max(subj.width, subj.height)
    canvas = Image.new("RGB", (side, side), (255, 255, 255))
    canvas.paste(subj, ((side - subj.width) // 2, (side - subj.height) // 2))
    return canvas.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)


def process(strip_path, out_dir):
    arr = np.asarray(Image.open(strip_path).convert("RGB"))
    H, W = arr.shape[:2]
    mask = ink_mask(arr).astype(np.int32)
    xsplit = best_split(mask.sum(axis=0), W)
    ysplit = best_split(mask.sum(axis=1), H)
    xb = [(0, xsplit), (xsplit, W)]
    yb = [(0, ysplit), (ysplit, H)]
    os.makedirs(out_dir, exist_ok=True)
    for stage, gx, gy in QUADRANTS:
        x0, x1 = xb[gx]
        y0, y1 = yb[gy]
        out = trim_square(arr[y0:y1, x0:x1])
        if out is None:
            print(f"    {stage}: WARNING empty")
            continue
        out.save(os.path.join(out_dir, f"{stage}.png"))
        print(f"    {stage}: ok")


def main():
    for folder, (species_id, fname) in SPECIES.items():
        strip = os.path.join(SRC, folder, fname)
        if not os.path.exists(strip):
            print(f"{species_id}: strip not found ({strip}), skipping")
            continue
        print(species_id)
        process(strip, os.path.join(OUT, species_id))
    print("Done. Bump PET_ART_VERSION in lib/pets.ts if you replaced existing art.")


if __name__ == "__main__":
    main()
