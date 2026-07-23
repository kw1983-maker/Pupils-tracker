# Pet art — Gemini prompt pack

Generate the class-pet sprites in **Gemini** (the image model, "Nano Banana" /
Gemini 2.5 Flash Image) and save each PNG into the app.

## Where to save each file

```
public/pets/<species>/<stage>.png
```

- **species**: `dragon, fox, cat, owl, penguin, rabbit, dino, unicorn`
- **stage**:   `egg, baby, teen, adult`

Example: the grown dragon → `public/pets/dragon/adult.png`.

You do **not** have to do all 8 species or all 4 stages. Anything missing shows an
emoji automatically, so start with one or two favourites and add more later. After
adding/replacing PNGs, bump `PET_ART_VERSION` in `lib/pets.ts` if you're replacing
files that already existed (so the browser reloads them).

## Style anchor (paste this once at the top of a Gemini chat)

> You are drawing a matched set of cute classroom pet mascots for a children's
> app. House style for EVERY image: kawaii flat-vector mascot sticker, thick clean
> outlines, soft cel shading, bright cheerful colours, ONE centered subject facing
> forward, on a plain white background, square 1:1 framing, friendly children's
> game art, no text, no words, no letters, no numbers.

## Per-species prompts

For each species, generate the **baby** first, then ask Gemini to keep *the same
character* for the other stages so the evolution looks consistent:

> Draw the **baby**: `<species description>`, a tiny newly-hatched baby — huge
> head, very small body, extra adorable.
>
> Now, keeping this exact same character and colours:
> - the **egg**: a cute decorated speckled egg themed after it (not yet hatched)
> - the **teen**: the same creature grown a bit bigger and more confident
> - the **adult**: the same creature fully grown, proud and happy

Species descriptions:

| species  | description |
|----------|-------------|
| dragon   | a friendly rounded dragon with tiny wings |
| fox      | a cute orange fox with a big fluffy tail |
| cat      | a round cheerful kitten |
| owl      | a big-eyed fluffy owl |
| penguin  | a chubby happy penguin |
| rabbit   | a soft bunny with long floppy ears |
| dino     | a chubby green cartoon dinosaur |
| unicorn  | a pastel unicorn with a small horn and flowing mane |

## Tips

- Download each image as **PNG**, rename to the stage (`egg/baby/teen/adult`), and
  drop it in the matching species folder.
- Keep the plain white background — the pet cards are white, so it blends in. (If
  you want cut-out pets later, ask Gemini for a transparent background, or run the
  PNGs through a background remover.)
- Aim for roughly square images; the app scales them to fit.
