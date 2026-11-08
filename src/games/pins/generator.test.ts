import { describe, expect, it } from 'vitest'
import { mulberry32, randInt } from '../../engine/rng'
import { achievable, allPins, generateRoll, rackRows, rollRange, waysToMake } from './generator'
import { pinsRules, presets, type PinsRules } from './rules'

/** A random non-empty subset of the rack, so rolls are tested against every kind of board state. */
function someStanding(seed: number, pins: number): number[] {
  const rng = mulberry32(seed * 31 + 1)
  const keep = allPins(pins).filter(() => rng() < 0.55)
  return keep.length ? keep : [randInt(rng, 1, pins)]
}

describe('pins rules', () => {
  it('every preset validates and bad rules are refused', () => {
    for (const p of presets) expect(pinsRules.validate({ ...p.rules })).toBeNull()
    expect(pinsRules.validate({ ...presets[0].rules, op: 'subtract' })).toMatch(/addition/)
    expect(pinsRules.validate({ ...presets[0].rules, pins: 7 as PinsRules['pins'] })).toMatch(/6 or 10/)
    expect(pinsRules.validate({ ...presets[0].rules, dice: 3 as PinsRules['dice'] })).toMatch(/1 or 2/)
  })

  it('pins the bond core to the rack so describeRules reads sensibly', () => {
    const r = { ...presets[2].rules, min: 4, max: 99 }
    pinsRules.validate(r)
    expect([r.op, r.min, r.max, r.maxResult, r.step]).toEqual(['add', 1, 10, 12, 1])
  })
})

describe('pins rack', () => {
  it('lays ten pins out like a bowling rack and six as a smaller triangle', () => {
    expect(rackRows(10)).toEqual([[7, 8, 9, 10], [4, 5, 6], [2, 3], [1]])
    expect(rackRows(6)).toEqual([[4, 5, 6], [2, 3], [1]])
  })
})

describe('pins generator', () => {
  it('knows what a rack can make', () => {
    expect(achievable([1, 2, 3], { dice: 1, allowDifference: false })).toEqual([1, 2, 3, 4, 5])
    expect(achievable([1, 2, 3], { dice: 2, allowDifference: false })).toEqual([2, 3, 4, 5])
    expect(achievable([7, 10], { dice: 1, allowDifference: false })).toEqual([])
    expect(achievable([7, 10], { dice: 1, allowDifference: true })).toEqual([3])
    expect(achievable([], { dice: 1, allowDifference: true })).toEqual([])
    expect(waysToMake(5, [1, 2, 3, 4, 5, 7], { allowDifference: false })).toEqual([[5], [1, 4], [2, 3]])
    expect(waysToMake(5, [2, 7], { allowDifference: true })).toEqual([[2, 7]])
  })

  it('returns null when the standing pins cannot make any roll', () => {
    expect(generateRoll(mulberry32(1), presets[1].rules, [])).toBeNull()
    expect(generateRoll(mulberry32(1), presets[2].rules, [1])).toBeNull()
    expect(generateRoll(mulberry32(1), presets[0].rules, [7, 9])).toBeNull()
  })

  for (const p of presets) {
    it(`${p.id}: every roll over 300 seeds is achievable from the standing pins and the dice are real faces`, () => {
      const [lo, hi] = rollRange(p.rules.dice)
      for (let seed = 1; seed <= 300; seed++) {
        const standing = someStanding(seed, p.rules.pins)
        const puzzle = generateRoll(mulberry32(seed), p.rules, standing)
        if (!puzzle) {
          expect(achievable(standing, p.rules)).toEqual([])
          continue
        }
        expect(puzzle.roll).toBeGreaterThanOrEqual(lo)
        expect(puzzle.roll).toBeLessThanOrEqual(hi)
        expect(waysToMake(puzzle.roll, standing, p.rules).length).toBeGreaterThan(0)
        expect(puzzle.dice).toHaveLength(p.rules.dice)
        for (const face of puzzle.dice) {
          expect(face).toBeGreaterThanOrEqual(1)
          expect(face).toBeLessThanOrEqual(6)
        }
        expect(puzzle.dice.reduce((a, b) => a + b, 0)).toBe(puzzle.roll)
        expect(puzzle.pins).toEqual([...standing].sort((a, b) => a - b))
      }
    })
  }

  it('is reproducible for a seed and varies across seeds', () => {
    const r = presets[2].rules
    const all = allPins(10)
    expect(generateRoll(mulberry32(42), r, all)).toEqual(generateRoll(mulberry32(42), r, all))
    const rolls = new Set<number>()
    for (let seed = 1; seed <= 60; seed++) rolls.add(generateRoll(mulberry32(seed), r, all)!.roll)
    expect(rolls.size).toBeGreaterThan(5)
  })
})
