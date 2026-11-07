import { defaultBondRules, defaultPacingRules, pacingFields, type PacedRules, type Preset, type RulesSpec } from '../../engine/rules'

/**
 * Halves: a row of n blocks split into two equal parts. The bond core
 * (op/min/max/maxResult/step) is fixed by the board so describeRules reads
 * sensibly; what a parent tunes is the range of n and whether odd rows,
 * with one block left over, are allowed.
 */
export interface HalvesRules extends PacedRules {
  /** Smallest row (2..20). */
  minN: number
  /** Largest row (2..20). */
  maxN: number
  /** Odd rows too: the halves differ by one and the extra block lifts out. */
  allowOdd: boolean
}

export const MAX_N = 20

const base = (over: Partial<HalvesRules>): HalvesRules => ({
  ...defaultBondRules,
  ...defaultPacingRules,
  op: 'add',
  min: 1,
  max: 10,
  maxResult: 20,
  step: 1,
  minN: 2,
  maxN: 10,
  allowOdd: false,
  ...over,
})

export const presets: Preset<HalvesRules>[] = [
  { id: 'to10', name: 'Halves to 10', rules: base({ minN: 2, maxN: 10, max: 5, maxResult: 10 }) },
  { id: 'to20', name: 'Halves to 20', rules: base({ minN: 2, maxN: 20 }) },
  { id: 'odd20', name: 'With one left over', rules: base({ minN: 2, maxN: 20, allowOdd: true }) },
]

/** Every n the rules allow, in order. */
export function candidates(r: HalvesRules): number[] {
  const out: number[] = []
  for (let n = Math.max(2, r.minN); n <= Math.min(MAX_N, r.maxN); n++) if (r.allowOdd || n % 2 === 0) out.push(n)
  return out
}

export const halvesRules: RulesSpec<HalvesRules> = {
  defaults: presets[0].rules,
  presets,
  fields: [
    { key: 'minN', label: 'Shortest row', type: 'number', min: 2, max: MAX_N },
    { key: 'maxN', label: 'Longest row', type: 'number', min: 2, max: MAX_N },
    { key: 'allowOdd', label: 'Odd rows too (one block left over)', type: 'boolean' },
    ...pacingFields,
  ],
  validate(r) {
    if (r.op !== 'add') return 'Halves is an addition board.'
    if (r.minN > r.maxN) return 'Shortest row must not exceed longest row.'
    if (r.maxN > MAX_N) return `Rows hold at most ${MAX_N} blocks.`
    if (r.minN < 2) return 'A row needs at least 2 blocks.'
    if (candidates(r).length === 0) return 'No even row in that range. Widen it or allow odd rows.'
    return null
  },
}
