import { defaultPacingRules, pacingFields, type PacedRules, type Preset, type RulesSpec } from '../../engine/rules'
import { canSatisfy } from './generator'

/**
 * Sets: a 3x3 grid of distinct numerals; a set is three tiles where two add
 * to the third, and any set counts. The bond core is fixed (addition,
 * 1..max, sums within max) so describeRules reads sensibly; a parent tunes
 * how large the numerals get and how many sets a puzzle asks for.
 */
export interface SetsRules extends PacedRules {
  /** Sets the child must find in one grid. The generator guarantees that many can be found without sharing a tile. */
  setsRequired: number
}

const base = (over: Partial<SetsRules>): SetsRules => ({
  op: 'add',
  min: 1,
  max: 10,
  maxResult: 10,
  step: 1,
  ...defaultPacingRules,
  setsRequired: 1,
  ...over,
})

/** Nine distinct numerals need at least nine numbers. */
export const SMALLEST_MAX = 9
export const LARGEST_MAX = 20
export const MOST_SETS = 3

export const presets: Preset<SetsRules>[] = [
  { id: 'one10', name: 'One set, numbers to 10', rules: base({ max: 10, maxResult: 10, setsRequired: 1 }) },
  { id: 'two10', name: 'Two sets, numbers to 10', rules: base({ max: 10, maxResult: 10, setsRequired: 2 }) },
  { id: 'one20', name: 'One set, numbers to 20', rules: base({ max: 20, maxResult: 20, setsRequired: 1 }) },
  { id: 'two20', name: 'Two sets, numbers to 20', rules: base({ max: 20, maxResult: 20, setsRequired: 2 }) },
]

export const setsRules: RulesSpec<SetsRules> = {
  defaults: presets[0].rules,
  presets,
  fields: [
    { key: 'max', label: 'Largest number', type: 'number', min: SMALLEST_MAX, max: LARGEST_MAX },
    { key: 'setsRequired', label: 'Sets to find', type: 'number', min: 1, max: MOST_SETS },
    ...pacingFields,
  ],
  validate(r) {
    if (r.op !== 'add') return 'Sets is an addition board.'
    if (r.min !== 1 || r.step !== 1) return 'Sets uses every number from 1 up.'
    if (!Number.isInteger(r.max) || r.max < SMALLEST_MAX || r.max > LARGEST_MAX) return `Largest number must be between ${SMALLEST_MAX} and ${LARGEST_MAX}.`
    if (!Number.isInteger(r.setsRequired) || r.setsRequired < 1 || r.setsRequired > MOST_SETS) return `Sets to find must be between 1 and ${MOST_SETS}.`
    if (!canSatisfy(r)) return `Nine distinct numbers within ${r.max} cannot hold ${r.setsRequired} sets that share no tile. Ask for fewer or raise the largest number.`
    // The grid's largest numeral is its largest answer.
    r.maxResult = r.max
    return null
  },
}
