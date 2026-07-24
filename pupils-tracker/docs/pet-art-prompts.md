# Pet art — Gemini prompt pack

Generate class-pet evolution sheets in **Gemini**, then let the splitter turn each
one into the four stage sprites the app uses.

## The workflow

1. In Gemini, generate **one image per species** laid out as a **2×2 grid**:

   | | |
   |---|---|
   | **egg** (top-left) | **baby** (top-right) |
   | **teen** (bottom-left) | **adult** (bottom-right) |

2. Download it as PNG and save to `docs/References/Pets/<species>/<species>.png`
   (e.g. `docs/References/Pets/panda/panda.png`).
3. Run the splitter — it finds the gutter between tiles, trims each pet, centres
   it on a square, and writes `public/pets/<species>/<stage>.png`:

   ```bash
   python scripts/split-pet-strips.py
   ```

4. Bump `PET_ART_VERSION` in `lib/pets.ts` only if you replaced art that already existed.

Anything not yet generated automatically falls back to an emoji, so you can add
species a few at a time.

## The prompt

Paste this once per species, swapping in the description from the table:

> Create a single square image showing the evolution of a cute classroom pet in a
> **2×2 grid**, read left to right, top to bottom:
> **top-left** — a cute decorated speckled egg themed after the creature (not yet hatched);
> **top-right** — a tiny newly-hatched baby peeking out of the cracked egg, huge head, extra adorable;
> **bottom-left** — the same creature as a young teen, standing, a bit bigger and more confident;
> **bottom-right** — the same creature fully grown as an adult, proud and happy.
>
> The creature is: **`<DESCRIPTION>`**
>
> Keep the SAME character design and colours across all four. Style: kawaii
> flat-vector mascot sticker, thick clean outlines, soft cel shading, bright
> cheerful colours, each subject centered in its quadrant with clear white space
> between them, plain white background. No text, no words, no letters, no numbers.

## Species descriptions

Already done (8):

| species | description |
|---|---|
| dragon | a friendly rounded dragon with tiny wings |
| fox | a cute orange fox with a big fluffy tail |
| cat | a round cheerful kitten |
| owl | a big-eyed fluffy owl |
| penguin | a chubby happy penguin |
| rabbit | a soft bunny with long floppy ears |
| dino | a chubby green cartoon dinosaur |
| unicorn | a pastel unicorn with a small horn and flowing mane |

To generate (7):

| species | folder / filename | description |
|---|---|---|
| dog | `dog/dog.png` | a fluffy golden puppy with floppy ears and a wagging tail |
| panda | `panda/panda.png` | a round black-and-white panda cub |
| koala | `koala/koala.png` | a soft grey koala with big fluffy ears and a round nose |
| pig | `pig/pig.png` | a chubby pink piglet with a curly tail |
| monkey | `monkey/monkey.png` | a cheeky little brown monkey with a long curly tail |
| tiger | `tiger/tiger.png` | a small orange tiger cub with bold black stripes |
| mouse | `mouse/mouse.png` | a tiny grey mouse with big round ears and a thin tail |

## Tips

- Keep the **plain white background** — the pet cards are white, so it blends in.
- Ask for clear white space between the four quadrants; that gutter is what the
  splitter uses to cut them apart cleanly.
- Roughly square output works best; the app scales sprites to fit.
