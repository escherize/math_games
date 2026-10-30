import type { BondRules, RulesSpec } from './rules'
import type { StatsStore } from './stats'

/** Every game in the hub implements this. The hub mounts it into a container and tears it down on exit. */
export interface GameDefinition {
  id: string
  title: string
  /** One line shown on the hub card. */
  tagline: string
  /** The skill the game drills; used to group stats. */
  skill: 'number-bonds'
  /** Parent-configurable rules. The hub renders the settings screen from this. */
  rules: RulesSpec<BondRules>
  mount(container: HTMLElement, ctx: GameContext): GameInstance
}

export interface GameContext {
  stats: StatsStore
  /** Return to the hub. */
  exit(): void
}

export interface GameInstance {
  destroy(): void
}
