# Pet scene backdrops — Gemini prompt pack

Backdrops that sit **behind** a pet on the Pets tab. One image per scene covers
all 15 species — 6 generations instead of 60.

## Where to save

```
public/pets/scenes/<id>.png
```

Ids: `classroom`, `park`, `bedroom`, `beach`, `night`, `snow`.

No splitting needed — these are single images, unlike the 2×2 pet sheets.

## The three rules that make a backdrop work

1. **Center-safe.** The pet stands in the middle. Keep detail in the upper third
   and the left/right edges; leave the centre and lower-middle open.
2. **Soft and low-contrast.** A busy, saturated scene fights the sprite. The
   backdrop should recede.
3. **Grounded.** A floor or horizon line across the lower third, so the pet
   isn't floating in space.

And critically: **no characters, animals or people** in the scene. That space
belongs to the pet, and a second creature would clash with it.

## Style anchor (paste this once)

> You are drawing a set of matched backdrop scenes for a children's classroom
> app. A cute animal mascot will be placed standing in the centre of each image,
> so the composition must leave the centre and lower-middle open and uncluttered.
> House style for EVERY image: kawaii flat-vector illustration, soft cel shading,
> gentle pastel colours, clean simple shapes, low contrast so a colourful
> character stands out against it. Wide landscape 3:2 framing. Keep all detail in
> the upper third and along the left and right edges. Include a clear floor or
> horizon line across the lower third. NO people, NO animals, NO characters, no
> text, no words, no letters, no numbers.

## The six scenes

Paste one per message, after the anchor:

| id | prompt |
|---|---|
| `classroom` | A bright primary-school classroom: a green chalkboard on the back wall, a window with warm daylight and a potted plant on the left, a low bookshelf with colourful books on the right, wooden floor. Open floor across the centre. |
| `park` | A sunny park meadow: leafy round trees at the far left and right, small flowers dotted along the edges, soft rolling hills behind, a pale blue sky with a few fluffy clouds. Wide open grass across the centre. |
| `bedroom` | A cosy child's bedroom: a small bed with a patterned quilt on the left, a round rug, a window with curtains and a crescent moon outside, a shelf of toys and a warm lamp on the right, soft wooden floor. Open floor across the centre. |
| `beach` | A calm sunny beach: pale golden sand in the foreground, gentle turquoise sea and horizon line behind, a palm tree leaning in from the left edge, a few shells and a starfish near the lower corners, soft sky with light clouds. Open sand across the centre. |
| `night` | A peaceful starry night on a grassy hilltop: deep blue sky full of small stars, a big soft crescent moon in the upper right, a few glowing fireflies, dark rounded bushes along the left and right edges, gentle grassy ground. Open grass across the centre. |
| `snow` | A gentle snowy day: soft white snow-covered ground, rounded snow-topped pine trees at the far left and right, light snowflakes falling, a pale blue-grey winter sky. Open snow across the centre. |

## Checking one before you generate all six

The hardest pets to read against a backdrop are the **panda** (black and white)
and the **mouse** (grey). If both are clearly visible against a scene, every
other species will be too. If a backdrop swallows them, ask Gemini to make it
lighter and less saturated.
