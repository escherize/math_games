import { pictureKinds } from '../../engine/pictures'
import { defaultBondRules, defaultPacingRules, pacingFields, type PacedRules, type Preset, type RulesSpec } from '../../engine/rules'

/**
 * Same Number: two cards of pictured numbers, one number on both. The bond
 * core (op/min/max/maxResult/step) is fixed by the board so describeRules
 * reads sensibly; what a parent tunes is the number range and how many
 * panels each card holds.
 */
export interface TangaRules extends PacedRules {
  /** Smallest and largest number a panel may show (1..20). */
  minN: number
  maxN: number
  /** Panels per card. */
  panels: 3 | 4
}

export const MAX_N = 20
/** Ways a panel can draw a number: a numeral plus every picture kind. */
export const KIND_COUNT = 1 + pictureKinds.length

const base = (over: Partial<TangaRules>): TangaRules => ({
  ...defaultBondRules,
  ...defaultPacingRules,
  op: 'add',
  min: 1,
  max: 10,
  maxResult: 10,
  step: 1,
  minN: 1,
  maxN: 10,
  panels: 4,
  ...over,
})

export const presets: Preset<TangaRules>[] = [
  { id: 'to5', name: 'Numbers to 5', rules: base({ minN: 1, maxN: 5, max: 5, maxResult: 5, panels: 3 }) },
  { id: 'to10', name: 'Numbers to 10', rules: base({ minN: 1, maxN: 10, panels: 4 }) },
  { id: 'to20', name: 'Numbers to 20', rules: base({ minN: 6, maxN: 20, min: 6, max: 20, maxResult: 20, panels: 4 }) },
]

export const tangaRules: RulesSpec<TangaRules> = {
  defaults: presets[1].rules,
  presets,
  fields: [
    { key: 'minN', label: 'Smallest number', type: 'number', min: 1, max: MAX_N },
    { key: 'maxN', label: 'Largest number', type: 'number', min: 1, max: MAX_N },
    {
      key: 'panels',
      label: 'Numbers per card',
      type: 'select',
      options: [
        { value: 3, label: '3' },
        { value: 4, label: '4 (2×2)' },
      ],
    },
    ...pacingFields,
  ],
  validate(r) {
    if (r.op !== 'add') return 'Same Number is an addition board.'
    if (r.minN < 1) return 'Smallest number must be at least 1.'
    if (r.maxN > MAX_N) return `Pictures show at most ${MAX_N}.`
    if (r.minN > r.maxN) return 'Smallest number must not exceed largest number.'
    if (r.panels !== 3 && r.panels !== 4) return 'A card holds 3 or 4 numbers.'
    if (r.panels > KIND_COUNT) return `A card cannot show more than ${KIND_COUNT} numbers, one per picture.`
    const needed = 2 * r.panels - 1
    if (r.maxN - r.minN + 1 < needed) return `Two cards of ${r.panels} need at least ${needed} different numbers. Widen the range.`
    return null
  },
}
