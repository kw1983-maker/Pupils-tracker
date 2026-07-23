# Class pet sprites

Art for the **Pets** tab. Each pupil's pet is drawn from a sprite here, chosen by
species + evolution stage (see `lib/pets.ts`).

## Layout

```
public/pets/<species>/<stage>.png
```

- **species** — one of the ids in `PET_SPECIES` (`lib/pets.ts`):
  `dragon, fox, cat, owl, penguin, rabbit, dino, unicorn`
- **stage** — one of the ids in `PET_STAGES`: `egg, baby, teen, adult`

So a full set is 8 species × 4 stages = 32 PNGs, e.g. `public/pets/dragon/adult.png`.

## Generating the art

The sprites are **generated originals** (the reference app's pet images are
copyright-registered and are not used). Two generators are provided:

**Hugging Face FLUX.1-schnell** (default — the model the Tutor tab already uses):

```bash
npm run gen:pets            # fill in any missing sprites
npm run gen:pets -- --force # regenerate everything
npm run gen:pets dragon fox # only these species
```

Requires `HF_TOKEN` in `.env.local` (see `.env.example`).

**Google Gemini** (`npm run gen:pets:gemini`, same flags) — requires
`GEMINI_API_KEY`. Note: Gemini's image models are **not on the free tier**; the
key's project must have **billing enabled** or every call returns HTTP 429
`limit: 0`. If you hit that, use the Hugging Face generator above instead.

## Fallback

Until a sprite exists, the UI shows an emoji automatically (🥚 for eggs, then the
species emoji), so the feature works before any art is generated. To swap art
later, just replace the PNGs and bump `PET_ART_VERSION` in `lib/pets.ts` so
browsers drop the cached copies.

You can also drop in your own PNGs (hand-drawn, or CC0 packs like Kenney.nl) using
the same paths — no code change needed.
