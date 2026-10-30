import { mulberry32, randInt, shuffle, type Rng } from '../../engine/rng'
import { combine, operandValues, operations, type BondRules } from '../../engine/rules'
import type { PodSize } from './rules'

export interface Pod {
  cells: number[]
  /** Index of the combined value (sum, product, power). */
  whole: number
  /** Indices of the two operands. */
  parts: [number, number]
  /** Indices the player may tap to solve this pod (whole, or either part). */
  targets: number[]
}

export interface Puzzle {
  pods: Pod[]
}

export interface Shape {
  podCount: number
  podSize: PodSize
}

interface Triple {
  whole: number
  parts: [number, number]
}

/**
 * Every triple (i, j, k) with cells[k] == cells[i] ∘ cells[j].
 * A valid pod has exactly one, so the answer is never ambiguous.
 */
export function solutions(cells: number[], op: BondRules['op']): Triple[] {
  const info = operations[op]
  const out: Triple[] = []
  for (let i = 0; i < cells.length; i++)
    for (let j = info.ordered ? 0 : i + 1; j < cells.length; j++) {
      if (i === j) continue
      const target = combine(info.base, cells[i], cells[j])
      for (let k = 0; k < cells.length; k++) {
        if (k === i || k === j) continue
        if (cells[k] === target) out.push({ whole: k, parts: [i, j] })
      }
    }
  return out
}

/** Would adding `x` to a pod that already has exactly one triple create another? */
function addsSolution(cells: number[], x: number, op: BondRules['op']): boolean {
  const info = operations[op]
  for (const c of cells) {
    const ab = combine(info.base, c, x)
    if (cells.includes(ab) && ab !== c) return true
    if (info.ordered) {
      const ba = combine(info.base, x, c)
      if (cells.includes(ba) && ba !== c) return true
    }
  }
  for (let i = 0; i < cells.length; i++)
    for (let j = 0; j < cells.length; j++) {
      if (i === j || (!info.ordered && j < i)) continue
      if (combine(info.base, cells[i], cells[j]) === x) return true
    }
  return false
}

function targets(t: Triple, op: BondRules['op']): number[] {
  return operations[op].target === 'whole' ? [t.whole] : [...t.parts]
}

/**
 * Build a pod one cell at a time: start from a bond, then only add
 * distractors that do not form a second bond. Values are distinct so the
 * tap is unambiguous. Returns null if the rules cannot fill this size.
 */
function generatePod(rng: Rng, r: BondRules, size: number, attempts = 60): Pod | null {
  const info = operations[r.op]
  const pool = operandValues(r)
  const cap = r.maxResult > 0 ? r.maxResult : Infinity
  // Distractors may be any value a cell could legitimately show, so a
  // narrow operand range like 1..3 can still fill a pod with answers up to 6.
  const fillers = operandValues({ ...r, max: Math.max(r.max, Number.isFinite(cap) ? cap : r.max) })
  for (let attempt = 0; attempt < attempts; attempt++) {
    const a = pool[randInt(rng, 0, pool.length - 1)]
    const b = pool[randInt(rng, 0, pool.length - 1)]
    const whole = combine(info.base, a, b)
    if (a === b || whole > cap || whole === a || whole === b || !Number.isFinite(whole)) continue
    const cells = [a, b, whole]
    while (cells.length < size) {
      const candidates = fillers.filter((x) => !cells.includes(x) && !addsSolution(cells, x, r.op))
      if (candidates.length === 0) break
      cells.push(candidates[randInt(rng, 0, candidates.length - 1)])
    }
    if (cells.length < size) continue
    const shuffled = shuffle(rng, cells)
    const sols = solutions(shuffled, r.op)
    if (sols.length !== 1) continue
    return { cells: shuffled, whole: sols[0].whole, parts: sols[0].parts, targets: targets(sols[0], r.op) }
  }
  return null
}

export function generatePuzzle(rng: Rng, r: BondRules, shape: Shape): Puzzle {
  const pods: Pod[] = []
  for (let i = 0; i < shape.podCount; i++) {
    const pod = generatePod(rng, r, shape.podSize, 400)
    if (!pod) throw new Error(`rules cannot produce a ${shape.podSize}-cell pod`)
    pods.push(pod)
  }
  return { pods }
}

const SIZES: PodSize[] = [9, 6, 5, 4]

/** Largest pod size these rules can reliably fill, or 0 if none. */
export function maxFeasiblePodSize(r: BondRules): PodSize | 0 {
  if (operandValues(r).length < 2) return 0
  for (const size of SIZES) {
    const rng = mulberry32(7)
    let ok = 0
    for (let i = 0; i < 5; i++) if (generatePod(rng, r, size, 40)) ok++
    if (ok === 5) return size
  }
  return 0
}
