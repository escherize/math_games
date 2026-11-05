import type { Cartridge } from '../../engine/cartridge'
import { mountKakooma } from './game'
import { kakoomaRules, type KakoomaRules } from './rules'

const PROMPTS: Record<KakoomaRules['op'], string> = {
  add: 'In each pod, tap the number that is the sum of two others.',
  subtract: 'In each pod, tap a number that is the difference of two others.',
  multiply: 'In each pod, tap the number that is the product of two others.',
  divide: 'In each pod, tap a number that is the quotient of two others.',
  power: 'In each pod, tap the number that is one number raised to another.',
}

export const kakooma: Cartridge<KakoomaRules> = {
  id: 'kakooma',
  title: 'Kakooma',
  tagline: "Find the number that two others make. Greg Tang's puzzle, every bond you need.",
  skill: 'number-bonds',
  rules: kakoomaRules,
  prompt: (r) => PROMPTS[r.op],
  mount: mountKakooma,
}
