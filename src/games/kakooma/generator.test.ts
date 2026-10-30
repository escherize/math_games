import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../../engine/rng'
import { combine, operations } from '../../engine/rules'
import { generatePuzzle, maxFeasiblePodSize, solutions } from './generator'
import { presets } from './rules'

describe('kakooma generator', () => {
  for (const p of presets) {
    it(`${p.id}: pods have exactly one bond, distinct in-range cells, correct targets`, () => {
      const r = p.rules
      const info = operations[r.op]
      for (let seed = 1; seed <= 40; seed++) {
        const puzzle = generatePuzzle(mulberry32(seed), r, { podCount: r.podCount, podSize: r.podSize })
        expect(puzzle.pods).toHaveLength(r.podCount)
        for (const pod of puzzle.pods) {
          expect(pod.cells).toHaveLength(r.podSize)
          expect(new Set(pod.cells).size).toBe(pod.cells.length)
          expect(solutions(pod.cells, r.op)).toHaveLength(1)
          const [i, j] = pod.parts
          expect(pod.cells[pod.whole]).toBe(combine(info.base, pod.cells[i], pod.cells[j]))
          if (r.maxResult > 0) expect(pod.cells[pod.whole]).toBeLessThanOrEqual(r.maxResult)
          expect(pod.targets).toEqual(info.target === 'whole' ? [pod.whole] : [i, j])
          for (const idx of pod.parts) {
            expect(pod.cells[idx]).toBeGreaterThanOrEqual(r.min)
            expect(pod.cells[idx]).toBeLessThanOrEqual(r.max)
            expect(pod.cells[idx] % r.step).toBe(0)
          }
        }
      }
    })
  }

  it('is reproducible for a given seed', () => {
    const r = presets[2].rules
    const a = generatePuzzle(mulberry32(42), r, { podCount: 4, podSize: 4 })
    const b = generatePuzzle(mulberry32(42), r, { podCount: 4, podSize: 4 })
    expect(a).toEqual(b)
  })

  it('finds the tangmath example answers', () => {
    expect(solutions([9, 1, 10, 4], 'add')).toEqual([{ whole: 2, parts: [0, 1] }])
    expect(solutions([5, 4, 6, 9], 'add')).toEqual([{ whole: 3, parts: [0, 1] }])
    expect(solutions([3, 5, 2, 9], 'add')).toEqual([{ whole: 1, parts: [0, 2] }])
    expect(solutions([1, 4, 7, 8], 'add')).toEqual([{ whole: 3, parts: [0, 2] }])
  })

  it('treats exponents as ordered', () => {
    expect(solutions([2, 3, 8], 'power')).toEqual([{ whole: 2, parts: [0, 1] }])
    expect(solutions([2, 3, 9], 'power')).toEqual([{ whole: 2, parts: [1, 0] }])
  })

  it('reports feasible pod sizes', () => {
    expect(maxFeasiblePodSize({ op: 'add', min: 1, max: 9, maxResult: 10, step: 1 })).toBeLessThan(9)
    expect(maxFeasiblePodSize({ op: 'add', min: 1, max: 9, maxResult: 10, step: 1 })).toBeGreaterThanOrEqual(4)
    expect(maxFeasiblePodSize({ op: 'add', min: 1, max: 99, maxResult: 100, step: 1 })).toBe(9)
    expect(maxFeasiblePodSize({ op: 'add', min: 1, max: 1, maxResult: 2, step: 1 })).toBe(0)
    expect(maxFeasiblePodSize({ op: 'add', min: 1, max: 3, maxResult: 6, step: 1 })).toBeGreaterThanOrEqual(4)
  })
})
