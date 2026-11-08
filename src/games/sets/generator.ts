import { mulberry32, shuffle, type Rng } from '../../engine/rng'
import type { SetsRules } from './rules'

/** A set as values, ascending: small + mid = large. */
export type Triple = [number, number, number]

export interface SetsPuzzle {
  /** Nine distinct numerals in grid order (row-major). */
  cells: number[]
  /** Every set in the grid. Sets may share tiles; at least `setsRequired` of them do not. */
  sets: Triple[]
}

/** Every value triple in `values` where two add to the third, in ascending order. Values are assumed distinct. */
export function setsIn(values: readonly number[]): Triple[] {
  const have = new Set(values)
  const out: Triple[] = []
  for (let i = 0; i < values.length; i++)
    for (let j = i + 1; j < values.length; j++) {
      const sum = values[i] + values[j]
      if (have.has(sum)) out.push(values[i] < values[j] ? [values[i], values[j], sum] : [values[j], values[i], sum])
    }
  return out.sort((a, b) => a[0] - b[0] || a[1] - b[1])
}

/** The most sets that can be taken from `sets` without two sharing a value. Exact: a grid holds at most 84 triples. */
export function packing(sets: readonly Triple[], from = 0, taken = new Set<number>()): number {
  if (from >= sets.length) return 0
  let best = packing(sets, from + 1, taken)
  const t = sets[from]
  if (!t.some((v) => taken.has(v))) {
    for (const v of t) taken.add(v)
    best = Math.max(best, 1 + packing(sets, from + 1, taken))
    for (const v of t) taken.delete(v)
  }
  return best
}

/** What the child perceives as this puzzle: the numerals, not their places. */
export function puzzleKey(p: SetsPuzzle): string {
  return p.cells
    .slice()
    .sort((a, b) => a - b)
    .join(',')
}

/**
 * Nine distinct numerals drawn from 1..max such that `setsRequired` sets can
 * be found without sharing a tile. Draws are rejected until one packs; most
 * do at the first try, three sets within 20 in a handful.
 */
export function generatePuzzle(rng: Rng, r: Pick<SetsRules, 'max' | 'setsRequired'>, attempts = 400): SetsPuzzle {
  const pool = Array.from({ length: r.max }, (_, i) => i + 1)
  if (pool.length < 9) throw new Error(`nine distinct numbers need a largest number of at least 9, not ${r.max}`)
  for (let attempt = 0; attempt < attempts; attempt++) {
    const cells = shuffle(rng, pool).slice(0, 9)
    const sets = setsIn(cells)
    if (packing(sets) >= r.setsRequired) return { cells, sets }
  }
  throw new Error(`no grid of nine distinct numbers within ${r.max} holds ${r.setsRequired} sets that share no tile`)
}

const feasible = new Map<string, boolean>()

/** Can these rules produce a grid at all? Probed once per (max, setsRequired) with a fixed seed. */
export function canSatisfy(r: Pick<SetsRules, 'max' | 'setsRequired'>): boolean {
  const key = `${r.max}:${r.setsRequired}`
  let ok = feasible.get(key)
  if (ok === undefined) {
    try {
      generatePuzzle(mulberry32(7), r, 200)
      ok = true
    } catch {
      ok = false
    }
    feasible.set(key, ok)
  }
  return ok
}
