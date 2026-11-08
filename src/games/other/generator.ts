/**
 * One Other Number puzzle: a + b crossing ten, the splits of b on offer
 * (one of them completing a to ten) and, for boards that ask, three
 * candidate totals. Pure and seeded.
 */
import { randInt, shuffle, type Rng } from '../../engine/rng'
import type { OtherRules } from './rules'

export interface Split {
  p: number
  q: number
}

export interface OtherPuzzle {
  a: number
  b: number
  /** Splits of b in display order; exactly one has a part equal to 10 - a. */
  options: Split[]
  /** Candidate totals in display order; one is a + b. Empty unless the rules ask for the total. */
  totals: number[]
}

/** The smallest b whose splits number at least two (1|3 and 2|2). */
const MIN_B = 4
const TOTAL_LO = 11
const TOTAL_HI = 20
const DECOY_REACH = 3

/** Every (a, b) the rules allow: a in range, a + b crossing ten and within the largest sum, b with two or more splits. */
export function pairsOf(r: Pick<OtherRules, 'minA' | 'maxA' | 'maxSum'>): Array<[number, number]> {
  const out: Array<[number, number]> = []
  for (let a = r.minA; a <= r.maxA; a++) for (let b = Math.max(MIN_B, 10 - a + 1); a + b <= r.maxSum; b++) out.push([a, b])
  return out
}

/** The unordered splits p | q of b with p ≤ q and p ≥ 1. */
export function splitsOf(b: number): Split[] {
  const out: Split[] = []
  for (let p = 1; p <= b - p; p++) out.push({ p, q: b - p })
  return out
}

/** The split of b that completes a to ten, parts in display order. */
export function helpfulSplit(a: number, b: number): Split {
  const x = 10 - a
  const y = b - x
  return x <= y ? { p: x, q: y } : { p: y, q: x }
}

export const sameSplit = (s: Split, t: Split) => s.p === t.p && s.q === t.q

export function generatePuzzle(rng: Rng, r: OtherRules): OtherPuzzle {
  const pairs = pairsOf(r)
  const [a, b] = pairs[randInt(rng, 0, pairs.length - 1)]
  const helpful = helpfulSplit(a, b)
  const others = shuffle(rng, splitsOf(b).filter((s) => !sameSplit(s, helpful)))
  const options = shuffle(rng, [helpful, ...others.slice(0, Math.max(1, r.options - 1))])
  const totals = r.askTotal ? totalChoices(rng, a + b) : []
  return { a, b, options, totals }
}

/** The true total and two decoys within reach of it, in 11..20, shuffled. */
function totalChoices(rng: Rng, total: number): number[] {
  const near: number[] = []
  for (let d = -DECOY_REACH; d <= DECOY_REACH; d++) {
    const v = total + d
    if (d !== 0 && v >= TOTAL_LO && v <= TOTAL_HI) near.push(v)
  }
  return shuffle(rng, [total, ...shuffle(rng, near).slice(0, 2)])
}
