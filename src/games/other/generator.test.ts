import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../../engine/rng'
import { generatePuzzle, helpfulSplit, pairsOf, splitsOf } from './generator'
import { otherRules, presets } from './rules'

describe('the other number rules', () => {
  it('lists the splits of b and the one that completes a to ten', () => {
    expect(splitsOf(4)).toEqual([{ p: 1, q: 3 }, { p: 2, q: 2 }])
    expect(splitsOf(6)).toEqual([{ p: 1, q: 5 }, { p: 2, q: 4 }, { p: 3, q: 3 }])
    expect(helpfulSplit(8, 6)).toEqual({ p: 2, q: 4 })
    expect(helpfulSplit(6, 5)).toEqual({ p: 1, q: 4 })
    expect(helpfulSplit(7, 4)).toEqual({ p: 1, q: 3 })
  })

  it('lists only pairs that cross ten, fit the largest sum and give b two or more splits', () => {
    expect(pairsOf({ minA: 9, maxA: 9, maxSum: 14 })).toEqual([[9, 4], [9, 5]])
    expect(pairsOf({ minA: 6, maxA: 6, maxSum: 12 })).toEqual([[6, 5], [6, 6]])
    expect(pairsOf({ minA: 9, maxA: 9, maxSum: 12 })).toEqual([])
    for (const [a, b] of pairsOf({ minA: 6, maxA: 9, maxSum: 18 })) {
      expect(a + b).toBeGreaterThan(10)
      expect(a + b).toBeLessThanOrEqual(18)
      expect(splitsOf(b).length).toBeGreaterThanOrEqual(2)
    }
  })

  it('every preset validates and bad rules are refused', () => {
    for (const p of presets) expect(otherRules.validate(p.rules)).toBeNull()
    const r = presets[1].rules
    expect(otherRules.validate({ ...r, op: 'subtract' })).toMatch(/addition/)
    expect(otherRules.validate({ ...r, minA: 5 })).toMatch(/between 6 and 9/)
    expect(otherRules.validate({ ...r, maxA: 10 })).toMatch(/between 6 and 9/)
    expect(otherRules.validate({ ...r, minA: 9, maxA: 7 })).toMatch(/exceed/)
    expect(otherRules.validate({ ...r, maxSum: 11 })).toMatch(/Largest sum/)
    expect(otherRules.validate({ ...r, maxSum: 19 })).toMatch(/Largest sum/)
    expect(otherRules.validate({ ...r, options: 4 as unknown as 3 })).toMatch(/2 or 3/)
    expect(otherRules.validate({ ...r, minA: 9, maxA: 9, maxSum: 12 })).toMatch(/No sum crosses ten/)
  })
})

describe('the other number generator', () => {
  for (const p of presets) {
    it(`${p.id}: one helpful split, every option a true split of b, the sum crosses ten within the cap`, () => {
      const r = p.rules
      for (let seed = 1; seed <= 300; seed++) {
        const z = generatePuzzle(mulberry32(seed), r)
        expect(z).toEqual(generatePuzzle(mulberry32(seed), r))
        expect(z.a).toBeGreaterThanOrEqual(r.minA)
        expect(z.a).toBeLessThanOrEqual(r.maxA)
        expect(z.a + z.b).toBeGreaterThan(10)
        expect(z.a + z.b).toBeLessThanOrEqual(r.maxSum)
        expect(z.options.length).toBe(Math.min(r.options, splitsOf(z.b).length))
        expect(z.options.length).toBeGreaterThanOrEqual(2)
        expect(new Set(z.options.map((s) => `${s.p}|${s.q}`)).size).toBe(z.options.length)
        for (const s of z.options) {
          expect(s.p + s.q).toBe(z.b)
          expect(s.p).toBeGreaterThanOrEqual(1)
          expect(s.p).toBeLessThanOrEqual(s.q)
        }
        expect(z.options.filter((s) => s.p === 10 - z.a || s.q === 10 - z.a)).toHaveLength(1)
        if (r.askTotal) {
          expect(z.totals).toHaveLength(3)
          expect(new Set(z.totals).size).toBe(3)
          expect(z.totals).toContain(z.a + z.b)
          for (const t of z.totals) {
            expect(t).toBeGreaterThanOrEqual(11)
            expect(t).toBeLessThanOrEqual(20)
            expect(Math.abs(t - (z.a + z.b))).toBeLessThanOrEqual(3)
          }
        } else expect(z.totals).toEqual([])
      }
    })
  }

  it('shuffles the helpful split through every position and reaches every pair', () => {
    const r = presets[1].rules
    const positions = new Set<number>()
    const keys = new Set<string>()
    for (let seed = 1; seed <= 300; seed++) {
      const z = generatePuzzle(mulberry32(seed), r)
      positions.add(z.options.findIndex((s) => s.p === 10 - z.a || s.q === 10 - z.a))
      keys.add(`${z.a}+${z.b}`)
    }
    expect(positions).toEqual(new Set([0, 1, 2]))
    expect(keys.size).toBe(pairsOf(r).length)
  })
})
