# DrMax — Pharmacy Game

A web game where you stock medicine boxes onto color-coded pharmacy shelves. Built with **Phaser 3** + **Matter.js** (physics) + **TypeScript** + **Vite**.

🎮 **Live demo:** https://hoisovicz.github.io/DrMax/

## Gameplay

- Boxes drop from the conveyor at the top
- Drag & drop with realistic physics — boxes can topple, stack, and fall
- 4 color-coded shelf categories:
  - 🔴 **Cold Chain** — medicines stored at 2-8 °C
  - 🔵 **Prescription** — Rx
  - 🟢 **Over the Counter** — OTC
  - 🟠 **Supplements** — vitamins and minerals
- 6 box shapes: small / medium / large carton, blister pack, bottle, spray
- Score points × current level for correct placements; lose a heart on a wrong shelf or a box dropped past the floor
- **Endless mode** with rising difficulty (every 18 s a new level: faster spawn, more box types unlocked)
- Game ends after 5 wrong placements. Best score is saved in `localStorage`.

## Local development

Requires Node.js 20+.

```bash
npm install
npm run dev      # dev server on http://localhost:5173
npm run build    # production build into dist/
npm run preview  # preview the production build
```

## Deploy to GitHub Pages

A push to `main` automatically triggers `.github/workflows/deploy.yml`, which:

1. Installs deps (`npm ci`)
2. Builds the project (`npm run build`)
3. Uploads `dist/` as the Pages artifact
4. Deploys to GitHub Pages

**One-time setup:** in GitHub go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.

The game then runs at `https://hoisovicz.github.io/DrMax/`.

## Custom product images

Box visuals are placeholder graphics drawn at runtime. Drop real product images into `public/products/` and they will replace the placeholders automatically.

### How it works

Each entry in `src/config/boxes.ts` has an optional `imageKey`:

```ts
box('small', 'Paralen', 'otc', 'paralen'),
//                              ^^^^^^^^ → public/products/paralen.{webp,png}
```

On scene preload, the game tries to load `public/products/{imageKey}.webp` and `public/products/{imageKey}.png` for every distinct key. **WebP is preferred** when both exist; PNG is the fallback; if neither file is present, the game silently falls back to the procedural placeholder. No code change needed — just drop the file and rebuild (or hot-reload in `npm run dev`).

### Image guidelines

- **Format:** `.webp` (preferred for smaller files) or `.png`. Transparent background works best.
- **Size:** roughly square or matching the box aspect ratio (cartons ~ 4:5, bottles ~ 3:8, blisters ~ 4:1)
- **Resolution:** the game scales to the box footprint; ~256 × 256 px is plenty
- **Naming:** lowercase, dash-separated, no diacritics — `vitamin-d.webp`, `omega-3.png`

### Where to source images legally

- **DrMax Marketing / Brand portal** — for branded DrMax visuals (recommended for internal use)
- **CC0 / royalty-free stock photos** — Pixabay, Pexels, Unsplash (search "medicine box", "blister pack", "supplement bottle")
- **Wikimedia Commons** — many drug packaging photos under CC-BY / CC0
- **AI generation** — DALL·E, Midjourney, Flux can produce stylized fictional packaging

⚠️ **Do not** scrape product images from drmax.cz, lekarna.cz or manufacturer sites. Copyright belongs to the manufacturer (Bayer, GSK, Zentiva, …); even DrMax is licensed, not the rights holder.

## Project structure

```
src/
├── main.ts                # Phaser game config (gravity, viewport)
├── scenes/
│   └── GameScene.ts       # main scene: shelves, physics, scoring, level ramp
└── config/
    ├── categories.ts      # shelf categories (color, name, description)
    └── boxes.ts           # box types (shape, category, optional imageKey)
public/
└── products/              # drop product PNGs here (filename = imageKey)
```

## Tunable knobs

- `INITIAL_LIVES` (in `GameScene.ts`) — number of mistakes allowed
- `spawnInterval` initial value — milliseconds between spawns
- `levelTimer` delay — how often level-up fires
- World gravity in `main.ts` — controls fall speed
- `frictionAir` in `createBox` — how much boxes drift down vs. fall fast
- `pickBoxForLevel()` in `boxes.ts` — which shapes/categories unlock at which level

## Roadmap

- [ ] Real DrMax brand assets (via internal marketing channel)
- [ ] Sound effects (correct placement, wrong shelf, level up)
- [ ] Mobile touch controls (test if `mouseSpring` works reliably on touchscreens)
- [ ] Power-ups (slow-mo, magnify-category, auto-route)
- [ ] Online leaderboard
- [ ] Conveyor mechanic (boxes ride a moving belt before falling)
