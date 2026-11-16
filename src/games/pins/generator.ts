/**
 * One roll for the Pins board. The pins standing when the roll is made are
 * part of the puzzle: a roll is only drawn if the child can knock it down
 * from them, as one pin, two pins that add to it, (when allowed) two pins
 * that differ by it, or (with manyPins) any set of pins that adds to it.
 */
import { randInt, type Rng } from '../../engine/rng'
import type { PinsRules } from './rules'

export interface PinsPuzzle {
  roll: number
  /** The die faces shown, one or two, summing to the roll. */
  dice: number[]
  /** Pins standing when the roll was made, ascending. */
  pins: number[]
}

/** The rolls these dice can show. */
export function rollRange(dice: number): [number, number] {
  return dice === 2 ? [2, 12] : [1, 6]
}

type Knock = Pick<PinsRules, 'allowDifference'> & Partial<Pick<PinsRules, 'manyPins'>>

/** How many pins one knock may use. */
export function maxPinsPerKnock(r: Partial<Pick<PinsRules, 'manyPins'>>): number {
  return r.manyPins ? Infinity : 2
}

/**
 * Every set of standing pins (ascending) that adds to the roll, smallest
 * sets first, plus pairs that differ by it when allowed. With manyPins the
 * sets may be any size; otherwise one or two pins.
 */
export function waysToMake(roll: number, standing: readonly number[], r: Knock): number[][] {
  const limit = maxPinsPerKnock(r)
  const sorted = [...standing].sort((a, b) => a - b)
  const sums: number[][] = []
  const walk = (start: number, chosen: number[], total: number) => {
    if (total === roll && chosen.length > 0) sums.push(chosen)
    if (total >= roll || chosen.length >= limit) return
    for (let i = start; i < sorted.length; i++) walk(i + 1, [...chosen, sorted[i]], total + sorted[i])
  }
  walk(0, [], 0)
  const diffs: number[][] = []
  if (r.allowDifference)
    for (let i = 0; i < sorted.length; i++)
      for (let j = i + 1; j < sorted.length; j++) if (sorted[j] - sorted[i] === roll) diffs.push([sorted[i], sorted[j]])
  return [...sums, ...diffs].sort((a, b) => a.length - b.length)
}

/** The most pins one knock can take for this roll, 0 if none. */
export function bestKnock(roll: number, standing: readonly number[], r: Knock): number {
  return waysToMake(roll, standing, r).reduce((m, w) => Math.max(m, w.length), 0)
}

/** Every total the standing pins can make within the dice's range, ascending. */
export function achievable(standing: readonly number[], r: Pick<PinsRules, 'dice'> & Knock): number[] {
  const [lo, hi] = rollRange(r.dice)
  const out: number[] = []
  for (let t = lo; t <= hi; t++) if (waysToMake(t, standing, r).length > 0) out.push(t)
  return out
}

/** Two faces 1..6 that sum to the total, chosen at random among the splits. */
function splitDice(rng: Rng, total: number): number[] {
  const lo = Math.max(1, total - 6)
  const hi = Math.min(6, total - 1)
  const d1 = randInt(rng, lo, hi)
  return [d1, total - d1]
}

/** A roll the standing pins can make, or null when they cannot make any (the board resets its pins). */
export function generateRoll(rng: Rng, r: PinsRules, standing: readonly number[]): PinsPuzzle | null {
  const totals = achievable(standing, r)
  if (totals.length === 0) return null
  const roll = totals[randInt(rng, 0, totals.length - 1)]
  const dice = r.dice === 2 ? splitDice(rng, roll) : [roll]
  return { roll, dice, pins: [...standing].sort((a, b) => a - b) }
}

/** All pins standing: 1..pins. */
export function allPins(pins: number): number[] {
  return Array.from({ length: pins }, (_, i) => i + 1)
}

/**
 * The triangle's rows, back row first, as pin values. Pin 1 stands alone
 * at the front and numbers climb row by row toward the back, so 10 pins
 * read 7 8 9 10 / 4 5 6 / 2 3 / 1 like a bowling rack.
 */
export function rackRows(pins: number): number[][] {
  const rows: number[][] = []
  let next = 1
  for (let size = 1; next <= pins; size++) {
    const row: number[] = []
    for (let k = 0; k < size && next <= pins; k++) row.push(next++)
    rows.push(row)
  }
  return rows.reverse()
}
