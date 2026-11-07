/**
 * One halves puzzle: a row of n blocks. n comes from the rules' range (even
 * only unless odd rows are allowed) and differs from the previous puzzle's
 * n whenever the range offers a choice.
 */
import { randInt, type Rng } from '../../engine/rng'
import { candidates, type HalvesRules } from './rules'

export interface HalvesPuzzle {
  n: number
  /** The two parts the player must find, smaller first. */
  a: number
  b: number
}

export function generatePuzzle(rng: Rng, r: HalvesRules, previous: number | null = null): HalvesPuzzle {
  let pool = candidates(r)
  if (pool.length > 1 && previous !== null) pool = pool.filter((n) => n !== previous)
  const n = pool[randInt(rng, 0, pool.length - 1)]
  const a = Math.floor(n / 2)
  return { n, a, b: n - a }
}
