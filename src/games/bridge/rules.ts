import { defaultPacingRules, pacingFields, type PacedRules, type Preset, type RulesSpec } from '../../engine/rules'

/**
 * Bridge to ten: a + b with a in 6..9, crossing ten. The operand range is
 * fixed by the board (min/max/maxResult/step are set so describeRules reads
 * sensibly); what a parent tunes is the sum range and whether the total is
 * asked after the frame fills.
 */
export interface BridgeRules extends PacedRules {
  minSum: number
  maxSum: number
  /** After the first frame fills, ask for the total (three numerals). False: filling the frame solves the puzzle. */
  askTotal: boolean
}

const base = (over: Partial<BridgeRules>): BridgeRules => ({
  op: 'add',
  min: 2,
  max: 9,
  maxResult: 18,
  step: 1,
  ...defaultPacingRules,
  minSum: 11,
  maxSum: 18,
  askTotal: true,
  ...over,
})

export const presets: Preset<BridgeRules>[] = [
  { id: 'to14', name: 'Sums to 14', rules: base({ minSum: 11, maxSum: 14, maxResult: 14 }) },
  { id: 'to18', name: 'Sums to 18', rules: base({ minSum: 11, maxSum: 18, maxResult: 18 }) },
  { id: 'to18frames', name: 'Just the frames', rules: base({ minSum: 11, maxSum: 18, maxResult: 18, askTotal: false }) },
]

export const bridgeRules: RulesSpec<BridgeRules> = {
  defaults: presets[0].rules,
  presets,
  fields: [
    { key: 'minSum', label: 'Smallest sum', type: 'number', min: 11, max: 18 },
    { key: 'maxSum', label: 'Largest sum', type: 'number', min: 11, max: 18 },
    { key: 'askTotal', label: 'Ask for the total after the frame fills', type: 'boolean' },
    ...pacingFields,
  ],
  validate(r) {
    if (r.op !== 'add') return 'Bridge to ten is an addition board.'
    if (r.minSum < 11 || r.maxSum > 18) return 'Sums must be between 11 and 18.'
    if (r.minSum > r.maxSum) return 'Smallest sum must not exceed largest sum.'
    return null
  },
}
