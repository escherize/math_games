/**
 * One Pairs puzzle: a target and a shuffled grid of tiles in which exactly
 * `pairs` disjoint pairs sum to the target and nothing else does.
 */
import { shuffle, type Rng } from '../../engine/rng'
import type { PairsRules } from './rules'

export interface PairsPuzzle {
  target: number
  /** Tile values in grid order. */
  tiles: number[]
  /** Pairs to find before the puzzle is solved. */
  pairs: number
}

/** The sorted grid values under the target: `10:1,2,3,7,8,9`. */
export function puzzleKey(p: PairsPuzzle): string {
  return `${p.target}:${[...p.tiles].sort((a, b) => a - b).join(',')}`
}

/**
 * Draw `pairs` distinct pairs, then decoys. A decoy d needs both d and
 * target-d absent from the grid so far, so no decoy completes a pair with a
 * tile already there and no two decoys complete one with each other; each
 * accepted decoy joins the grid before the next is judged. When the target
 * runs out of spare values the grid simply carries fewer decoys.
 */
export function generatePuzzle(rng: Rng, r: PairsRules): PairsPuzzle {
  const target = r.target
  const candidates: Array<[number, number]> = []
  for (let x = 1; x < target - x; x++) candidates.push([x, target - x])
  if (r.doubles && target % 2 === 0) candidates.push([target / 2, target / 2])
  const chosen = shuffle(rng, candidates).slice(0, r.pairs)
  const tiles = chosen.flat()
  const present = new Set(tiles)

  const spare: number[] = []
  for (let d = 1; d < target; d++) spare.push(d)
  let added = 0
  for (const d of shuffle(rng, spare)) {
    if (added >= r.decoys) break
    if (present.has(d) || present.has(target - d)) continue
    tiles.push(d)
    present.add(d)
    added++
  }

  return { target, tiles: shuffle(rng, tiles), pairs: chosen.length }
}

/** Columns the grid uses for n tiles: a near-square that stays five wide at most. */
export function columnsFor(n: number): number {
  return n <= 9 ? 3 : n <= 16 ? 4 : 5
}
