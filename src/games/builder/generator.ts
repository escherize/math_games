/**
 * One builder puzzle: distinct part-part-whole triangles, each with one or
 * two blanks, and a tray holding exactly the missing numerals, shuffled.
 */
import { randInt, shuffle, type Rng } from '../../engine/rng'
import type { BuilderRules } from './rules'

/** Slot 0 is the whole, 1 and 2 the parts. */
export type Slot = 0 | 1 | 2

export interface Triangle {
  whole: number
  parts: [number, number]
  /** Which slots are blank. */
  blanks: Slot[]
}

export interface BuilderPuzzle {
  triangles: Triangle[]
  /** Tray tiles in display order: every missing numeral exactly once each. */
  tray: number[]
}

/** The numeral a triangle holds in a slot. */
export function valueAt(t: Triangle, s: Slot): number {
  return s === 0 ? t.whole : t.parts[s - 1]
}

export function generatePuzzle(rng: Rng, r: BuilderRules): BuilderPuzzle {
  const triangles: Triangle[] = []
  const seen = new Set<string>()
  let guard = 0
  while (triangles.length < r.triangles && guard++ < 1000) {
    const whole = randInt(rng, 3, r.maxWhole)
    const a = randInt(rng, 1, whole - 1)
    const b = whole - a
    const key = `${whole}:${Math.min(a, b)}`
    if (seen.has(key)) continue
    seen.add(key)
    const blanks: Slot[] = r.blanksPer === 2 ? [1, 2] : [randInt(rng, 0, 2) as Slot]
    triangles.push({ whole, parts: [a, b], blanks })
  }
  const tray = shuffle(
    rng,
    triangles.flatMap((t) => t.blanks.map((s) => valueAt(t, s))),
  )
  return { triangles, tray }
}
