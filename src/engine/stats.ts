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
  puzzlesSolved: number
  correct: number
  wrong: number
  /** Puzzles solved fast and flawless (see engine/scoring). */
  fast: number
  /** The level this run was, if it was a level rather than free play. */
  levelId?: string
}

export interface LevelRecord {
  /** Best stars earned on this level. */
  stars: number
  /** Completed rounds on this level. */
  plays: number
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
  levels: Record<string, LevelRecord>
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
        if (parsed.version === 1) return { ...parsed, levels: parsed.levels ?? {} }
      }
    } catch {
      /* corrupt or unavailable storage: start fresh */
    }
    return { version: 1, sessions: [], facts: {}, levels: {} }
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

  /** A completed level round: keeps the best stars and counts the play. */
  recordLevel(levelId: string, stars: number) {
    const l = this.data.levels[levelId] ?? { stars: 0, plays: 0 }
    l.plays += 1
    l.stars = Math.max(l.stars, stars)
    this.data.levels[levelId] = l
    this.save()
  }

  levelStars(levelId: string): number {
    return this.data.levels[levelId]?.stars ?? 0
  }

  totalStars(): number {
    return Object.values(this.data.levels).reduce((n, l) => n + l.stars, 0)
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
    const fast = ss.reduce((n, s) => n + (s.fast ?? 0), 0)
    const bestRun = ss.filter((s) => s.mode === 'challenge').reduce((m, s) => Math.max(m, s.puzzlesSolved), 0)
    const accuracy = correct + wrong ? correct / (correct + wrong) : null
    return { plays, puzzles, correct, wrong, fast, bestRun, accuracy, streakDays: this.streakDays(ss) }
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
    this.data = { version: 1, sessions: [], facts: {}, levels: {} }
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
