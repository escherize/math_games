import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../../engine/rng'
import { generatePuzzle } from './generator'
import { presets } from './rules'

describe('bridge generator', () => {
  for (const p of presets) {
    it(`${p.id}: a in 6..9, b in 2..9, sum within bounds, the sum offered exactly once among three`, () => {
      for (let seed = 1; seed <= 200; seed++) {
        const z = generatePuzzle(mulberry32(seed), p.rules)
        expect(z.a).toBeGreaterThanOrEqual(6)
        expect(z.a).toBeLessThanOrEqual(9)
        expect(z.b).toBeGreaterThanOrEqual(2)
        expect(z.b).toBeLessThanOrEqual(9)
        expect(z.a + z.b).toBe(z.sum)
        expect(z.sum).toBeGreaterThanOrEqual(p.rules.minSum)
        expect(z.sum).toBeLessThanOrEqual(p.rules.maxSum)
        expect(z.choices).toHaveLength(3)
        expect(new Set(z.choices).size).toBe(3)
        expect(z.choices.filter((n) => n === z.sum)).toHaveLength(1)
        for (const n of z.choices) {
          expect(Math.abs(n - z.sum)).toBeLessThanOrEqual(2)
          expect(n).toBeGreaterThanOrEqual(11)
        }
      }
    })
  }

  it('is deterministic for a seed', () => {
    expect(generatePuzzle(mulberry32(7), presets[1].rules)).toEqual(generatePuzzle(mulberry32(7), presets[1].rules))
  })
})
