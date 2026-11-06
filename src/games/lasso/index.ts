import type { Cartridge } from '../../engine/cartridge'
import { mountLasso } from './game'
import { lassoRules, type LassoRules } from './rules'

export const lasso: Cartridge<LassoRules> = {
  id: 'lasso',
  title: 'Lasso Ten',
  tagline: 'Loop exactly ten dots. What is left over are the ones: a teen is ten and some more.',
  skill: 'number-bonds',
  rules: lassoRules,
  prompt: () => 'Draw a loop around exactly ten dots. The rest are the ones.',
  mount: mountLasso,
}
