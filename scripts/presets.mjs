// Prints every cartridge's presets as JSON. Run through `npm run presets`,
// which builds dist-lib first so the output always matches HEAD.
import { readFileSync } from 'node:fs'
const lib = await import(new URL('../dist-lib/mathgames.js', import.meta.url))
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
process.stdout.write(JSON.stringify({ package: version, build: lib.version, games: lib.presets() }, null, 2) + '\n')
