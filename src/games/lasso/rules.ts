import { defaultPacingRules, pacingFields, type PacedRules, type Preset, type RulesSpec } from '../../engine/rules'

export type Layout = 'scatter' | 'rows'

export interface LassoRules extends PacedRules {
  /** Fewest dots on the board. */
  minCount: number
  /** Most dots on the board. */
  maxCount: number
  /** `rows`: ten in a row above the rest. `scatter`: a loose cluster of ten apart from the rest. */
  layout: Layout
}

const base = (over: Partial<LassoRules>): LassoRules => ({
  op: 'add',
  min: 1,
  max: 9,
  maxResult: 19,
  step: 1,
  ...defaultPacingRules,
  minCount: 11,
  maxCount: 19,
  layout: 'scatter',
  ...over,
})

export const presets: Preset<LassoRules>[] = [
  { id: 'rows13', name: 'Rows to 13', rules: base({ layout: 'rows', minCount: 11, maxCount: 13, maxResult: 13 }) },
  { id: 'scatter15', name: 'Scatter to 15', rules: base({ layout: 'scatter', minCount: 11, maxCount: 15, maxResult: 15 }) },
  { id: 'scatter19', name: 'Scatter to 19', rules: base({ layout: 'scatter', minCount: 11, maxCount: 19, maxResult: 19 }) },
]

export const lassoRules: RulesSpec<LassoRules> = {
  defaults: presets[1].rules,
  presets,
  fields: [
    { key: 'minCount', label: 'Fewest dots', type: 'number', min: 11, max: 19 },
    { key: 'maxCount', label: 'Most dots', type: 'number', min: 11, max: 19 },
    {
      key: 'layout',
      label: 'Layout',
      type: 'select',
      options: [
        { value: 'rows', label: 'Rows (ten in a line)' },
        { value: 'scatter', label: 'Scatter (a cluster of ten)' },
      ],
    },
    ...pacingFields,
  ],
  validate(r) {
    if (r.op !== 'add') return 'Lasso ten only plays addition (ten and some more).'
    if (r.minCount < 11 || r.maxCount > 19) return 'Dot counts must stay between 11 and 19.'
    if (r.minCount > r.maxCount) return 'Fewest dots must not exceed most dots.'
    if (r.layout !== 'rows' && r.layout !== 'scatter') return 'Layout must be rows or scatter.'
    return null
  },
}
