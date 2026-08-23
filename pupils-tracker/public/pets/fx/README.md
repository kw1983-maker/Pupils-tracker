# Power-up scene artwork

Effects for the Dragon Ball–style transformation in Pet PK (the beat between the
combo and the finisher — see `lib/pet-fight/storyboard.ts`, `XFORM_IN`…`XFORM_OUT`).

## The files

| Asset | Drawn as | Source background |
|---|---|---|
| `crack-ground` | fissures splitting open under the pet | white on **black** |
| `wind-streak` | gusts tearing outward | white on **black** |
| `lightning-arc` | electricity snapping around the pet | white on **black** |
| `shockwave-ring` | dust rings on the quake, pillar and flash | white on **black** |
| `dust-sheet` | dust driven along the ground | white on **black** |
| `aura-flame` | the flame aura on a transformed pet | white on **black** |
| `storm-clouds` | cloud rolling over the arena | dark on **white** |
| `rock-a/b/c` | chunks of arena torn loose and floating | **transparent** |

## Why the source art has solid backgrounds

Image models are far more reliable at "white shape on pure black" than at real
transparency, so the art is generated that way and the background is keyed out
at prep time by `scripts/prep-fx-art.mjs`.

Keying has to happen there rather than in CSS. The obvious trick — drop the
black with `mix-blend-mode: screen` — cannot work: the effects live inside the
stage's world layer, which carries a `transform` and therefore forms its own
blend group, so the blend composites against nothing and the black shows as a
rectangle. After prep every asset has honest alpha, and the renderer is plain
masks and images.

## Regenerating

```bash
node scripts/prep-fx-art.mjs "docs/References/power effects"
```

It matches by keyword, so files can keep the names they were generated under
("9.a chunky rounded boulder.png" → `rock-b.webp`), keys the background out,
scales each asset down to the widest it is ever painted on the 1920-wide stage,
and writes `.webp` here. Bump `PET_FX_VERSION` in `lib/pet-fight/fx-assets.ts`
when replacing art under an existing name, so browsers drop the cached copy.

`FX_ART_READY` in the same file gates the whole art-driven scene. It must stay
`false` while any asset is missing — a mask image that fails to load renders
the element *unmasked*, which paints gold rectangles across the stage.

The masters live in `docs/References/power effects/`, which is gitignored — the
prepped `.webp` files here are what ships.
