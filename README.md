# DrMax Lékárna — Hra

Webová hra, ve které rovnáš krabičky s léky do správných regálů. Postavená na **Phaser 3** + **Matter.js** (fyzika) + **TypeScript** + **Vite**.

## Herní mechanika

- Krabičky s léky padají z konvejoru shora
- Drag & drop: chytíš krabičku myší a přetáhneš na správnou polici
- 4 barevně označené kategorie regálů:
  - 🔴 **Chladnička** — léky 2–8 °C
  - 🔵 **Na předpis** — Rx
  - 🟢 **Volně prodejné** — OTC
  - 🟠 **Doplňky stravy**
- 6 tvarů krabiček: malá / střední / velká kartonová, blistr, lahvička, sprej
- Volné rovnání s fyzikou — krabičky se mohou převrhnout
- **Skóre** za správné umístění (× level), **mínus skóre + život** za chybu
- **Nekonečný režim** s rostoucí obtížností (každých 18 s level up, rychlejší spawn, otevřené nové typy)
- Hra končí po 5 chybách. Nejlepší skóre se ukládá do `localStorage`.

## Lokální vývoj

Vyžaduje Node.js 20+.

```bash
npm install
npm run dev      # spustí dev server na http://localhost:5173
npm run build    # produkční build do dist/
npm run preview  # náhled produkčního buildu
```

## Deploy na GitHub Pages

Push na `main` automaticky spustí workflow `.github/workflows/deploy.yml`, který:

1. Nainstaluje deps (`npm ci`)
2. Postaví projekt (`npm run build`)
3. Nahraje `dist/` jako Pages artefakt
4. Nasadí na GitHub Pages

**Před prvním spuštěním** je potřeba v GitHubu jednou nastavit:
**Settings → Pages → Build and deployment → Source: GitHub Actions**

Hra pak běží na `https://hoisovicz.github.io/DrMax/`.

## Struktura projektu

```
src/
├── main.ts              # Phaser game config
├── scenes/
│   └── GameScene.ts     # hlavní herní scéna (regály, fyzika, skóre)
└── config/
    ├── categories.ts    # definice kategorií regálů (barva, popis)
    └── boxes.ts         # typy krabiček (tvar, kategorie, název)
```

## Plán dalších iterací

- [ ] Importovat loga / brand assets DrMax (placeholdery zatím procedurálně generované)
- [ ] Skutečné názvy/balení produktů z DrMax katalogu
- [ ] Zvuky (cinknutí při správném umístění, varování při chybě)
- [ ] Mobilní touch ovládání (vyzkoušet, zda mouseSpring funguje)
- [ ] Power-ups (lupa kategorie, zpomalení času)
- [ ] Online leaderboard

## Konfigurace

Levely a obtížnost se ladí v `src/scenes/GameScene.ts`:

- `INITIAL_LIVES` — kolik chyb hráč dostane
- `spawnInterval` — počáteční interval spawnu (ms)
- `levelTimer` delay — jak často level up
- V `pickBoxForLevel()` v `boxes.ts` se postupně odemykají složitější typy

Kategorie a léky se přidávají v `src/config/categories.ts` a `src/config/boxes.ts`.
