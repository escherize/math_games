import { randInt, shuffle, type Rng } from '../../engine/rng'
import type { BridgeRules } from './rules'

export interface Puzzle {
  /** Dots in the first frame (6..9). */
  a: number
  /** Dots in the second frame (2..9); a + b = sum. */
  b: number
  sum: number
  /** Three numerals offered for the total; the sum is one of them. */
  choices: number[]
}

export function generatePuzzle(rng: Rng, rules: Pick<BridgeRules, 'minSum' | 'maxSum'>): Puzzle {
  const sum = randInt(rng, rules.minSum, rules.maxSum)
  // a in 6..9 with b = sum - a in 2..9.
  const lo = Math.max(6, sum - 9)
  const hi = Math.min(9, sum - 2)
  const a = randInt(rng, lo, hi)
  const b = sum - a
  const pool = shuffle(
    rng,
    [sum - 2, sum - 1, sum + 1, sum + 2].filter((n) => n >= 11 && n <= 20),
  )
  const choices = shuffle(rng, [sum, pool[0], pool[1]])
  return { a, b, sum, choices }
}
