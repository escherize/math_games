import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../../engine/rng'
import { generatePuzzle } from './generator'
import { presets } from './rules'

describe('balance generator', () => {
  for (const p of presets) {
    it(`${p.id}: whole within bounds, both parts in range, exactly one correct tile`, () => {
      const r = p.rules
      for (let seed = 1; seed <= 200; seed++) {
        const z = generatePuzzle(mulberry32(seed), r)
        expect(z.whole).toBeGreaterThanOrEqual(Math.max(r.minResult, 2 * r.min))
        expect(z.whole).toBeLessThanOrEqual(r.maxResult)
        expect(z.part + z.missing).toBe(z.whole)
        for (const v of [z.part, z.missing]) {
          expect(v).toBeGreaterThanOrEqual(r.min)
          expect(v).toBeLessThanOrEqual(r.max)
        }
        expect(z.tray).toHaveLength(r.tray)
        expect(new Set(z.tray).size).toBe(r.tray)
        expect(z.tray.filter((v) => v === z.missing)).toHaveLength(1)
        for (const v of z.tray) {
          expect(v).toBeGreaterThanOrEqual(r.min)
          expect(v).toBeLessThanOrEqual(r.max)
        }
      }
    })
  }

  it('is deterministic per seed', () => {
    expect(generatePuzzle(mulberry32(7), presets[1].rules)).toEqual(generatePuzzle(mulberry32(7), presets[1].rules))
    expect(generatePuzzle(mulberry32(7), presets[1].rules)).not.toEqual(generatePuzzle(mulberry32(8), presets[1].rules))
  })
})
