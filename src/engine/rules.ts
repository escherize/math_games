/**
 * Rules a parent or administrator sets for a number-bond game.
 *
 * Every game that drills bonds shares this core (operation + operand range)
 * and adds its own fields. The hub stores one rules object per game and
 * renders a settings form from the game's schema, so a new game gets a
 * parent-facing settings screen for free.
 */

export type Operation = 'add' | 'subtract' | 'multiply' | 'divide' | 'power'

/**
 * A bond is a triple (a, b, whole) with whole = a ∘ b for a base op.
 * Subtraction and division use the same triples as addition and
 * multiplication; they just ask for a part instead of the whole.
 */
export interface OperationInfo {
  id: Operation
  label: string
  symbol: string
  base: 'add' | 'multiply' | 'power'
  /** What the player must find: the combined value or one of the two parts. */
  target: 'whole' | 'part'
  /** Operand order matters (a^b ≠ b^a). */
  ordered: boolean
}

export const operations: Record<Operation, OperationInfo> = {
  add: { id: 'add', label: 'Addition', symbol: '+', base: 'add', target: 'whole', ordered: false },
  subtract: { id: 'subtract', label: 'Subtraction', symbol: '−', base: 'add', target: 'part', ordered: false },
  multiply: { id: 'multiply', label: 'Multiplication', symbol: '×', base: 'multiply', target: 'whole', ordered: false },
  divide: { id: 'divide', label: 'Division', symbol: '÷', base: 'multiply', target: 'part', ordered: false },
  power: { id: 'power', label: 'Exponents', symbol: '^', base: 'power', target: 'whole', ordered: true },
}

export function combine(base: OperationInfo['base'], a: number, b: number): number {
  switch (base) {
    case 'add':
      return a + b
    case 'multiply':
      return a * b
    case 'power':
      return a ** b
  }
}

export interface BondRules {
  op: Operation
  /** Smallest operand. */
  min: number
  /** Largest operand. */
  max: number
  /** Largest allowed combined value (0 = no limit beyond what operands produce). */
  maxResult: number
  /** Operands restricted to multiples of this (1 = any). */
  step: number
}

export const defaultBondRules: BondRules = { op: 'add', min: 1, max: 9, maxResult: 10, step: 1 }

/** Canonical key for stats, shared by inverse operations: "3+4", "3×4", "2^3". */
export function bondKey(base: OperationInfo['base'], a: number, b: number): string {
  const sym = base === 'add' ? '+' : base === 'multiply' ? '×' : '^'
  if (base === 'power') return `${a}${sym}${b}`
  const [lo, hi] = a <= b ? [a, b] : [b, a]
  return `${lo}${sym}${hi}`
}

/** All operand values the rules allow. */
export function operandValues(r: BondRules): number[] {
  const step = Math.max(1, r.step)
  const out: number[] = []
  for (let x = Math.ceil(r.min / step) * step; x <= r.max; x += step) out.push(x)
  return out
}

export function describeRules(r: BondRules): string {
  const op = operations[r.op]
  const range = r.step > 1 ? `multiples of ${r.step} up to ${r.max}` : `${r.min} to ${r.max}`
  const cap = r.maxResult > 0 && op.target === 'whole' ? `, answers up to ${r.maxResult}` : ''
  return `${op.label}, ${range}${cap}`
}

/* ---------- Schema: how the hub renders a settings form for a game ---------- */

export type Field =
  | { key: string; label: string; type: 'select'; options: Array<{ value: string | number; label: string }>; help?: string }
  | { key: string; label: string; type: 'number'; min: number; max: number; help?: string }
  | { key: string; label: string; type: 'boolean'; help?: string }

export interface Preset<R> {
  id: string
  name: string
  rules: R
}

export interface RulesSpec<R extends BondRules> {
  defaults: R
  fields: Field[]
  presets: Preset<R>[]
  /** Return a problem with the rules, or null if they are playable. May also repair `r` in place. */
  validate(r: R): string | null
}

export const bondFields: Field[] = [
  {
    key: 'op',
    label: 'Operation',
    type: 'select',
    options: Object.values(operations).map((o) => ({ value: o.id, label: `${o.label} (${o.symbol})` })),
  },
  { key: 'min', label: 'Smallest number', type: 'number', min: 0, max: 999 },
  { key: 'max', label: 'Largest number', type: 'number', min: 1, max: 999 },
  { key: 'maxResult', label: 'Largest answer', type: 'number', min: 0, max: 99999, help: '0 means no limit' },
  { key: 'step', label: 'Count by', type: 'number', min: 1, max: 100, help: '10 means only multiples of 10' },
]

/* ---------- Storage: one rules object per game ---------- */

const KEY = (gameId: string) => `math-games.rules.${gameId}`

export function loadRules<R extends BondRules>(gameId: string, spec: RulesSpec<R>): R {
  try {
    const raw = localStorage.getItem(KEY(gameId))
    if (raw) return { ...spec.defaults, ...(JSON.parse(raw) as Partial<R>) }
  } catch {
    /* fall through to defaults */
  }
  return { ...spec.defaults }
}

export function saveRules<R extends BondRules>(gameId: string, rules: R) {
  try {
    localStorage.setItem(KEY(gameId), JSON.stringify(rules))
  } catch {
    /* best effort */
  }
}
