import { describe, expect, it } from 'vitest'
import { isFast } from './scoring'

describe('isFast', () => {
  it('needs both speed and no wrong taps', () => {
    expect(isFast({ ms: 12000, wrong: 0 }, 20)).toBe(true)
    expect(isFast({ ms: 20000, wrong: 0 }, 20)).toBe(true)
    expect(isFast({ ms: 20001, wrong: 0 }, 20)).toBe(false)
    expect(isFast({ ms: 3000, wrong: 1 }, 20)).toBe(false)
  })
})
