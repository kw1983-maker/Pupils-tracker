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
# They are darker than WHITE_CUTOFF, so they read as artwork, and a sprite that
# keeps one also defeats the flood fill in cutout-pet-sprites.py -- it stops at
# the line instead of clearing past it.
#
# Looking for a gap between the tiles cannot cope with them. Every blank column
# of such a sheet contains the same handful of ink pixels (where the horizontal
# rules cross it), so hundreds of columns tie for emptiest and the split lands
# wherever the tie happens to break -- often a long way from the middle, which
# puts the centre rule *inside* a tile rather than at its edge.
#
# So find the rules instead and cut along them. A rule is ink essentially all the
# way across; art never is, having been drawn inside a margin.
RULE_SPAN = 0.98
# Where the gutter rule may be, as a fraction of the sheet. Anything outside this
# band is the border, not the divider.
CENTRE_BAND = (0.35, 0.65)


def ink_mask(arr):
    return ~np.all(arr > WHITE_CUTOFF, axis=2)


def runs(indices):
    """Group sorted indices into contiguous runs: [3,4,5,90] -> [(3,5),(90,90)]."""
    out = []
    for i in indices:
        if out and i == out[-1][1] + 1:
            out[-1][1] = i
        else:
            out.append([i, i])
    return [(a, b) for a, b in out]


def rule_runs(profile, span):
    """Contiguous lines that are ink almost all the way across — rules, not art."""
    return runs([i for i, v in enumerate(profile) if v >= span * RULE_SPAN])


def bands(profile, n, span):
    """
    The two tile ranges along one axis, with any rules excluded.

    Uses the centre rule as the cut when there is one, and falls back to the
    emptiest column nearest the middle when the sheet has no rules at all.
    """
    found = rule_runs(profile, span)
    lo, hi = int(n * CENTRE_BAND[0]), int(n * CENTRE_BAND[1])

    start, end = 0, n
    for a, b in found:  # drop border rules, so tiles never start on one
        if a <= 0:
            start = max(start, b + 1)
        if b >= n - 1:
            end = min(end, a)

    centre = [(a, b) for a, b in found if lo <= a <= hi or lo <= b <= hi]
    if centre:
        a, b = centre[0]
        return [(start, a), (b + 1, end)]

    # No rules: the emptiest line, preferring the middle when several tie.
    window = profile[lo:hi]
    ties = np.flatnonzero(window == window.min())
    cut = lo + int(ties[len(ties) // 2])
    return [(start, cut), (cut, end)]


def trim_square(sub_arr):
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
    # Column ink is measured over the height, and vice versa, so a "full span"
    # is judged against the axis the line actually crosses.
    xb = bands(mask.sum(axis=0), W, H)
    yb = bands(mask.sum(axis=1), H, W)
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
