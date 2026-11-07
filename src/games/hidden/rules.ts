import { defaultPacingRules, pacingFields, type PacedRules, type Preset, type RulesSpec } from '../../engine/rules'

/**
 * Hidden bonds: one number, every way to split it. The operand range is
 * fixed by the board (min/max/maxResult/step keep describeRules sensible);
 * what a parent tunes is which n appear and how many bonds a puzzle asks for.
 */
export interface HiddenRules extends PacedRules {
  /** Smallest and largest n (dots in the row, at most 10). */
  minN: number
  maxN: number
  /** Bonds to find per puzzle; 0 = every bond this n has. */
  bondsRequired: number
  /** 3|5 and 5|3 are the same bond. */
  commutativeOnce: boolean
  /** The divider may rest at either end, giving 0|n and n|0. */
  allowZero: boolean
}

const base = (over: Partial<HiddenRules>): HiddenRules => ({
  op: 'add',
  min: 0,
  max: 10,
  maxResult: 10,
  step: 1,
  ...defaultPacingRules,
  minN: 3,
  maxN: 10,
  bondsRequired: 0,
  commutativeOnce: true,
  allowZero: false,
  ...over,
})

/** The splits a|b the divider can rest at, in row order. */
export function splitsOf(n: number, r: Pick<HiddenRules, 'allowZero'>): number[] {
  const out: number[] = []
  for (let a = r.allowZero ? 0 : 1; a <= (r.allowZero ? n : n - 1); a++) out.push(a)
  return out
}

/** Key under which a split is shelved: the same for a|b and b|a when commutative pairs count once. */
export function splitKey(a: number, b: number, r: Pick<HiddenRules, 'commutativeOnce'>): string {
  return r.commutativeOnce && a > b ? `${b}|${a}` : `${a}|${b}`
}

/** How many distinct bonds n has under these rules. */
export function bondCount(n: number, r: Pick<HiddenRules, 'allowZero' | 'commutativeOnce'>): number {
  return new Set(splitsOf(n, r).map((a) => splitKey(a, n - a, r))).size
}

export const presets: Preset<HiddenRules>[] = [
  { id: 'to5', name: 'Bonds to 5', rules: base({ minN: 3, maxN: 5, maxResult: 5 }) },
  { id: 'to10', name: 'Three bonds to 10', rules: base({ minN: 6, maxN: 10, bondsRequired: 3 }) },
  { id: 'all10', name: 'Every bond to 10', rules: base({ minN: 6, maxN: 10, commutativeOnce: false }) },
]

export const hiddenRules: RulesSpec<HiddenRules> = {
  defaults: presets[0].rules,
  presets,
  fields: [
    { key: 'minN', label: 'Smallest number', type: 'number', min: 2, max: 10 },
    { key: 'maxN', label: 'Largest number', type: 'number', min: 2, max: 10 },
    { key: 'bondsRequired', label: 'Bonds to find', type: 'number', min: 0, max: 11, help: '0 means every bond the number has' },
    { key: 'commutativeOnce', label: '3 and 5 is the same bond as 5 and 3', type: 'boolean' },
    { key: 'allowZero', label: 'Allow 0 and the whole number as a bond', type: 'boolean' },
    ...pacingFields,
  ],
  validate(r) {
    if (r.op !== 'add') return 'Hidden bonds is an addition board.'
    if (r.minN < 2 || r.maxN > 10) return 'Numbers must be between 2 and 10.'
    if (r.minN > r.maxN) return 'Smallest number must not exceed largest number.'
    if (r.bondsRequired < 0) return 'Bonds to find cannot be negative.'
    if (r.bondsRequired > bondCount(r.minN, r)) return `${r.minN} does not have ${r.bondsRequired} bonds. Ask for fewer or raise the smallest number.`
    return null
  },
}
