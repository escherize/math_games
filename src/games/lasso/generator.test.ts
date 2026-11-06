import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../../engine/rng'
import { generatePuzzle, GROUP_GAP, MIN_DIST, RADIUS, VIEW_H, VIEW_W } from './generator'
import { presets } from './rules'

describe('lasso generator', () => {
  for (const p of presets) {
    it(`${p.id}: n within bounds, n dots inside the viewBox, spaced apart, ten apart from the rest`, () => {
      for (let seed = 1; seed <= 200; seed++) {
        const puzzle = generatePuzzle(mulberry32(seed), p.rules)
        expect(puzzle.n).toBeGreaterThanOrEqual(p.rules.minCount)
        expect(puzzle.n).toBeLessThanOrEqual(p.rules.maxCount)
        expect(puzzle.dots).toHaveLength(puzzle.n)
        for (const d of puzzle.dots) {
          expect(d.x).toBeGreaterThanOrEqual(RADIUS)
          expect(d.x).toBeLessThanOrEqual(VIEW_W - RADIUS)
          expect(d.y).toBeGreaterThanOrEqual(RADIUS)
          expect(d.y).toBeLessThanOrEqual(VIEW_H - RADIUS)
        }
        for (let i = 0; i < puzzle.dots.length; i++)
          for (let j = i + 1; j < puzzle.dots.length; j++) {
            const a = puzzle.dots[i]
            const b = puzzle.dots[j]
            const dist = Math.hypot(a.x - b.x, a.y - b.y)
            expect(dist).toBeGreaterThanOrEqual(MIN_DIST - 1e-9)
            if (i < 10 && j >= 10) expect(dist - 2 * RADIUS).toBeGreaterThanOrEqual(GROUP_GAP - 1e-9)
          }
      }
    })
  }

  it('is deterministic for a seed', () => {
    const a = generatePuzzle(mulberry32(7), presets[2].rules)
    const b = generatePuzzle(mulberry32(7), presets[2].rules)
    expect(a).toEqual(b)
    expect(generatePuzzle(mulberry32(8), presets[2].rules)).not.toEqual(a)
  })

  it('rows puts the ten in one line above the rest', () => {
    const puzzle = generatePuzzle(mulberry32(3), presets[0].rules)
    const ys = new Set(puzzle.dots.slice(0, 10).map((d) => d.y))
    expect(ys.size).toBe(1)
    for (const d of puzzle.dots.slice(10)) expect(d.y).toBeGreaterThan(puzzle.dots[0].y)
  })
})
