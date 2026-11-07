import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../../engine/rng'
import { generatePuzzle, valueAt } from './generator'
import { presets } from './rules'

describe('builder generator', () => {
  for (const p of presets) {
    it(`${p.id}: distinct triangles that add up, the right blanks, a tray of exactly the missing numerals`, () => {
      const r = p.rules
      for (let seed = 1; seed <= 200; seed++) {
        const z = generatePuzzle(mulberry32(seed), r)
        expect(z.triangles).toHaveLength(r.triangles)
        const keys = new Set(z.triangles.map((t) => `${t.whole}:${Math.min(...t.parts)}`))
        expect(keys.size).toBe(r.triangles)
        const missing: number[] = []
        for (const t of z.triangles) {
          expect(t.whole).toBeGreaterThanOrEqual(3)
          expect(t.whole).toBeLessThanOrEqual(r.maxWhole)
          expect(t.parts[0] + t.parts[1]).toBe(t.whole)
          expect(Math.min(...t.parts)).toBeGreaterThanOrEqual(1)
          expect(t.blanks).toHaveLength(r.blanksPer)
          if (r.blanksPer === 2) expect(t.blanks).toEqual([1, 2])
          for (const s of t.blanks) missing.push(valueAt(t, s))
        }
        expect(z.tray.slice().sort((a, b) => a - b)).toEqual(missing.sort((a, b) => a - b))
      }
    })
  }

  it('with one blank, the blank lands on every slot over many seeds', () => {
    const seen = new Set<number>()
    for (let seed = 1; seed <= 60; seed++) seen.add(generatePuzzle(mulberry32(seed), presets[0].rules).triangles[0].blanks[0])
    expect(seen).toEqual(new Set([0, 1, 2]))
  })

  it('is deterministic per seed', () => {
    expect(generatePuzzle(mulberry32(7), presets[2].rules)).toEqual(generatePuzzle(mulberry32(7), presets[2].rules))
    expect(generatePuzzle(mulberry32(7), presets[2].rules)).not.toEqual(generatePuzzle(mulberry32(8), presets[2].rules))
  })
})
