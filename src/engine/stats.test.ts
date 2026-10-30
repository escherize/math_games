import { describe, expect, it } from 'vitest'
import { StatsStore, factKey } from './stats'

function memStorage() {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
}

describe('StatsStore', () => {
  it('canonicalises fact keys', () => {
    expect(factKey(7, 3)).toBe('3+7')
    expect(factKey(3, 7)).toBe('3+7')
    expect(factKey(6, 4, '×')).toBe('4×6')
  })

  it('tracks attempts per fact with running mean time', () => {
    const s = new StatsStore(memStorage())
    s.recordAttempt({ fact: '3+4', correct: true, ms: 1000 })
    s.recordAttempt({ fact: '3+4', correct: false, ms: 500 })
    s.recordAttempt({ fact: '3+4', correct: true, ms: 3000 })
    expect(s.facts['3+4']).toEqual({ seen: 3, correct: 2, avgMs: 2000 })
  })

  it('persists across instances and summarises sessions', () => {
    const storage = memStorage()
    const a = new StatsStore(storage)
    a.recordSession({ gameId: 'kakooma', variant: 'addwithin10', mode: 'challenge', startedAt: Date.now(), durationMs: 60000, puzzlesSolved: 3, correct: 12, wrong: 2, fast: 1 })
    const b = new StatsStore(storage)
    const sum = b.summary('kakooma')
    expect(sum.plays).toBe(1)
    expect(sum.puzzles).toBe(3)
    expect(sum.bestRun).toBe(3)
    expect(sum.fast).toBe(1)
    expect(sum.accuracy).toBeCloseTo(12 / 14)
    expect(sum.streakDays).toBe(1)
  })

  it('keeps the best stars per level and persists them', () => {
    const storage = memStorage()
    const a = new StatsStore(storage)
    a.recordLevel('addto3', 2)
    a.recordLevel('addto3', 1)
    a.recordLevel('addto5', 3)
    const b = new StatsStore(storage)
    expect(b.levelStars('addto3')).toBe(2)
    expect(b.levelStars('addto5')).toBe(3)
    expect(b.levelStars('never')).toBe(0)
    expect(b.totalStars()).toBe(5)
  })

  it('reads a stats blob saved before levels existed', () => {
    const storage = memStorage()
    storage.setItem('math-games.stats.v1', JSON.stringify({ version: 1, sessions: [], facts: {} }))
    const s = new StatsStore(storage)
    expect(s.totalStars()).toBe(0)
    s.recordLevel('addto3', 1)
    expect(s.levelStars('addto3')).toBe(1)
  })

  it('ranks weakest facts', () => {
    const s = new StatsStore(memStorage())
    for (let i = 0; i < 3; i++) s.recordAttempt({ fact: '2+2', correct: true, ms: 800 })
    s.recordAttempt({ fact: '7+8', correct: false, ms: 0 })
    s.recordAttempt({ fact: '7+8', correct: true, ms: 4000 })
    expect(s.weakestFacts(1)[0].fact).toBe('7+8')
  })
})
