# Sudoku

A clean, fast Sudoku game written in **TypeScript** and served as **static HTML** — no
framework, no runtime dependencies. Deployed to GitHub Pages with a single command.

### ▶︎ [Play it live](https://jeromeetienne.github.io/game_sudoku/)

## Features

- **Unique-solution puzzle generator** with four difficulties (easy → expert), backed by a
  backtracking solver and a solution-counting uniqueness check
- **Pencil notes**, live conflict detection, and peer / same-value highlighting
- **Number pad** with remaining-count badges, **hints**, and a play timer
- **Full keyboard control** — `1`–`9` to place, `N` for notes, `⌫` to erase, arrow keys to move
- **Installable PWA** — service worker precache for offline play, web app manifest, icons
- **Aurora glass UI** — frosted card, gradient accents, smooth animations
- **Responsive** layout for desktop and mobile

## Develop

```bash
npm install
npm run build      # build the full site (assets + compiled TS) into ./dist
npm run watch      # rebuild TypeScript and mirror static assets into ./dist on change
npm run serve      # build, then serve ./dist at http://localhost:8080
```

Then open the served page to play.

## Deploy to GitHub Pages

Publishing is one command — it builds the site into `./dist` and pushes that folder to the
`gh-pages` branch via the [`gh-pages`](https://www.npmjs.com/package/gh-pages) package:

```bash
npm run deploy
```

One-time setup: in **Settings → Pages**, set the source to **Deploy from a branch →
`gh-pages` / `/ (root)`**. The site then goes live at
`https://<user>.github.io/<repo>/`.

## Project structure

```
game_sudoku/
├── web/                        # source assets (copied to ./dist at build)
│   ├── index.html
│   ├── manifest.webmanifest    # PWA manifest
│   ├── sw.js                   # service worker (offline precache)
│   ├── .nojekyll
│   ├── css/
│   │   └── styles.css
│   ├── images/
│   │   └── icons/              # favicons, PWA and apple-touch icons
│   └── ts/                     # TypeScript source
│       ├── sudoku-generator.ts # puzzle generation, solver, uniqueness check
│       ├── game-state.ts       # board state, notes, conflicts, win detection
│       ├── sudoku-app.ts       # DOM rendering, input handling, timer
│       └── main.ts             # entry point
├── scripts/
│   ├── build.sh                # build the full site into ./dist
│   └── watch.sh                # watch TS + static assets into ./dist
├── dist/                       # build output, published to GitHub Pages (git-ignored)
├── tsconfig.json               # editor / type-check config (noEmit)
├── tsconfig.build.json         # build config (emits compiled JS to dist/js)
├── LICENSE
└── package.json                # build / watch / serve / deploy scripts
```

## How the generator works

1. Fill an empty 9×9 grid with a randomized backtracking search to get a complete solution.
2. Remove cells in random order, keeping a clue only if the puzzle still has **exactly one**
   solution (verified by a solver that early-exits once it finds a second solution).
3. Stop once the target clue count for the chosen difficulty is reached.

## License

MIT
