import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../../engine/rng'
import { generatePuzzle } from './generator'
import { candidates, halvesRules, presets } from './rules'

describe('halves generator', () => {
  for (const p of presets) {
    it(`${p.id}: n within the range, even unless odd rows are allowed, parts split it`, () => {
      const r = p.rules
      for (let seed = 1; seed <= 200; seed++) {
        const z = generatePuzzle(mulberry32(seed), r)
        expect(z.n).toBeGreaterThanOrEqual(Math.max(2, r.minN))
        expect(z.n).toBeLessThanOrEqual(r.maxN)
        if (!r.allowOdd) expect(z.n % 2).toBe(0)
        expect(z.a + z.b).toBe(z.n)
        expect(z.b - z.a).toBeLessThanOrEqual(1)
      }
    })
  }

  it('never repeats the previous n when the range offers a choice', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const first = generatePuzzle(mulberry32(seed), presets[1].rules)
      const second = generatePuzzle(mulberry32(seed + 1), presets[1].rules, first.n)
      expect(second.n).not.toBe(first.n)
    }
    const only = { ...presets[0].rules, minN: 4, maxN: 4 }
    expect(generatePuzzle(mulberry32(3), only, 4).n).toBe(4)
  })

  it('offers odd rows only when allowed', () => {
    expect(candidates(presets[2].rules)).toContain(7)
    expect(candidates(presets[1].rules)).not.toContain(7)
    expect(candidates({ ...presets[0].rules, minN: 3, maxN: 3 })).toEqual([])
  })

  it('is deterministic per seed', () => {
    expect(generatePuzzle(mulberry32(7), presets[1].rules)).toEqual(generatePuzzle(mulberry32(7), presets[1].rules))
  })

  it('validates the range', () => {
    expect(halvesRules.validate(presets[0].rules)).toBeNull()
    expect(halvesRules.validate({ ...presets[0].rules, minN: 12, maxN: 10 })).toMatch(/exceed/)
    expect(halvesRules.validate({ ...presets[0].rules, maxN: 21 })).toMatch(/at most/)
    expect(halvesRules.validate({ ...presets[0].rules, minN: 3, maxN: 3 })).toMatch(/even/)
    expect(halvesRules.validate({ ...presets[0].rules, op: 'subtract' })).toMatch(/addition/)
  })
})
