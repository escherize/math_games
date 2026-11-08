import type { Cartridge } from '../../engine/cartridge'
import { mountPairs } from './game'
import { pairsRules, type PairsRules } from './rules'

export const pairs: Cartridge<PairsRules> = {
  id: 'pairs',
  title: 'Pairs',
  tagline: 'A grid of numbers. Tap every two that make the target; the board empties.',
  skill: 'number-bonds',
  rules: pairsRules,
  prompt: (r) => `Tap two numbers that make ${r.target}. Find every pair.`,
  mount: mountPairs,
}
