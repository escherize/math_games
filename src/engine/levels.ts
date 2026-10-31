/**
 * Levels: a game's preset ladder, climbed one Practice round at a time.
 *
 * A finished round earns up to three stars; the best per level is kept by
 * StatsStore. A level opens once the one before it has a star, so the hub
 * can show a path rather than a list.
 */

export interface RoundResult {
  /** Puzzles solved in the round. */
  puzzles: number
  /** Wrong taps over the whole round. */
  wrong: number
  /** Puzzles that were fast and flawless (engine/scoring). */
  fast: number
  /** The round reached its planned length (an abandoned round earns nothing). */
  completed: boolean
}

export type Stars = 0 | 1 | 2 | 3

/** ★ finished, ★★ no wrong taps, ★★★ no wrong taps and every puzzle fast. */
export function starsFor(r: RoundResult): Stars {
  if (!r.completed || r.puzzles === 0) return 0
  if (r.wrong > 0) return 1
  return r.fast >= r.puzzles ? 3 : 2
}

/**
 * How many levels from the front of `levelIds` are open: every level up to
 * and including the first one without a star.
 */
export function unlockedCount(levelIds: readonly string[], stars: (id: string) => number): number {
  let open = 0
  for (const id of levelIds) {
    open++
    if (stars(id) < 1) break
  }
  return open
}

export function starString(n: number): string {
  return '★'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n))
}
