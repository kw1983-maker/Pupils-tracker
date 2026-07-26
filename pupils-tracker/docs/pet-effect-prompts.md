# Superpower effect art — Gemini prompt pack

The particle effects are currently **emoji** (🔥 ❄️ ⚡). They animate well now —
each power has its own trajectory, glow and shockwave — but an emoji always
reads as *the fire emoji*, never as fire. Real effect sprites are the single
biggest visual upgrade left.

Eight images. Same workflow as the pets and scenes.

## Where to save

```
docs/References/effects/<id>/<id>.png
```

Ids: `fire`, `frost`, `lightning`, `bubble`, `sparkle`, `whirlwind`, `rainbow`,
`flight` — matching the power ids in `lib/pet-powers.ts`.

Then run the cutout, which flood-fills the white background from the border
(so highlights *inside* the effect survive):

```bash
python scripts/cutout-pet-sprites.py
```

…and tell me — the renderer needs a one-line change to draw an image instead of
an emoji, with the emoji kept as the fallback.

## The two rules that matter

1. **One element, not a scene.** A single flame, a single shard, a single bolt —
   these are tiled as particles, so a whole fireball would look wrong repeated
   twelve times.
2. **Plain white background, nothing else in frame.** No pet, no ground, no
   glow spill to the edges — the cutout keys on white reaching the border.

## Style anchor (paste once)

> You are drawing a set of particle effect sprites for a children's classroom
> app, to match kawaii flat-vector animal mascots. House style for EVERY image:
> bold flat-vector shape, thick clean outline, soft cel shading, bright
> saturated colour, ONE single element centred on a plain pure white background,
> square 1:1 framing, generous white margin all round. No characters, no scenery,
> no text, no words, no numbers.

## The eight

| id | prompt |
|---|---|
| `fire` | A single stylised flame, teardrop shaped, orange and yellow with a bright core, licking upward. |
| `frost` | A single pale blue ice shard crystal, sharp angular facets, with a soft white highlight. |
| `lightning` | A single jagged lightning bolt, bright yellow-white with a thick dark outline, sharp zig-zag. |
| `bubble` | A single round soap bubble, translucent pale blue with a white highlight and a thin rim. |
| `sparkle` | A single four-pointed star sparkle, warm gold, with a bright centre and tapering points. |
| `whirlwind` | A single curl of swirling wind, pale grey-blue, a comma-shaped spiral with motion lines. |
| `rainbow` | A single short rainbow arc segment, pastel bands of red orange yellow green blue, curved. |
| `flight` | A single small white cloud puff with soft speed lines trailing behind it. |

## Checking one first

Generate `fire`, drop it in, and look at it at particle size (~26px). Effects
are drawn small and repeated, so anything with fine internal detail turns to
mush — if it does, ask for **"simpler, bolder, fewer details"** before doing the
other seven.
