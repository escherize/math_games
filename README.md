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
- **History.** `StatsStore` records a session per run (level reached, puzzles, right, wrong, mode) and an attempt per tap keyed by bond (`3+4`, `4×6`, `2^3`) with a running mean time. The hub shows plays, puzzles, accuracy, best level, day streak, and the weakest bonds.

## Layout

```
src/engine/    types, rules, stats, rng, registry   # shared by every game
src/ui/        settings form (schema driven)
src/games/     one directory per game
  kakooma/     rules + presets, generator (pure, tested), game screen
src/main.ts    hub + hash router  (#/  #/play/:id  #/settings/:id)
```

## Adding a game

1. Create `src/games/<id>/` with a `GameDefinition` (`id`, `title`, `tagline`, `skill`, `rules`, `mount`).
2. Keep puzzle generation pure and seedable (`Rng` from `engine/rng`) so it is testable.
3. Call `ctx.stats.recordAttempt` per answer and `ctx.stats.recordSession` when the run ends.
4. Add it to `src/engine/registry.ts`.
