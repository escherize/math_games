import type { Cartridge } from './cartridge'
import type { PacedRules } from './rules'
import { balance } from '../games/balance'
import { bridge } from '../games/bridge'
import { builder } from '../games/builder'
import { halves } from '../games/halves'
import { hidden } from '../games/hidden'
import { kakooma } from '../games/kakooma'
import { lasso } from '../games/lasso'
import { other } from '../games/other'
import { pairs } from '../games/pairs'
import { pins } from '../games/pins'
import { sets } from '../games/sets'
import { tanga } from '../games/tanga'

/** Every Cartridge the hub offers. The hub paces rounds, so each needs PacingRules. */
export const games: Cartridge<PacedRules>[] = [kakooma, balance, bridge, lasso, hidden, builder, halves, tanga, other, pairs, sets, pins]

export function findGame(id: string): Cartridge<PacedRules> | undefined {
  return games.find((g) => g.id === id)
}
