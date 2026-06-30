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
- **Aurora glass UI** — frosted card, gradient accents, smooth animations
- **Responsive** layout for desktop and mobile

## Develop

```bash
npm install
npm run build      # compile src/*.ts -> web/dist/*.js
npm run watch      # rebuild on change
npm run serve      # serve web/ at http://localhost:8080
```

Then open the served page to play.

## Deploy to GitHub Pages

Publishing is one command — it builds the TypeScript and pushes the `web/` folder to the
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
├── web/                    # publish root (served by GitHub Pages)
│   ├── index.html
│   ├── styles.css
│   ├── .nojekyll
│   └── dist/               # compiled JS (git-ignored, produced by tsc)
├── src/                    # TypeScript source
│   ├── sudoku-generator.ts # puzzle generation, solver, uniqueness check
│   ├── game-state.ts       # board state, notes, conflicts, win detection
│   ├── sudoku-app.ts        # DOM rendering, input handling, timer
│   └── main.ts             # entry point
├── tsconfig.json           # strict; outputs to web/dist
└── package.json            # build / watch / serve / deploy scripts
```

## How the generator works

1. Fill an empty 9×9 grid with a randomized backtracking search to get a complete solution.
2. Remove cells in random order, keeping a clue only if the puzzle still has **exactly one**
   solution (verified by a solver that early-exits once it finds a second solution).
3. Stop once the target clue count for the chosen difficulty is reached.

## License

MIT
