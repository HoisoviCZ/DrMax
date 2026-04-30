# Product images

Drop **WebP** or **PNG** files in this folder to replace the procedural placeholder graphics in the game. WebP is preferred when both exist (smaller file size, better compression).

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

- **Format:** `.webp` preferred, `.png` works as fallback. Both can coexist for the same product — the game picks WebP when present.
- **Transparent background** recommended (lossless WebP or PNG-32)
- **~256 × 256 px** is plenty (the game scales to the box footprint)
- Aspect ratio close to the shape (cartons ~ 4:5, bottles ~ 3:8, blisters ~ 4:1)
- Lowercase filename, dashes, no diacritics

### Converting JPG/PNG to WebP

If your source is a JPG or PNG, convert with `cwebp` (from `libwebp`):

```bash
# Lossless from PNG with alpha
cwebp -lossless paralen.png -o paralen.webp

# Lossy with quality 85 (good balance)
cwebp -q 85 paralen.jpg -o paralen.webp
```

Or online: https://squoosh.app — drag in image, export as WebP, save here.

## Missing files are fine

If a PNG is missing, the game falls back to the colored procedural placeholder for that box. You can populate gradually — only the boxes you have images for will use them.

## Adding a new product

1. Add an entry to `BOX_TYPES` in `src/config/boxes.ts` with an `imageKey`
2. Drop `{imageKey}.png` here
3. The game auto-loads it on next dev reload / build
