import { defaultPacingRules, pacingFields, type PacedRules, type Preset, type RulesSpec } from '../../engine/rules'

/**
 * Pairs: a grid of numerals, tap every two that make the target. The bond
 * core follows the target (min/max/maxResult/step keep describeRules
 * sensible); what a parent tunes is the target, how many pairs hide in the
 * grid, how many lone decoys sit beside them, and whether a tile may pair
 * with its twin (5 and 5 for 10).
 */
export interface PairsRules extends PacedRules {
  target: 5 | 10 | 20
  /** Pairs (x, target-x) hidden in the grid. */
  pairs: number
  /** Tiles whose partner is absent; asked for, not guaranteed, when the target has too few spare values. */
  decoys: number
  /** The pair (target/2, target/2) may appear, as two identical tiles. */
  doubles: boolean
}

const base = (over: Partial<PairsRules>): PairsRules => {
  const target = over.target ?? 10
  return {
    op: 'add',
    min: 1,
    max: target - 1,
    maxResult: target,
    step: 1,
    ...defaultPacingRules,
    target,
    pairs: 3,
    decoys: 3,
    doubles: false,
    ...over,
  }
}

/** Distinct unordered pairs (x, target-x) with 1 <= x <= target-x; the double counts only when allowed. */
export function availablePairs(target: number, doubles: boolean): number {
  return Math.floor((target - 1) / 2) + (doubles && target % 2 === 0 ? 1 : 0)
}

/** Most tiles the grid holds: five columns of four. */
export const MAX_TILES = 20

export const presets: Preset<PairsRules>[] = [
  { id: 'to5', name: 'Pairs to 5', rules: base({ target: 5, pairs: 1, decoys: 2 }) },
  { id: 'to10', name: 'Pairs to 10', rules: base({ target: 10, pairs: 3, decoys: 3 }) },
  { id: 'to10all', name: 'Every pair to 10', rules: base({ target: 10, pairs: 4, decoys: 1, doubles: true }) },
  { id: 'to20', name: 'Pairs to 20', rules: base({ target: 20, pairs: 4, decoys: 4 }) },
]

export const pairsRules: RulesSpec<PairsRules> = {
  defaults: presets[1].rules,
  presets,
  fields: [
    {
      key: 'target',
      label: 'Make this number',
      type: 'select',
      options: [
        { value: 5, label: '5' },
        { value: 10, label: '10' },
        { value: 20, label: '20' },
      ],
    },
    { key: 'pairs', label: 'Pairs in the grid', type: 'number', min: 1, max: 8 },
    { key: 'decoys', label: 'Numbers with no partner', type: 'number', min: 0, max: 6, help: 'Fewer appear when the target has no spare numbers left' },
    { key: 'doubles', label: 'A number may pair with itself (5 and 5)', type: 'boolean' },
    ...pacingFields,
  ],
  validate(r) {
    if (r.op !== 'add') return 'Pairs is an addition board.'
    if (r.target !== 5 && r.target !== 10 && r.target !== 20) return 'The target must be 5, 10 or 20.'
    if (r.pairs < 1) return 'Ask for at least one pair.'
    if (availablePairs(r.target, r.doubles) < r.pairs) return `${r.target} does not have ${r.pairs} different pairs. Ask for fewer.`
    if (r.decoys < 0) return 'Numbers with no partner cannot be negative.'
    if (r.pairs * 2 + r.decoys > MAX_TILES) return `The grid holds at most ${MAX_TILES} numbers.`
    return null
  },
}
