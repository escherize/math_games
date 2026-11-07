import { defaultPacingRules, pacingFields, type PacedRules, type Preset, type RulesSpec } from '../../engine/rules'

/**
 * Bond builder: part-part-whole triangles with blanks and a tray of tiles.
 * The operand range is fixed by the board (min/max/step set so describeRules
 * reads sensibly); what a parent tunes is how many triangles share the tray,
 * how many blanks each has, and the largest whole.
 */
export interface BuilderRules extends PacedRules {
  /** Triangles on the board sharing one tray. */
  triangles: 1 | 2 | 3
  /** Blanks per triangle: 1 (any slot) or 2 (both parts; the whole is given). */
  blanksPer: 1 | 2
  /** Largest whole. */
  maxWhole: number
}

const base = (over: Partial<BuilderRules>): BuilderRules => ({
  op: 'add',
  min: 1,
  max: 9,
  maxResult: 10,
  step: 1,
  ...defaultPacingRules,
  triangles: 1,
  blanksPer: 1,
  maxWhole: 10,
  ...over,
})

export const presets: Preset<BuilderRules>[] = [
  { id: 'one10', name: 'One triangle to 10', rules: base({ triangles: 1, blanksPer: 1, maxWhole: 10 }) },
  { id: 'two10', name: 'Two triangles to 10', rules: base({ triangles: 2, blanksPer: 1, maxWhole: 10 }) },
  { id: 'three20', name: 'Three triangles to 20', rules: base({ triangles: 3, blanksPer: 2, maxWhole: 20, max: 19, maxResult: 20 }) },
]

export const builderRules: RulesSpec<BuilderRules> = {
  defaults: presets[0].rules,
  presets,
  fields: [
    { key: 'triangles', label: 'Triangles', type: 'number', min: 1, max: 3 },
    { key: 'blanksPer', label: 'Blanks per triangle', type: 'number', min: 1, max: 2 },
    { key: 'maxWhole', label: 'Largest whole', type: 'number', min: 3, max: 20 },
    ...pacingFields,
  ],
  validate(r) {
    if (r.op !== 'add') return 'Bond builder is an addition board.'
    if (r.triangles < 1 || r.triangles > 3) return 'One to three triangles.'
    if (r.blanksPer < 1 || r.blanksPer > 2) return 'One or two blanks per triangle.'
    if (r.maxWhole < 3 || r.maxWhole > 20) return 'Largest whole must be between 3 and 20.'
    return null
  },
}
