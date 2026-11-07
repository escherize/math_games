import type { Cartridge } from './cartridge'
import type { PacedRules } from './rules'
import { balance } from '../games/balance'
import { bridge } from '../games/bridge'
import { hidden } from '../games/hidden'
import { kakooma } from '../games/kakooma'
import { lasso } from '../games/lasso'

/** Every Cartridge the hub offers. The hub paces rounds, so each needs PacingRules. */
export const games: Cartridge<PacedRules>[] = [kakooma, balance, bridge, lasso, hidden]

export function findGame(id: string): Cartridge<PacedRules> | undefined {
  return games.find((g) => g.id === id)
}
