# Product images

Drop PNG files in this folder to replace the procedural placeholder graphics in the game.

## Filename = imageKey

The game looks up files by the `imageKey` field on each entry in `src/config/boxes.ts`.

| Product label | Expected filename       | Category       |
| ------------- | ----------------------- | -------------- |
| Paralen       | `paralen.png`           | OTC            |
| Acylpyrin     | `acylpyrin.png`         | OTC            |
| Ibalgin       | `ibalgin.png`           | OTC            |
| Nurofen       | `nurofen.png`           | OTC            |
| Smecta        | `smecta.png`            | OTC            |
| Aspirin       | `aspirin.png`           | OTC (blister)  |
| Stoptussin    | `stoptussin.png`        | OTC (bottle)   |
| Olynth        | `olynth.png`            | OTC (spray)    |
| Atorvastatin  | `atorvastatin.png`      | Rx             |
| Metformin     | `metformin.png`         | Rx             |
| Warfarin      | `warfarin.png`          | Rx (blister)   |
| Augmentin     | `augmentin.png`         | Rx (bottle)    |
| Insulin       | `insulin.png`           | Cold chain     |
| Vaccine       | `vaccine.png`           | Cold chain     |
| Probiotics    | `probiotics.png`        | Cold chain     |
| Vitamin D     | `vitamin-d.png`         | Supplement     |
| Magnesium     | `magnesium.png`         | Supplement     |
| Omega 3       | `omega-3.png`           | Supplement     |
| Zinc          | `zinc.png`              | Supplement     |

## Image guidelines

- **PNG** with transparent background
- **~256 × 256 px** is plenty (the game scales to the box footprint)
- Aspect ratio close to the shape (cartons ~ 4:5, bottles ~ 3:8, blisters ~ 4:1)
- Lowercase filename, dashes, no diacritics

## Missing files are fine

If a PNG is missing, the game falls back to the colored procedural placeholder for that box. You can populate gradually — only the boxes you have images for will use them.

## Adding a new product

1. Add an entry to `BOX_TYPES` in `src/config/boxes.ts` with an `imageKey`
2. Drop `{imageKey}.png` here
3. The game auto-loads it on next dev reload / build
