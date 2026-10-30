import { describe, expect, it } from 'vitest'
import { starString, starsFor, unlockedCount } from './levels'

describe('starsFor', () => {
  it('awards nothing for an abandoned or empty round', () => {
    expect(starsFor({ puzzles: 3, wrong: 0, fast: 3, completed: false })).toBe(0)
    expect(starsFor({ puzzles: 0, wrong: 0, fast: 0, completed: true })).toBe(0)
  })
  it('one star for finishing, two for flawless, three for flawless and all fast', () => {
    expect(starsFor({ puzzles: 5, wrong: 2, fast: 5, completed: true })).toBe(1)
    expect(starsFor({ puzzles: 5, wrong: 0, fast: 4, completed: true })).toBe(2)
    expect(starsFor({ puzzles: 5, wrong: 0, fast: 5, completed: true })).toBe(3)
  })
})

describe('unlockedCount', () => {
  const ids = ['a', 'b', 'c', 'd']
  it('always opens the first level', () => {
    expect(unlockedCount(ids, () => 0)).toBe(1)
  })
  it('opens one past the last starred level in sequence', () => {
    const stars: Record<string, number> = { a: 3, b: 1 }
    expect(unlockedCount(ids, (id) => stars[id] ?? 0)).toBe(3)
  })
  it('does not skip over an unstarred level', () => {
    const stars: Record<string, number> = { a: 1, c: 3 }
    expect(unlockedCount(ids, (id) => stars[id] ?? 0)).toBe(2)
  })
  it('caps at the ladder length', () => {
    expect(unlockedCount(ids, () => 2)).toBe(4)
  })
})

describe('starString', () => {
  it('renders three slots', () => {
    expect(starString(0)).toBe('☆☆☆')
    expect(starString(2)).toBe('★★☆')
    expect(starString(3)).toBe('★★★')
  })
})
