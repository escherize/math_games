import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../../engine/rng'
import { columnsFor, generatePuzzle, puzzleKey, type PairsPuzzle } from './generator'
import { availablePairs, pairsRules, presets, type PairsRules } from './rules'

/** Unordered tile index pairs that make the target. */
function summingPairs(p: PairsPuzzle): Array<[number, number]> {
  const out: Array<[number, number]> = []
  for (let i = 0; i < p.tiles.length; i++) for (let j = i + 1; j < p.tiles.length; j++) if (p.tiles[i] + p.tiles[j] === p.target) out.push([i, j])
  return out
}

/** Tiles with no partner anywhere else in the grid. */
function decoysOf(p: PairsPuzzle): number[] {
  return p.tiles.filter((v, i) => !p.tiles.some((w, j) => j !== i && v + w === p.target))
}

/** Most decoys a grid with these pairs can carry: one per unused pair, plus the half when it is free. */
function decoyRoom(p: PairsPuzzle, r: PairsRules): number {
  const present = new Set(p.tiles)
  let room = 0
  for (let d = 1; d < r.target; d++) {
    if (present.has(d) || present.has(r.target - d)) continue
    if (d <= r.target - d) room++
  }
  return room
}

const cases: Array<[string, PairsRules]> = [
  ...presets.map((p): [string, PairsRules] => [p.id, p.rules]),
  ['to20 doubles full grid', { ...presets[3].rules, pairs: 8, decoys: 4, doubles: true }],
  ['to10 one pair many decoys', { ...presets[1].rules, pairs: 1, decoys: 6 }],
  ['to5 doubles off', { ...presets[0].rules, pairs: 1, decoys: 1 }],
]

describe('pairs generator', () => {
  for (const [name, r] of cases) {
    it(`${name}: exactly \`pairs\` disjoint pairs make the target and every other tile is a decoy`, () => {
      for (let seed = 1; seed <= 300; seed++) {
        const p = generatePuzzle(mulberry32(seed), r)
        expect(p.target).toBe(r.target)
        expect(p.pairs).toBe(r.pairs)
        const sums = summingPairs(p)
        expect(sums).toHaveLength(r.pairs)
        expect(new Set(sums.flat()).size).toBe(r.pairs * 2)
        for (const v of p.tiles) {
          expect(v).toBeGreaterThanOrEqual(1)
          expect(v).toBeLessThan(r.target)
        }
        const decoys = decoysOf(p)
        expect(decoys).toHaveLength(p.tiles.length - r.pairs * 2)
        expect(new Set(decoys).size).toBe(decoys.length)
        expect(decoys.length).toBeLessThanOrEqual(r.decoys)
        // Fewer decoys only when the target has no spare value left.
        if (decoys.length < r.decoys) expect(decoyRoom(p, r)).toBe(0)
        expect(p.tiles.length).toBeLessThanOrEqual(20)
      }
    })
  }

  it('repeats a value only as the allowed double, and never more than twice', () => {
    let seen = 0
    for (const [, r] of cases) {
      for (let seed = 1; seed <= 300; seed++) {
        const p = generatePuzzle(mulberry32(seed), r)
        const counts = new Map<number, number>()
        for (const v of p.tiles) counts.set(v, (counts.get(v) ?? 0) + 1)
        for (const [v, n] of counts) {
          if (n === 1) continue
          expect(r.doubles).toBe(true)
          expect(n).toBe(2)
          expect(v * 2).toBe(r.target)
          seen++
        }
      }
    }
    expect(seen).toBeGreaterThan(0)
  })

  it('serves the asked-for decoys when the target has room', () => {
    for (let seed = 1; seed <= 300; seed++) {
      expect(generatePuzzle(mulberry32(seed), presets[3].rules).tiles).toHaveLength(12)
      expect(generatePuzzle(mulberry32(seed), presets[2].rules).tiles).toHaveLength(9)
    }
  })

  it('is deterministic per seed and varies across seeds', () => {
    const r = presets[3].rules
    expect(generatePuzzle(mulberry32(42), r)).toEqual(generatePuzzle(mulberry32(42), r))
    const keys = new Set<string>()
    for (let seed = 1; seed <= 50; seed++) keys.add(puzzleKey(generatePuzzle(mulberry32(seed), r)))
    expect(keys.size).toBeGreaterThan(30)
  })

  it('has small pools at the gentle end: four boards to 5, eight to 10', () => {
    const pool = (r: PairsRules) => {
      const keys = new Set<string>()
      for (let seed = 1; seed <= 400; seed++) keys.add(puzzleKey(generatePuzzle(mulberry32(seed), r)))
      return keys.size
    }
    expect(pool(presets[0].rules)).toBe(4)
    expect(pool(presets[1].rules)).toBe(8)
  })

  it('keys a puzzle by its target and sorted values', () => {
    expect(puzzleKey({ target: 10, tiles: [7, 3, 9, 1, 5], pairs: 2 })).toBe('10:1,3,5,7,9')
  })

  it('picks grid columns by tile count', () => {
    expect(columnsFor(4)).toBe(3)
    expect(columnsFor(9)).toBe(3)
    expect(columnsFor(10)).toBe(4)
    expect(columnsFor(16)).toBe(4)
    expect(columnsFor(17)).toBe(5)
    expect(columnsFor(20)).toBe(5)
  })
})

describe('pairs rules', () => {
  it('counts the pairs a target has', () => {
    expect(availablePairs(5, false)).toBe(2)
    expect(availablePairs(5, true)).toBe(2)
    expect(availablePairs(10, false)).toBe(4)
    expect(availablePairs(10, true)).toBe(5)
    expect(availablePairs(20, false)).toBe(9)
    expect(availablePairs(20, true)).toBe(10)
  })

  it('every preset validates and bad rules are refused', () => {
    for (const p of presets) expect(pairsRules.validate(p.rules)).toBeNull()
    const r = presets[1].rules
    expect(pairsRules.validate({ ...r, op: 'subtract' })).toMatch(/addition/)
    expect(pairsRules.validate({ ...r, target: 7 as 5 })).toMatch(/5, 10 or 20/)
    expect(pairsRules.validate({ ...r, pairs: 0 })).toMatch(/at least one/)
    expect(pairsRules.validate({ ...r, pairs: 5 })).toMatch(/does not have 5/)
    expect(pairsRules.validate({ ...r, pairs: 5, doubles: true })).toBeNull()
    expect(pairsRules.validate({ ...r, target: 5, pairs: 3, doubles: true })).toMatch(/does not have 3/)
    expect(pairsRules.validate({ ...r, decoys: -1 })).toMatch(/negative/)
    expect(pairsRules.validate({ ...r, target: 20, pairs: 8, decoys: 5 })).toMatch(/at most 20/)
    expect(pairsRules.validate({ ...r, target: 20, pairs: 8, decoys: 4 })).toBeNull()
  })
})
