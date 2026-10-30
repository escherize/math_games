import { bondFields, defaultBondRules, type BondRules, type Preset, type RulesSpec } from '../../engine/rules'
import { maxFeasiblePodSize } from './generator'

export type PodSize = 4 | 5 | 6 | 9

export interface KakoomaRules extends BondRules {
  podCount: number
  podSize: PodSize
  /** Seconds per puzzle in Challenge mode. */
  timerSeconds: number
  /** Puzzles to clear per level. */
  puzzlesPerLevel: number
}

const base = (over: Partial<KakoomaRules>): KakoomaRules => ({
  ...defaultBondRules,
  podCount: 4,
  podSize: 4,
  timerSeconds: 60,
  puzzlesPerLevel: 1,
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
    { key: 'puzzlesPerLevel', label: 'Puzzles per level', type: 'number', min: 1, max: 10 },
    { key: 'timerSeconds', label: 'Seconds per puzzle (Challenge)', type: 'number', min: 10, max: 600 },
  ],
  validate(r) {
    if (r.min > r.max) return 'Smallest number must not exceed largest number.'
    const feasible = maxFeasiblePodSize(r)
    if (feasible === 0) return 'These numbers cannot make any puzzle. Widen the range or raise the largest answer.'
    if (r.podSize > feasible) {
      r.podSize = feasible
      return null
    }
    return null
  },
}
