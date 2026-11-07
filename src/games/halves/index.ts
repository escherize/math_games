import type { Cartridge } from '../../engine/cartridge'
import { mountHalves } from './game'
import { halvesRules, type HalvesRules } from './rules'

export const halves: Cartridge<HalvesRules> = {
  id: 'halves',
  title: 'Halves',
  tagline: 'A row of blocks and a cutter. Slide it until both sides weigh the same.',
  skill: 'number-bonds',
  rules: halvesRules,
  prompt: (r) => (r.allowOdd ? 'Slide the cutter so both sides match. One block may be left over.' : 'Slide the cutter so both sides have the same number of blocks.'),
  mount: mountHalves,
}
