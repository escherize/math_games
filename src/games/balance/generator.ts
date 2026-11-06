/**
 * One balance puzzle: a whole on the left pan, one part on the right, the
 * other part missing. The tray holds the missing part and decoys from the
 * same range, so exactly one tile levels the beam.
 */
import { randInt, shuffle, type Rng } from '../../engine/rng'
import type { BalanceRules } from './rules'

export interface BalancePuzzle {
  whole: number
  /** The part already on the right pan. */
  part: number
  /** The part the player must find. */
  missing: number
  /** Tray tiles in display order; `missing` appears exactly once. */
  tray: number[]
}

export function generatePuzzle(rng: Rng, r: BalanceRules): BalancePuzzle {
  const lowestWhole = Math.max(r.minResult, 2 * r.min)
  const whole = randInt(rng, lowestWhole, r.maxResult)
  // part + missing = whole with both parts in [min, max]
  const lo = Math.max(r.min, whole - r.max)
  const hi = Math.min(r.max, whole - r.min)
  const part = randInt(rng, lo, hi)
  const missing = whole - part
  const decoys: number[] = []
  for (let v = r.min; v <= r.max; v++) if (v !== missing) decoys.push(v)
  const tray = shuffle(rng, [missing, ...shuffle(rng, decoys).slice(0, r.tray - 1)])
  return { whole, part, missing, tray }
}
