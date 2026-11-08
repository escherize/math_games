import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../../engine/rng'
import { generatePuzzle, kindsForValue } from './generator'
import { presets, tangaRules, type TangaRules } from './rules'

const values = (card: { value: number }[]) => card.map((p) => p.value)

describe('same number rules', () => {
  it('every preset validates', () => {
    for (const p of presets) expect(tangaRules.validate(p.rules)).toBeNull()
  })

  it('refuses rules it cannot play', () => {
    const r = presets[1].rules
    expect(tangaRules.validate({ ...r, op: 'subtract' })).toMatch(/addition/)
    expect(tangaRules.validate({ ...r, minN: 0 })).toMatch(/at least 1/)
    expect(tangaRules.validate({ ...r, maxN: 21 })).toMatch(/at most 20/)
    expect(tangaRules.validate({ ...r, minN: 8, maxN: 7 })).toMatch(/exceed/)
    expect(tangaRules.validate({ ...r, panels: 5 as unknown as 4 })).toMatch(/3 or 4/)
    expect(tangaRules.validate({ ...r, minN: 1, maxN: 6, panels: 4 })).toMatch(/at least 7 different numbers/)
    expect(tangaRules.validate({ ...r, minN: 1, maxN: 7, panels: 4 })).toBeNull()
    expect(tangaRules.validate({ ...r, minN: 1, maxN: 4, panels: 3 })).toMatch(/at least 5/)
    expect(tangaRules.validate({ ...r, minN: 1, maxN: 5, panels: 3 })).toBeNull()
  })

  it('offers a die only up to 6', () => {
    expect(kindsForValue(6)).toEqual(['numeral', 'die', 'tenframe', 'dots', 'tally'])
    expect(kindsForValue(7)).toEqual(['numeral', 'tenframe', 'dots', 'tally'])
  })
})

describe('same number generator', () => {
  const check = (r: TangaRules, seeds: number) => {
    for (let seed = 1; seed <= seeds; seed++) {
      const puzzle = generatePuzzle(mulberry32(seed), r)
      const [a, b] = puzzle.cards
      expect(a).toHaveLength(r.panels)
      expect(b).toHaveLength(r.panels)
      for (const p of [...a, ...b]) {
        expect(p.value).toBeGreaterThanOrEqual(r.minN)
        expect(p.value).toBeLessThanOrEqual(r.maxN)
        if (p.kind === 'die') expect(p.value).toBeLessThanOrEqual(6)
      }
      // Exactly one value is on both cards, and it is the shared one.
      const common = values(a).filter((v) => values(b).includes(v))
      expect(common).toEqual([puzzle.shared])
      expect(new Set(values(a)).size).toBe(r.panels)
      expect(new Set(values(b)).size).toBe(r.panels)
      // No picture repeats within a card; the shared value is drawn two ways.
      expect(new Set(a.map((p) => p.kind)).size).toBe(r.panels)
      expect(new Set(b.map((p) => p.kind)).size).toBe(r.panels)
      const twinA = a.find((p) => p.value === puzzle.shared)!
      const twinB = b.find((p) => p.value === puzzle.shared)!
      expect(twinA.kind).not.toBe(twinB.kind)
    }
  }

  for (const p of presets) {
    it(`${p.id}: one shared value drawn two ways, distinct pictures per card, die never past 6`, () => {
      check(p.rules, 300)
    })
  }

  it('fills the tightest range that validates', () => {
    check({ ...presets[1].rules, minN: 1, maxN: 7, panels: 4 }, 300)
    check({ ...presets[0].rules, minN: 1, maxN: 5, panels: 3 }, 300)
    check({ ...presets[2].rules, minN: 14, maxN: 20, panels: 4 }, 300)
  })

  it('uses every picture kind and every value over many seeds', () => {
    const kinds = new Set<string>()
    const shared = new Set<number>()
    for (let seed = 1; seed <= 300; seed++) {
      const puzzle = generatePuzzle(mulberry32(seed), presets[1].rules)
      shared.add(puzzle.shared)
      for (const p of [...puzzle.cards[0], ...puzzle.cards[1]]) kinds.add(p.kind)
    }
    expect([...kinds].sort()).toEqual(['die', 'dots', 'numeral', 'tally', 'tenframe'])
    expect(shared.size).toBe(10)
  })

  it('is reproducible for a given seed', () => {
    const r = presets[1].rules
    expect(generatePuzzle(mulberry32(42), r)).toEqual(generatePuzzle(mulberry32(42), r))
    expect(generatePuzzle(mulberry32(42), r)).not.toEqual(generatePuzzle(mulberry32(43), r))
  })
})
