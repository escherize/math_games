import type { Cartridge } from '../../engine/cartridge'
import { mountPins } from './game'
import { pinsRules, type PinsRules } from './rules'

export const pins: Cartridge<PinsRules> = {
  id: 'pins',
  title: 'Pins',
  tagline: 'Roll, then knock down the pin that matches, or two pins that make it.',
  skill: 'number-bonds',
  rules: pinsRules,
  prompt: (r) =>
    r.allowDifference
      ? 'Knock down the pin that matches the roll, or two pins that add or take away to make it.'
      : 'Knock down the pin that matches the roll, or two pins that make it.',
  mount: mountPins,
}
