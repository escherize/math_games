import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../../engine/rng'
import { generatePuzzle } from './generator'
import { bondCount, hiddenRules, presets, splitKey, splitsOf } from './rules'

describe('hidden bonds rules', () => {
  it('counts the bonds a number has', () => {
    expect(splitsOf(5, { allowZero: false })).toEqual([1, 2, 3, 4])
    expect(splitsOf(5, { allowZero: true })).toEqual([0, 1, 2, 3, 4, 5])
    expect(bondCount(5, { allowZero: false, commutativeOnce: true })).toBe(2)
    expect(bondCount(6, { allowZero: false, commutativeOnce: true })).toBe(3)
    expect(bondCount(6, { allowZero: false, commutativeOnce: false })).toBe(5)
    expect(bondCount(6, { allowZero: true, commutativeOnce: true })).toBe(4)
    expect(splitKey(5, 3, { commutativeOnce: true })).toBe('3|5')
    expect(splitKey(5, 3, { commutativeOnce: false })).toBe('5|3')
  })

  it('every preset validates and refuses what it cannot play', () => {
    for (const p of presets) expect(hiddenRules.validate(p.rules)).toBeNull()
    expect(hiddenRules.validate({ ...presets[0].rules, op: 'subtract' })).toMatch(/addition/)
    expect(hiddenRules.validate({ ...presets[0].rules, minN: 3, bondsRequired: 2 })).toMatch(/does not have/)
    expect(hiddenRules.validate({ ...presets[0].rules, minN: 6, maxN: 5 })).toMatch(/exceed/)
  })
})

describe('hidden bonds generator', () => {
  it('is deterministic and keeps n and needed inside the rules', () => {
    for (const p of presets) {
      for (let i = 0; i < 40; i++) {
        const a = generatePuzzle(mulberry32(100 + i), p.rules)
        const b = generatePuzzle(mulberry32(100 + i), p.rules)
        expect(a).toEqual(b)
        expect(a.n).toBeGreaterThanOrEqual(p.rules.minN)
        expect(a.n).toBeLessThanOrEqual(p.rules.maxN)
        expect(a.needed).toBeGreaterThan(0)
        expect(a.needed).toBeLessThanOrEqual(bondCount(a.n, p.rules))
        if (p.rules.bondsRequired > 0) expect(a.needed).toBe(p.rules.bondsRequired)
        else expect(a.needed).toBe(bondCount(a.n, p.rules))
      }
    }
  })
})
