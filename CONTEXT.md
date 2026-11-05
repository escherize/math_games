# Math Games

Small interactive math boards for young kids, playable on their own at escherize.com/math_games and hosted inside Math Wiz as Exercises. Math Games and Math Wiz are separate contexts; only what the Math Wiz glossary already names crosses between them (see `lll doc view context` on team MW).

## Language

**Cartridge**:
One game: a board drawn in TypeScript that owns its own input and under-the-finger feedback, takes its rules and seed from a Console, and reports progress back to it. It never reads settings or writes stats itself.
_Avoid_: game module, plug-in, widget

**Console**:
Whatever mounts a Cartridge and owns everything around it: rules, seed, feedback on outcome, scoring and records. The hub is one Console; Math Wiz is another.
_Avoid_: host, runner, shell

**Hub**:
The standalone site's Console: the landing page that lists Cartridges, keeps stats and stars in the browser, and offers Levels and free play.
_Avoid_: menu, launcher

**Rules**:
The parent-tunable knobs of a Cartridge, declared by its RulesSpec. A Console supplies the values; the Cartridge validates them at mount.
_Avoid_: settings, config, options

**Preset**:
A named bundle of Rules values a Cartridge ships with (e.g. numbers 1..5, sums to 5). The raw material of a Level here and of a seed item in Math Wiz.
_Avoid_: difficulty, tier

**Level**:
A Preset on the Hub's ladder, scored with stars and unlocked in order (decision `levels-are-the-preset-ladder`). A Hub concept only: Math Wiz bans the word and hosts a Preset as a separate Exercise instead.
_Avoid_: stage, world

**Puzzle**:
One board state with one answer. The unit a Cartridge reports on.
_Avoid_: question, problem, card

**Round**:
A run of N Puzzles in one Cartridge with one Rules value, the unit the Hub scores. In Math Wiz N is 1 and the Round is the Exercise.
_Avoid_: session, game (as a run), set

**Stars**:
The Hub's three-step rating of a Round: complete, no wrong taps, all fast. Never leaves the Hub.
_Avoid_: score, grade, points

**Fast**:
A Puzzle solved under the Rules' fast bar with no wrong tap (decision `fast-and-flawless`). Speed alone earns nothing.
_Avoid_: quick, speedrun, timed
