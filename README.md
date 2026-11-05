# Math Games

A hub of small math games for kids, in the style of neal.fun. Static web app: runs in any browser, installs to an iPad home screen as a full-screen app, needs no server.

The first game is Kakooma (Greg Tang's puzzle): in each pod, tap the number that two others make.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # vitest
npm run build    # typecheck + bundle to dist/
```

`dist/` is plain HTML/JS/CSS. Any static host serves it.

## What the framework gives every game

- **Rules a parent sets.** Each game declares a `RulesSpec`: defaults, a field schema, presets, and a `validate` function. The hub renders the "Parent settings" screen from the schema and stores the chosen rules in localStorage. Number-bond games share a core (`op`, `min`, `max`, `maxResult`, `step`) and add their own fields.
- **Operations.** Addition, subtraction, multiplication, division, exponents. Subtraction and division reuse the addition and multiplication bonds; the player finds a part instead of the whole.
- **History.** `StatsStore` records a session per run (mode, puzzles, right, wrong) and an attempt per tap keyed by bond (`3+4`, `4×6`, `2^3`) with a running mean time. The hub shows plays, puzzles, accuracy, best challenge run, day streak, and the weakest bonds.
- **A Console around every board.** A game is a *Cartridge*: a board that takes rules and a seed in and reports taps and solved puzzles out (`src/engine/cartridge.ts`). The hub's Console (`src/ui/play.ts`) does everything else: Practice and Challenge, the timer, "Nice!", confetti, stars, history. Another Console (Math Wiz) can mount the same board with its own rules and feedback. `CONTEXT.md` has the vocabulary.

## Layout

```
src/engine/    cartridge contract, rules, stats, rng, registry   # shared by every game
src/ui/        hub console (play), settings form (schema driven)
src/games/     one directory per game
  kakooma/     rules + presets, generator (pure, tested), board (the Cartridge, tested)
src/main.ts    hub + hash router  (#/  #/play/:id  #/settings/:id)
```

## Adding a game

1. Create `src/games/<id>/` with a `Cartridge` (`id`, `title`, `tagline`, `skill`, `rules`, `prompt`, `mount`). Its rules extend `PacedRules` so the hub can pace it.
2. Keep puzzle generation pure and seedable (`Rng` from `engine/rng`); generate puzzle *i* from `host.seed + i`.
3. In `mount`, draw the board into the container, report `{ type: 'tap' }` per tap and `{ type: 'puzzle' }` when one is solved, then hold until the Console calls `next()`. No storage, no text, no sound, no document-level listeners.
4. Test it with a fake Console (see `kakooma/cartridge.test.ts`) and add it to `src/engine/registry.ts`.
