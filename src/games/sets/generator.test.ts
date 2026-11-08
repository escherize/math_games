import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../../engine/rng'
import { canSatisfy, generatePuzzle, packing, puzzleKey, setsIn } from './generator'
import { presets } from './rules'

describe('sets generator', () => {
  for (const p of presets) {
    it(`${p.id}: nine distinct numerals within max with a disjoint packing of at least setsRequired sets`, () => {
      const r = p.rules
      for (let seed = 1; seed <= 300; seed++) {
        const puzzle = generatePuzzle(mulberry32(seed), r)
        expect(puzzle.cells).toHaveLength(9)
        expect(new Set(puzzle.cells).size).toBe(9)
        for (const v of puzzle.cells) {
          expect(Number.isInteger(v)).toBe(true)
          expect(v).toBeGreaterThanOrEqual(1)
          expect(v).toBeLessThanOrEqual(r.max)
        }
        expect(puzzle.sets).toEqual(setsIn(puzzle.cells))
        expect(packing(puzzle.sets)).toBeGreaterThanOrEqual(r.setsRequired)
        for (const [a, b, c] of puzzle.sets) {
          expect(a + b).toBe(c)
          expect(a).toBeLessThan(b)
        }
      }
    })
  }

  it('packs three sets within 10 and within 20', () => {
    for (const max of [10, 20])
      for (let seed = 1; seed <= 50; seed++) expect(packing(generatePuzzle(mulberry32(seed), { max, setsRequired: 3 }).sets)).toBeGreaterThanOrEqual(3)
  })

  it('throws when nine distinct numbers cannot be drawn or cannot pack the sets asked for', () => {
    expect(() => generatePuzzle(mulberry32(1), { max: 8, setsRequired: 1 })).toThrow(/at least 9/)
    // 1..9 sums to 45, odd; three sets covering all nine tiles would sum to twice their larges, an even number.
    expect(() => generatePuzzle(mulberry32(1), { max: 9, setsRequired: 3 }, 100)).toThrow(/no grid/)
    expect(canSatisfy({ max: 9, setsRequired: 3 })).toBe(false)
    expect(canSatisfy({ max: 8, setsRequired: 1 })).toBe(false)
    expect(canSatisfy({ max: 9, setsRequired: 2 })).toBe(true)
    for (const p of presets) expect(canSatisfy(p.rules)).toBe(true)
  })

  it('varies the grid across seeds and is reproducible for one seed', () => {
    const r = presets[2].rules
    const keys = new Set<string>()
    for (let seed = 1; seed <= 100; seed++) keys.add(puzzleKey(generatePuzzle(mulberry32(seed), r)))
    expect(keys.size).toBeGreaterThan(40)
    expect(generatePuzzle(mulberry32(42), r)).toEqual(generatePuzzle(mulberry32(42), r))
  })

  it('lists every set as an ascending value triple and packs them exactly', () => {
    expect(setsIn([7, 4, 3])).toEqual([[3, 4, 7]])
    expect(setsIn([1, 2, 3, 4])).toEqual([
      [1, 2, 3],
      [1, 3, 4],
    ])
    expect(setsIn([9, 11, 13])).toEqual([])
    expect(packing([])).toBe(0)
    expect(packing(setsIn([1, 2, 3, 4]))).toBe(1)
    expect(packing(setsIn([1, 2, 3, 4, 5, 9]))).toBe(2)
    expect(packing(setsIn([1, 2, 3, 4, 5, 6, 7, 8, 9]))).toBe(2)
    expect(packing(setsIn([2, 3, 4, 5, 6, 7, 8, 9, 10]))).toBe(3)
  })

  it('keys a puzzle by its sorted numerals, not their places', () => {
    expect(puzzleKey({ cells: [9, 1, 5, 3, 2, 8, 7, 4, 6], sets: [] })).toBe('1,2,3,4,5,6,7,8,9')
  })
})
