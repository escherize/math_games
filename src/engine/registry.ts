import type { Cartridge } from './cartridge'
import type { PacedRules } from './rules'
import { kakooma } from '../games/kakooma'

/** Every Cartridge the hub offers. The hub paces rounds, so each needs PacingRules. */
export const games: Cartridge<PacedRules>[] = [kakooma]

export function findGame(id: string): Cartridge<PacedRules> | undefined {
  return games.find((g) => g.id === id)
}
