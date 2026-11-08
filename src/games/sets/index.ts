import type { Cartridge } from '../../engine/cartridge'
import { mountSets } from './game'
import { setsRules, type SetsRules } from './rules'

export const sets: Cartridge<SetsRules> = {
  id: 'sets',
  title: 'Three Together',
  tagline: 'Nine numbers. Tap three where two of them make the third.',
  skill: 'number-bonds',
  rules: setsRules,
  prompt: (r) =>
    r.setsRequired === 1 ? 'Tap three numbers where two of them make the third.' : `Find ${r.setsRequired} groups of three where two numbers make the third.`,
  mount: mountSets,
}
