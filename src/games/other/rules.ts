import { defaultPacingRules, pacingFields, type PacedRules, type Preset, type RulesSpec } from '../../engine/rules'
import { pairsOf } from './generator'

/**
 * The Other Number: Greg Tang's make-ten strategy. For a + b crossing ten,
 * the child picks the split of b whose one part completes a to ten. The
 * operand range is fixed by the board (min/max/maxResult/step keep
 * describeRules sensible); what a parent tunes is which a appear, how far
 * the sums reach, how many splits are offered and whether the total is asked.
 */
export interface OtherRules extends PacedRules {
  /** Smallest and largest first addend a, 6..9. */
  minA: number
  maxA: number
  /** Largest a + b, 12..18. */
  maxSum: number
  /** Splits of b offered per puzzle. */
  options: 2 | 3
  /** After the split, ask for a + b as well. */
  askTotal: boolean
}

const base = (over: Partial<OtherRules>): OtherRules => ({
  op: 'add',
  min: 1,
  max: 9,
  maxResult: 18,
  step: 1,
  ...defaultPacingRules,
  minA: 6,
  maxA: 9,
  maxSum: 18,
  options: 3,
  askTotal: false,
  ...over,
})

export const presets: Preset<OtherRules>[] = [
  { id: 'to14', name: 'Sums to 14', rules: base({ minA: 7, maxA: 9, maxSum: 14, maxResult: 14, options: 2 }) },
  { id: 'to18', name: 'Sums to 18', rules: base({ minA: 6, maxA: 9, maxSum: 18, options: 3 }) },
  { id: 'total', name: 'Then the total', rules: base({ minA: 6, maxA: 9, maxSum: 18, options: 3, askTotal: true }) },
]

export const otherRules: RulesSpec<OtherRules> = {
  defaults: presets[0].rules,
  presets,
  fields: [
    { key: 'minA', label: 'Smallest first number', type: 'number', min: 6, max: 9 },
    { key: 'maxA', label: 'Largest first number', type: 'number', min: 6, max: 9 },
    { key: 'maxSum', label: 'Largest sum', type: 'number', min: 12, max: 18 },
    {
      key: 'options',
      label: 'Splits to choose from',
      type: 'select',
      options: [
        { value: 2, label: '2' },
        { value: 3, label: '3' },
      ],
    },
    { key: 'askTotal', label: 'Ask for the total after the split', type: 'boolean' },
    ...pacingFields,
  ],
  validate(r) {
    if (r.op !== 'add') return 'The Other Number is an addition board.'
    if (r.minA < 6 || r.maxA > 9) return 'The first number must be between 6 and 9.'
    if (r.minA > r.maxA) return 'Smallest first number must not exceed largest first number.'
    if (r.maxSum < 12 || r.maxSum > 18) return 'Largest sum must be between 12 and 18.'
    if (r.options !== 2 && r.options !== 3) return 'Offer 2 or 3 splits.'
    if (pairsOf(r).length === 0) return 'No sum crosses ten under these rules. Raise the largest sum or lower the first number.'
    return null
  },
}
