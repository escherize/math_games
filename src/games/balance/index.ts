import type { Cartridge } from '../../engine/cartridge'
import { mountBalance } from './game'
import { balanceRules, type BalanceRules } from './rules'

export const balance: Cartridge<BalanceRules> = {
  id: 'balance',
  title: 'Balance Scale',
  tagline: 'The whole on one pan, a part on the other. Drag the number that levels the beam.',
  skill: 'number-bonds',
  rules: balanceRules,
  prompt: () => 'Drag the number that makes the two sides balance.',
  mount: mountBalance,
}
