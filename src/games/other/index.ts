import type { Cartridge } from '../../engine/cartridge'
import { mountOther } from './game'
import { otherRules, type OtherRules } from './rules'

export const other: Cartridge<OtherRules> = {
  id: 'other',
  title: 'The Other Number',
  tagline: '8 + 6: which way to split the 6 makes a ten? Ask the other number.',
  skill: 'number-bonds',
  rules: otherRules,
  prompt: (r) => (r.askTotal ? 'Tap the split that makes a ten, then tap the total.' : 'Tap the split that makes a ten.'),
  mount: mountOther,
}
