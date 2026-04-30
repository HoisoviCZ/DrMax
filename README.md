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
- Game ends after 5 wrong placements. Best score saved in `localStorage`.
- **Online leaderboard** (top 20, opt-in via Supabase — see below): if your run qualifies, you can submit 3-letter initials retro-arcade style.

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

## Online leaderboard (Supabase)

The game ships with an optional online leaderboard that shows the **top 20 scores** across all players. Only scores that qualify for the top 20 are eligible to submit; players enter their **3-letter initials** retro-arcade-style and the entry shows up in the table.

### How it works at runtime

- On game over, the game fetches the current top 20 from Supabase
- If your final score beats the lowest entry (or the table has < 20 rows), you get a **NEW HIGH SCORE!** banner and an initials prompt
- After submit, the leaderboard refreshes and your row is highlighted
- If Supabase env vars are missing or the request fails, the game silently degrades to local-only mode (best score in `localStorage`) — nothing else breaks

### Setup steps

You need these once to enable the leaderboard:

#### 1. Create a Supabase project

Sign up at [supabase.com](https://supabase.com), create a new project (pick a region close to your players — `eu-central-1` or `eu-west-2` works for CEE), and wait ~2 minutes for it to provision.

#### 2. Create the `scores` table and RLS policies

In the Supabase dashboard go to **SQL Editor → New query** and run:

```sql
create table public.scores (
  id          bigserial primary key,
  initials    text not null check (length(initials) = 3 and initials ~ '^[A-Z]{3}$'),
  score       integer not null check (score >= 0 and score < 1000000),
  level       integer not null check (level >= 1 and level <= 999),
  created_at  timestamptz not null default now()
);

create index scores_score_desc on public.scores (score desc, created_at asc);

alter table public.scores enable row level security;

create policy "Anyone can read top scores"
  on public.scores for select
  to anon, authenticated
  using (true);

create policy "Anyone can insert a valid score"
  on public.scores for insert
  to anon, authenticated
  with check (
    length(initials) = 3
    and initials ~ '^[A-Z]{3}$'
    and score >= 0
    and score < 1000000
    and level >= 1
    and level <= 999
  );
```

The check constraints + RLS guarantee no one can submit a 99-char insult or a billion-point score even though the anon key is public.

#### 3. Grab the project URL and anon key

In **Project Settings → API** copy:

- **Project URL** (e.g. `https://abcdefgh.supabase.co`)
- **anon / public key** (starts with `eyJ…`, this is safe to expose — RLS protects the table)

#### 4. Wire it into the game

**For local dev:**

```bash
cp .env.example .env.local
# edit .env.local and paste your URL + anon key
npm run dev
```

**For GitHub Pages (production):**

In your repo go to **Settings → Secrets and variables → Actions → New repository secret** and add:

- `SUPABASE_URL` = your project URL
- `SUPABASE_ANON_KEY` = your anon key

The deploy workflow ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) injects them as `VITE_*` env vars at build time, so the next push to `main` builds with the leaderboard enabled.

### What about cheating?

The game runs entirely client-side, so anyone with browser DevTools can call `submitScore()` with arbitrary values. The DB constraints (`score < 1_000_000`, `level <= 999`, initials regex) prevent the worst abuse, but real anti-cheat would require server-side simulation — out of scope for a fun project. Treat the leaderboard as social, not authoritative.

### Resetting / managing entries

Delete rows in the Supabase SQL editor or table editor. Add an admin RLS policy or use the service role key if you want a "wipe weekly" job — keep that key out of the client.

## Roadmap

- [ ] Real DrMax brand assets (via internal marketing channel)
- [ ] Sound effects (correct placement, wrong shelf, level up)
- [ ] Mobile touch controls (initials entry + drag — currently desktop-only)
- [ ] Power-ups (slow-mo, magnify-category, auto-route)
- [ ] Conveyor mechanic (boxes ride a moving belt before falling)
- [ ] Weekly leaderboard reset
