/**
 * The contract between a Console and a Cartridge.
 *
 * A Cartridge is one game's board. It takes rules and a seed from the
 * Console, owns its own input and the feedback under the finger, and reports
 * what happened. It never reads settings, writes stats, shows text or plays
 * sound: those belong to whichever Console mounted it (the hub here, Math Wiz
 * there). See CONTEXT.md and decision `cartridges-serve-any-console`.
 */
import type { BondRules, Preset, RulesSpec } from './rules'

export interface Console<R extends BondRules = BondRules> {
  /** Rules values. The Cartridge validates them against its RulesSpec at mount and throws if unplayable. */
  rules: R
  /** Puzzle i of the round is generated from `seed + i`, so a round can be replayed. */
  seed: number
  /** Puzzles in this round; Infinity for an open-ended run. Math Wiz passes 1. */
  puzzles: number
  /**
   * Keys (see the puzzle event) of puzzles this player has already seen, so a
   * Console that mounts one puzzle at a time can still avoid a repeat across
   * mounts. A Cartridge never repeats a key within its own round regardless.
   */
  avoid?: readonly string[]
  report(event: CartridgeEvent): void
}

export type CartridgeEvent =
  /** One tap on the board. `ms` is time since the puzzle was shown. */
  | { type: 'tap'; correct: boolean; fact: string; ms: number }
  /**
   * The current puzzle is solved. The board holds until the Console calls `next()`.
   * `key` names the puzzle as the child perceives it (the numbers, not the layout), stable across seeds; feed it back as `avoid`.
   */
  | { type: 'puzzle'; index: number; of: number; wrong: number; ms: number; response: string; key: string }

export interface CartridgeHandle {
  /** Show the next puzzle. True if one was shown; false before the current puzzle is solved or past the last one. */
  next(): boolean
  destroy(): void
}

export interface Cartridge<R extends BondRules = BondRules> {
  id: string
  title: string
  /** One line shown on the hub card. */
  tagline: string
  /** The skill the board drills; used to group stats. */
  skill: 'number-bonds'
  /** What a parent may tune, with presets. A Console supplies the values. */
  rules: RulesSpec<R>
  /** What to tell the player before the board, for these rules. Shown by the Console, not the board. */
  prompt(rules: R): string
  mount(container: HTMLElement, host: Console<R>): CartridgeHandle
}

/** A Cartridge's presets, in ladder order. The hub calls them Levels. */
export function presetsOf<R extends BondRules>(c: Cartridge<R>): Preset<R>[] {
  return c.rules.presets
}
