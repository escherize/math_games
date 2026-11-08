/**
 * One Same Number puzzle: two cards of pictured numbers sharing exactly one
 * value, drawn as a different picture on each card so the child has to
 * read the quantity, not match the shape.
 */
import { kindsFor, type PictureKind } from '../../engine/pictures'
import { randInt, shuffle, type Rng } from '../../engine/rng'
import type { TangaRules } from './rules'

/** How a panel draws its number: digits, or one of the engine's pictures. */
export type PanelKind = 'numeral' | PictureKind

export interface Panel {
  value: number
  kind: PanelKind
}

export interface TangaPuzzle {
  /** The one value on both cards. */
  shared: number
  cards: [Panel[], Panel[]]
}

/** Every way n may be drawn; a die only for n up to 6. */
export function kindsForValue(n: number): PanelKind[] {
  return ['numeral', ...kindsFor(n)]
}

/**
 * Give each value on a card a kind no other panel on the card uses. The
 * values with the fewest choices go first; with at most 4 panels and at
 * least 3 choices each (one fewer only for the shared value, whose other
 * card's kind is barred) a choice always remains.
 */
function assignKinds(rng: Rng, values: number[], barred: Map<number, PanelKind>): Panel[] {
  const options = values.map((value) => ({ value, kinds: shuffle(rng, kindsForValue(value).filter((k) => k !== barred.get(value))) }))
  options.sort((a, b) => a.kinds.length - b.kinds.length)
  const taken = new Set<PanelKind>()
  const out: Panel[] = []
  for (const { value, kinds } of options) {
    const kind = kinds.find((k) => !taken.has(k))
    if (!kind) throw new Error(`no picture left for ${value}`)
    taken.add(kind)
    out.push({ value, kind })
  }
  return out
}

export function generatePuzzle(rng: Rng, r: TangaRules): TangaPuzzle {
  const shared = randInt(rng, r.minN, r.maxN)
  const others: number[] = []
  for (let n = r.minN; n <= r.maxN; n++) if (n !== shared) others.push(n)
  const picked = shuffle(rng, others).slice(0, 2 * (r.panels - 1))
  const a = [shared, ...picked.slice(0, r.panels - 1)]
  const b = [shared, ...picked.slice(r.panels - 1)]
  const cardA = assignKinds(rng, a, new Map())
  const sharedKind = cardA.find((p) => p.value === shared)!.kind
  const cardB = assignKinds(rng, b, new Map([[shared, sharedKind]]))
  return { shared, cards: [shuffle(rng, cardA), shuffle(rng, cardB)] }
}
