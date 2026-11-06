import { bondFields, defaultBondRules, defaultPacingRules, pacingFields, type PacedRules, type Preset, type RulesSpec } from '../../engine/rules'

export interface BalanceRules extends PacedRules {
  /** Tiles offered in the tray, the missing part among them (3..6). */
  tray: number
  /** Smallest whole on the left pan; 0 = any. */
  minResult: number
}

const base = (over: Partial<BalanceRules>): BalanceRules => ({
  ...defaultBondRules,
  ...defaultPacingRules,
  op: 'add',
  tray: 4,
  minResult: 0,
  ...over,
})

export const presets: Preset<BalanceRules>[] = [
  { id: 'bondsto5', name: 'Bonds to 5', rules: base({ min: 1, max: 4, maxResult: 5 }) },
  { id: 'bondsto10', name: 'Bonds to 10', rules: base({ min: 1, max: 9, maxResult: 10, minResult: 6 }) },
  { id: 'within20', name: 'Bonds within 20', rules: base({ min: 1, max: 19, maxResult: 20, minResult: 11, tray: 5 }) },
]

export const balanceRules: RulesSpec<BalanceRules> = {
  defaults: presets[1].rules,
  presets,
  fields: [
    ...bondFields.filter((f) => f.key !== 'op' && f.key !== 'step'),
    { key: 'minResult', label: 'Smallest whole', type: 'number', min: 0, max: 99999, help: '0 means no minimum' },
    { key: 'tray', label: 'Tiles in the tray', type: 'number', min: 3, max: 6 },
    ...pacingFields,
  ],
  validate(r) {
    if (r.op !== 'add') return 'The balance scale only plays addition bonds.'
    if (r.min > r.max) return 'Smallest number must not exceed largest number.'
    if (r.tray < 3 || r.tray > 6) return 'The tray holds 3 to 6 tiles.'
    const parts = r.max - r.min + 1
    if (parts < r.tray) return 'Not enough different numbers for that many tiles. Widen the range or shrink the tray.'
    const lowestWhole = Math.max(r.minResult, 2 * r.min)
    if (r.maxResult < lowestWhole) return 'Largest answer is too small for two parts in this range.'
    return null
  },
}
