import type { Cartridge } from '../../engine/cartridge'
import { mountHidden } from './game'
import { hiddenRules, type HiddenRules } from './rules'

export const hidden: Cartridge<HiddenRules> = {
  id: 'hidden',
  title: 'Hidden Bonds',
  tagline: 'One number, a row of dots. Slide the divider to find every way it splits.',
  skill: 'number-bonds',
  rules: hiddenRules,
  prompt: (r) => (r.bondsRequired > 0 ? `Slide the divider to show ${r.bondsRequired} different ways to split the number.` : 'Slide the divider to show every way to split the number.'),
  mount: mountHidden,
}
