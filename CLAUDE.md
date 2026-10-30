# math_games

Static web app (Vite + TypeScript, no framework). See README.md for layout and how to add a game.

- Puzzle generators are pure functions over a seedable `Rng`; keep them that way and test them in `*.test.ts` next to the source.
- `npm test` and `npm run build` (which typechecks) must pass before committing.
- Rules live in `src/engine/rules.ts`. Anything a parent might want to change about a game goes through a game's `RulesSpec`, not a hardcoded constant.
- Kakooma reference: https://tangmath.com/kakooma?id=addwithin10 (four 2x2 pods around a center operator; the presets mirror its variant list).
