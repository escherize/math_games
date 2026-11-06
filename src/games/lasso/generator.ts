/**
 * Lasso ten puzzles: n dots (11..19) laid out so that a loop around exactly
 * ten is there to be drawn. Pure and seeded, so a puzzle can be replayed.
 */
import { randInt, type Rng } from '../../engine/rng'
import type { LassoRules } from './rules'

export const VIEW_W = 400
export const VIEW_H = 300
export const RADIUS = 14
/** Centres never come closer than this. */
export const MIN_DIST = RADIUS * 2.5
/** The ten and the rest are at least this far apart (edge to edge). */
export const GROUP_GAP = RADIUS * 3

export interface Dot {
  x: number
  y: number
}

export interface LassoPuzzle {
  n: number
  /** The first ten are the cluster; the rest are the ones. */
  dots: Dot[]
}

const TEN_REGION = { x0: 30, x1: 210, y0: 30, y1: 270 }
const REST_REGION = { x0: 210 + GROUP_GAP + 2 * RADIUS, x1: VIEW_W - 30, y0: 30, y1: VIEW_H - 30 }

function rows(n: number): Dot[] {
  const dots: Dot[] = []
  const left = 30
  const right = VIEW_W - 30
  for (let i = 0; i < 10; i++) dots.push({ x: left + ((right - left) * i) / 9, y: 90 })
  const rest = n - 10
  const spacing = 40
  const start = VIEW_W / 2 - ((rest - 1) * spacing) / 2
  for (let i = 0; i < rest; i++) dots.push({ x: start + i * spacing, y: 210 })
  return dots
}

function scatterInto(rng: Rng, count: number, region: typeof TEN_REGION, into: Dot[]): boolean {
  for (let i = 0; i < count; i++) {
    let placed = false
    for (let attempt = 0; attempt < 200 && !placed; attempt++) {
      const d = { x: randInt(rng, region.x0, region.x1), y: randInt(rng, region.y0, region.y1) }
      if (into.every((o) => Math.hypot(o.x - d.x, o.y - d.y) >= MIN_DIST)) {
        into.push(d)
        placed = true
      }
    }
    if (!placed) return false
  }
  return true
}

function scatter(rng: Rng, n: number): Dot[] {
  for (;;) {
    const dots: Dot[] = []
    if (scatterInto(rng, 10, TEN_REGION, dots) && scatterInto(rng, n - 10, REST_REGION, dots)) return dots
  }
}

export function generatePuzzle(rng: Rng, rules: LassoRules): LassoPuzzle {
  const n = randInt(rng, rules.minCount, rules.maxCount)
  const dots = rules.layout === 'rows' ? rows(n) : scatter(rng, n)
  return { n, dots }
}
