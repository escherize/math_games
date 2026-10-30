/**
 * How a solved puzzle is judged beyond right/wrong.
 *
 * Speed only counts when it comes with accuracy: a puzzle solved quickly but
 * with a wrong tap along the way is not "fast", so guessing never pays.
 */

export interface PuzzleResult {
  /** ms from the puzzle being shown to its last correct tap. */
  ms: number
  /** Wrong taps on this puzzle. */
  wrong: number
}

/** Solved with no wrong taps, within `fastSeconds` of being shown. */
export function isFast(r: PuzzleResult, fastSeconds: number): boolean {
  return r.wrong === 0 && r.ms <= fastSeconds * 1000
}
