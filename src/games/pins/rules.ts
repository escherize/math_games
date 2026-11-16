import { defaultPacingRules, pacingFields, type PacedRules, type Preset, type RulesSpec } from '../../engine/rules'

/**
 * Pins: a triangle of numbered pins and a roll of one or two dice. Knock
 * down the pin that matches the roll, or two pins that make it. The bond
 * core is fixed by the board (min/max/maxResult/step keep describeRules
 * sensible); a parent tunes the pin count, the dice, whether a pair may
 * take away as well as add, and whether any number of pins may add up to
 * the roll (Shut the Box), where the aim is to knock as many as you can.
 */
export type PinCount = 6 | 10
export type DiceCount = 1 | 2

export interface PinsRules extends PacedRules {
  pins: PinCount
  dice: DiceCount
  /** Two pins whose difference is the roll fall too. */
  allowDifference: boolean
  /** Any number of pins that add up to the roll fall, not just one or two. */
  manyPins: boolean
}

const base = (over: Partial<PinsRules>): PinsRules => ({
  op: 'add',
  min: 1,
  max: 10,
  maxResult: 12,
  step: 1,
  ...defaultPacingRules,
  pins: 10,
  dice: 1,
  allowDifference: false,
  manyPins: false,
  ...over,
})

export const presets: Preset<PinsRules>[] = [
  { id: 'six', name: 'Six pins, one die', rules: base({ pins: 6, max: 6, dice: 1 }) },
  { id: 'sixtwo', name: 'Six pins, two dice', rules: base({ pins: 6, max: 6, dice: 2 }) },
  { id: 'ten', name: 'Ten pins, two dice', rules: base({ pins: 10, dice: 2 }) },
  { id: 'minus', name: 'Add or take away', rules: base({ pins: 10, dice: 2, allowDifference: true }) },
  { id: 'box', name: 'Shut the box: as many pins as you can', rules: base({ pins: 10, dice: 2, manyPins: true }) },
]

export const pinsRules: RulesSpec<PinsRules> = {
  defaults: presets[2].rules,
  presets,
  fields: [
    {
      key: 'pins',
      label: 'Pins',
      type: 'select',
      options: [
        { value: 6, label: '6 (rows of 3, 2, 1)' },
        { value: 10, label: '10 (rows of 4, 3, 2, 1)' },
      ],
    },
    {
      key: 'dice',
      label: 'Dice',
      type: 'select',
      options: [
        { value: 1, label: 'One die (1 to 6)' },
        { value: 2, label: 'Two dice (2 to 12)' },
      ],
    },
    { key: 'allowDifference', label: 'Two pins may take away to make the roll', type: 'boolean' },
    { key: 'manyPins', label: 'Any number of pins may add up to the roll', type: 'boolean', help: 'Shut the Box: knocking more pins per roll is the goal' },
    ...pacingFields,
  ],
  validate(r) {
    if (r.op !== 'add') return 'Pins is an addition board.'
    if (r.pins !== 6 && r.pins !== 10) return 'Pins must be 6 or 10.'
    if (r.dice !== 1 && r.dice !== 2) return 'Dice must be 1 or 2.'
    r.min = 1
    r.max = r.pins
    r.maxResult = 12
    r.step = 1
    return null
  },
}
