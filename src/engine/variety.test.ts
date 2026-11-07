import { describe, expect, it } from 'vitest'
import { distinct } from './variety'
import { mulberry32, randInt, type Rng } from './rng'

describe('distinct', () => {
  const draw = (rng: Rng) => randInt(rng, 1, 3)
  const key = (n: number) => String(n)

  it('keeps the first draw when its key is unused', () => {
    const plain = draw(mulberry32(7 + 2))
    expect(distinct(7, 2, new Set(), draw, key)).toBe(plain)
  })

  it('walks past used keys and covers a small pool without repeats', () => {
    const used = new Set<string>()
    const seen: number[] = []
    for (let i = 0; i < 3; i++) {
      const p = distinct(7, i, used, draw, key)
      used.add(key(p))
      seen.push(p)
    }
    expect(new Set(seen).size).toBe(3)
  })

  it('returns a draw anyway once the pool is exhausted', () => {
    const used = new Set(['1', '2', '3'])
    const p = distinct(7, 0, used, draw, key, 5)
    expect([1, 2, 3]).toContain(p)
  })

  it('is deterministic for a seed and index', () => {
    const used = new Set<string>()
    expect(distinct(99, 2, used, draw, key)).toBe(distinct(99, 2, used, draw, key))
  })
})
