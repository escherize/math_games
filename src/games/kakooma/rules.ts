import { bondFields, defaultBondRules, defaultPacingRules, pacingFields, type PacedRules, type Preset, type RulesSpec } from '../../engine/rules'
import { maxFeasiblePodSize } from './generator'

export type PodSize = 4 | 5 | 6 | 9

export interface KakoomaRules extends PacedRules {
  podCount: number
  podSize: PodSize
  /** One part of the bond is always this number; 0 = any. */
  addend: number
  /** How many times one numeral may appear in a pod (1 = all distinct). */
  repeats: number
  /** Smallest allowed combined value; 0 = any. */
  minResult: number
}

const base = (over: Partial<KakoomaRules>): KakoomaRules => ({
  ...defaultBondRules,
  ...defaultPacingRules,
  podCount: 4,
  podSize: 4,
  addend: 0,
  repeats: 1,
  minResult: 0,
  ...over,
})

/** tangmath.com's variant list, plus a couple of gentler starts for younger kids. */
export const presets: Preset<KakoomaRules>[] = [
  { id: 'addto3', name: 'Add 1 to 3', rules: base({ op: 'add', min: 1, max: 3, maxResult: 6 }) },
  { id: 'addto5', name: 'Add 1 to 5', rules: base({ op: 'add', min: 1, max: 5, maxResult: 10 }) },
  { id: 'addwithin10', name: 'Add within 10', rules: base({ op: 'add', min: 1, max: 9, maxResult: 10 }) },
  { id: 'addwithin20', name: 'Add within 20', rules: base({ op: 'add', min: 1, max: 19, maxResult: 20, podSize: 5 }) },
  { id: 'addwithin25', name: 'Add within 25', rules: base({ op: 'add', min: 1, max: 24, maxResult: 25, podSize: 5 }) },
  { id: 'addmultiplesof10', name: 'Add multiples of 10', rules: base({ op: 'add', min: 10, max: 90, maxResult: 100, step: 10 }) },
  { id: 'addwithin100', name: 'Add within 100', rules: base({ op: 'add', min: 1, max: 99, maxResult: 100, podSize: 5 }) },
  { id: 'subtractwithin10', name: 'Subtract within 10', rules: base({ op: 'subtract', min: 1, max: 9, maxResult: 10 }) },
  { id: 'multiplya', name: 'Multiply A', rules: base({ op: 'multiply', min: 2, max: 9, maxResult: 81, podSize: 5 }) },
  { id: 'multiplyb', name: 'Multiply B', rules: base({ op: 'multiply', min: 2, max: 12, maxResult: 144, podSize: 5 }) },
  { id: 'divide', name: 'Divide', rules: base({ op: 'divide', min: 2, max: 9, maxResult: 81, podSize: 5 }) },
  { id: 'power', name: 'Exponents', rules: base({ op: 'power', min: 2, max: 5, maxResult: 125, podSize: 5 }) },
]

export const kakoomaRules: RulesSpec<KakoomaRules> = {
  defaults: presets[2].rules,
  presets,
  fields: [
    ...bondFields,
    {
      key: 'podSize',
      label: 'Numbers per pod',
      type: 'select',
      options: [
        { value: 4, label: '4 (2×2)' },
        { value: 5, label: '5 (plus shape)' },
        { value: 6, label: '6 (2×3)' },
        { value: 9, label: '9 (3×3)' },
      ],
    },
    { key: 'podCount', label: 'Pods per puzzle', type: 'number', min: 1, max: 9 },
    { key: 'addend', label: 'Always use this number', type: 'number', min: 0, max: 999, help: '0 means any; 1 makes every bond a +1 bond' },
    { key: 'minResult', label: 'Smallest answer', type: 'number', min: 0, max: 99999, help: '0 means no minimum' },
    {
      key: 'repeats',
      label: 'Same numeral may appear',
      type: 'select',
      options: [
        { value: 1, label: 'once' },
        { value: 2, label: 'twice (doubles like 2+2)' },
        { value: 3, label: 'three times' },
      ],
    },
    ...pacingFields,
  ],
  validate(r) {
    if (r.min > r.max) return 'Smallest number must not exceed largest number.'
    if (r.addend > 0 && (r.addend < r.min || r.addend > r.max)) return 'The always-used number must be within the number range.'
    if (r.minResult > 0 && r.maxResult > 0 && r.minResult > r.maxResult) return 'Smallest answer must not exceed largest answer.'
    const feasible = maxFeasiblePodSize(r)
    if (feasible === 0) return 'These numbers cannot make any puzzle. Widen the range or raise the largest answer.'
    if (r.podSize > feasible) {
      r.podSize = feasible
      return null
    }
    return null
  },
}
