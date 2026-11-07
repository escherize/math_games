/**
 * The library entry: what another Console (Math Wiz) imports.
 *
 * `npm run build:lib` writes dist-lib/mathgames.js, one ES module with every
 * cartridge and its styles inside, plus dist-lib/types/. `npm run presets`
 * prints every cartridge's presets as JSON for a host's seed generator.
 */
export type { Cartridge, CartridgeEvent, CartridgeHandle, Console } from './engine/cartridge'
export type { BondRules, Operation, PacedRules, PacingRules, Preset, RulesSpec } from './engine/rules'
export { bondKey, describeRules, operations } from './engine/rules'
export { findGame, games } from './engine/registry'
export { kakooma } from './games/kakooma'
export type { KakoomaRules } from './games/kakooma/rules'
export { balance } from './games/balance'
export type { BalanceRules } from './games/balance/rules'
export { bridge } from './games/bridge'
export type { BridgeRules } from './games/bridge/rules'
export { lasso } from './games/lasso'
export type { LassoRules } from './games/lasso/rules'
export { builder } from './games/builder'
export type { BuilderRules } from './games/builder/rules'

import { games } from './engine/registry'

/** The git sha this library was built from ('dev' in development). */
export const version: string = __MG_VERSION__

export interface PresetExport {
  id: string
  title: string
  skill: string
  presets: Array<{ id: string; name: string; rules: Record<string, unknown> }>
}

/** Every cartridge's presets, as plain data a host can turn into its own content. */
export function presets(): PresetExport[] {
  return games.map((g) => ({
    id: g.id,
    title: g.title,
    skill: g.skill,
    presets: g.rules.presets.map((p) => ({ id: p.id, name: p.name, rules: { ...p.rules } })),
  }))
}
