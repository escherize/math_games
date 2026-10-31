import type { GameDefinition } from '../../engine/types'
import { mountKakooma } from './game'
import { kakoomaRules, presets } from './rules'

export const kakooma: GameDefinition = {
  id: 'kakooma',
  title: 'Kakooma',
  tagline: 'Find the number that two others make. Greg Tang\'s puzzle, every bond you need.',
  skill: 'number-bonds',
  rules: kakoomaRules,
  levels: presets,
  mount: mountKakooma,
}
