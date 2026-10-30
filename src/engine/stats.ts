/**
 * Player history, kept in localStorage.
 *
 * Two layers: sessions (one per game run) and facts (one per number bond,
 * e.g. "3+4"), so the hub can say both "you've played 12 times" and
 * "7+8 is the bond you miss most".
 */

export interface Session {
  gameId: string
  variant: string
  mode: string
  startedAt: number
  durationMs: number
  levelReached: number
  puzzlesSolved: number
  correct: number
  wrong: number
}

export interface FactRecord {
  seen: number
  correct: number
  /** Running mean of ms from puzzle shown to correct tap. */
  avgMs: number
}

export interface Attempt {
  /** Canonical fact key, e.g. "3+4". Addends sorted ascending. */
  fact: string
  correct: boolean
  ms: number
}

interface StatsData {
  version: 1
  sessions: Session[]
  facts: Record<string, FactRecord>
}

const KEY = 'math-games.stats.v1'

export function factKey(a: number, b: number, op: '+' | '×' = '+'): string {
  const [lo, hi] = a <= b ? [a, b] : [b, a]
  return `${lo}${op}${hi}`
}

export class StatsStore {
  private data: StatsData

  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'> | null = safeLocalStorage()) {
    this.data = this.load()
  }

  private load(): StatsData {
    try {
      const raw = this.storage?.getItem(KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as StatsData
        if (parsed.version === 1) return parsed
      }
    } catch {
      /* corrupt or unavailable storage: start fresh */
    }
    return { version: 1, sessions: [], facts: {} }
  }

  private save() {
    try {
      this.storage?.setItem(KEY, JSON.stringify(this.data))
    } catch {
      /* quota or private mode: stats are best-effort */
    }
  }

  recordAttempt(att: Attempt) {
    const f = this.data.facts[att.fact] ?? { seen: 0, correct: 0, avgMs: 0 }
    f.seen += 1
    if (att.correct) {
      f.avgMs = f.avgMs + (att.ms - f.avgMs) / (f.correct + 1)
      f.correct += 1
    }
    this.data.facts[att.fact] = f
    this.save()
  }

  recordSession(s: Session) {
    this.data.sessions.push(s)
    this.save()
  }

  get sessions(): readonly Session[] {
    return this.data.sessions
  }

  get facts(): Readonly<Record<string, FactRecord>> {
    return this.data.facts
  }

  summary(gameId?: string) {
    const ss = gameId ? this.data.sessions.filter((s) => s.gameId === gameId) : this.data.sessions
    const plays = ss.length
    const puzzles = ss.reduce((n, s) => n + s.puzzlesSolved, 0)
    const correct = ss.reduce((n, s) => n + s.correct, 0)
    const wrong = ss.reduce((n, s) => n + s.wrong, 0)
    const bestLevel = ss.reduce((m, s) => Math.max(m, s.levelReached), 0)
    const accuracy = correct + wrong ? correct / (correct + wrong) : null
    return { plays, puzzles, correct, wrong, bestLevel, accuracy, streakDays: this.streakDays(ss) }
  }

  /** Consecutive calendar days ending today (or yesterday) with at least one session. */
  private streakDays(ss: readonly Session[]): number {
    const days = new Set(ss.map((s) => dayKey(s.startedAt)))
    if (days.size === 0) return 0
    let cursor = new Date()
    if (!days.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1)
    let streak = 0
    while (days.has(dayKey(cursor.getTime()))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }
    return streak
  }

  /** Facts seen at least `minSeen` times, sorted weakest first. */
  weakestFacts(limit = 5, minSeen = 2) {
    return Object.entries(this.data.facts)
      .filter(([, f]) => f.seen >= minSeen)
      .map(([fact, f]) => ({ fact, ...f, accuracy: f.correct / f.seen }))
      .sort((a, b) => a.accuracy - b.accuracy || b.avgMs - a.avgMs)
      .slice(0, limit)
  }

  reset() {
    this.data = { version: 1, sessions: [], facts: {} }
    this.save()
  }
}

function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}
