import type { Cartridge } from '../../engine/cartridge'
import { mountTanga } from './game'
import { tangaRules, type TangaRules } from './rules'

export const tanga: Cartridge<TangaRules> = {
  id: 'tanga',
  title: 'Same Number',
  tagline: 'Two cards, pictures of numbers. Tap the number that is on both.',
  skill: 'number-bonds',
  rules: tangaRules,
  prompt: () => 'Tap the number that is on both cards.',
  mount: mountTanga,
}
