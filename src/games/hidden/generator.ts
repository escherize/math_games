/** One hidden-bonds puzzle: a number and how many of its bonds to find. */
import { randInt, type Rng } from '../../engine/rng'
import { bondCount, type HiddenRules } from './rules'

export interface HiddenPuzzle {
  n: number
  /** Bonds the shelf must hold before the puzzle is solved. */
  needed: number
}

export function generatePuzzle(rng: Rng, r: HiddenRules): HiddenPuzzle {
  const n = randInt(rng, r.minN, r.maxN)
  const total = bondCount(n, r)
  return { n, needed: r.bondsRequired > 0 ? Math.min(r.bondsRequired, total) : total }
}
