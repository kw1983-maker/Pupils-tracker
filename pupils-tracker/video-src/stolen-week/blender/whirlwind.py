# The Stolen Week — the whirlwind rips the seven day-pages off Pet Town's giant calendar.
# python <skill>/scripts/blender/render_shot.py whirlwind.py whirlwind_frames --fps 15 --size 1280x720 --style watercolour
import math
import shot_kit as K

K.begin()
SEC = 5.0
DAYS = ["e2382c", "f28c28", "f6c445", "5cb85c", "1d9ae0", "7b5bd6", "e85d9a"]  # Mon..Sun, same colours as the 2D pages

# the calendar board: wooden frame, cream backing, red header, two posts
K.add("cube", "8a5a2b", loc=(-1.2, 0.1, 0.2), scale=(6.6, 0.35, 3.2), name="Frame")
K.add("cube", "fbf1d8", loc=(-1.2, -0.08, 0.05), scale=(6.2, 0.05, 2.6), name="Back")
K.add("cube", "e2382c", loc=(-1.2, -0.1, 1.55), scale=(6.3, 0.12, 0.5), name="Header")
for x in (-4.0, 1.6):
    K.add("cylinder", "6b4526", loc=(x, 0.1, -2.2), r=0.16, depth=2.6)

# the whirlwind: stacked rings, wide at the top, spinning fast and swaying
TX = 3.7
wind = K.empty(loc=(TX, 0, 0), name="Wind")
for j in range(11):
    z = -1.6 + j * 0.46
    R = 0.25 + (j / 10) ** 1.4 * 1.7
    K.add("torus", "d6e8f2" if j % 2 else "b3d0e2", loc=(0.12 * math.sin(j * 1.3), 0.1 * math.cos(j * 1.7), z),
          R=R, r=0.09 + 0.05 * (j / 10), rot=(6 * math.sin(j), 6 * math.cos(j), 0), parent=wind)
K.key(wind, "rotation_euler", [(0, (0, 0, 0)), (SEC, (0, 0, math.radians(-900)))], ease=False)
K.key(wind, "location", [(0, (TX + 0.6, 0, 0)), (1.4, (TX, 0, 0)), (3.2, (TX - 0.25, 0, 0)), (SEC, (TX + 0.15, 0, 0))])

# the seven pages: Sunday (nearest the wind) goes first; each spirals up the funnel and out of frame
for i, col in enumerate(DAYS):
    x0 = -4.0 + i * 0.93
    p = K.add("cube", col, loc=(x0, -0.2, 0.0), scale=(0.78, 0.05, 1.25), name=f"Page{i}")
    K.add("cube", "fffaf0", loc=(0, -0.6, 0.15), scale=(0.75, 0.4, 0.42), parent=p)  # white label strip
    t0 = 0.9 + (6 - i) * 0.33
    pts = [(0, (x0, -0.2, 0.0)), (t0, (x0, -0.2, 0.0)), (t0 + 0.12, (x0 + 0.15, -0.5, 0.25))]
    rots = [(0, (0, 0, 0)), (t0, (0, 0, 0))]
    for j in range(1, 10):
        a = j * 0.95 + i
        r = 0.9 + 0.13 * j
        pts.append((t0 + 0.12 + 0.24 * j, (TX + r * math.cos(a), r * math.sin(a), -0.6 + j * 0.62)))
        rots.append((t0 + 0.12 + 0.24 * j, (math.radians(40 * j), math.radians(25 * j), math.radians(-60 * j))))
    K.key(p, "location", pts, ease=False)
    K.key(p, "rotation_euler", rots, ease=False)

K.lights()
K.camera((0.6, 0, 0.6), start=(0.4, -17, 2.2), end=(0.5, -15.8, 1.7), orbit=(-5, 2))
K.finish(seconds=SEC)
