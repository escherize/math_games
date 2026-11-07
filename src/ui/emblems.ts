/**
 * How the hub dresses each Cartridge: a hue and a small geometric emblem of
 * its board. Presentation only, keyed by cartridge id, so the Cartridge
 * contract that Math Wiz shares stays free of hub styling.
 */

export interface Dress {
  /** CSS hue (0..360) the card is tinted from. */
  hue: number
  /** Inline SVG, 48x48 viewBox, stroked in currentColor. */
  emblem: string
}

const STROKE = 'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"'

const svg = (body: string) => `<svg viewBox="0 0 48 48" ${STROKE} aria-hidden="true">${body}</svg>`

const dresses: Record<string, Dress> = {
  // A plus-shaped pod: four numerals around the one they make.
  kakooma: {
    hue: 204,
    emblem: svg(`
      <rect x="18" y="4" width="12" height="12" rx="2"/>
      <rect x="4" y="18" width="12" height="12" rx="2"/>
      <rect x="18" y="18" width="12" height="12" rx="2" fill="currentColor" fill-opacity="0.28"/>
      <rect x="32" y="18" width="12" height="12" rx="2"/>
      <rect x="18" y="32" width="12" height="12" rx="2"/>`),
  },
  // A beam on its post, a pan at each end, tipped a little.
  balance: {
    hue: 28,
    emblem: svg(`
      <path d="M24 42h-9M24 42h9M24 42V18"/>
      <path d="M8 16L40 24"/>
      <circle cx="24" cy="20" r="3" fill="currentColor"/>
      <path d="M3 24l5-8 5 8z" fill="currentColor" fill-opacity="0.28"/>
      <path d="M35 32l5-8 5 8z" fill="currentColor" fill-opacity="0.28"/>`),
  },
  // Two ten-frames with two dots crossing from the right one to the left.
  bridge: {
    hue: 150,
    emblem: svg(`
      <rect x="3" y="12" width="20" height="24" rx="2"/>
      <rect x="25" y="12" width="20" height="24" rx="2"/>
      <path d="M13 12v24M3 24h20M35 12v24M25 24h20" stroke-width="2"/>
      <circle cx="8" cy="18" r="2.5" fill="currentColor"/>
      <circle cx="18" cy="18" r="2.5" fill="currentColor"/>
      <circle cx="8" cy="30" r="2.5" fill="currentColor"/>
      <circle cx="30" cy="18" r="2.5" fill="currentColor" fill-opacity="0.4"/>
      <circle cx="30" cy="30" r="2.5" fill="currentColor" fill-opacity="0.4"/>
      <path d="M30 6c-6 0-10 4-12 8" stroke-dasharray="3 3"/>`),
  },
  // Scattered dots with a loop drawn round the cluster.
  lasso: {
    hue: 290,
    emblem: svg(`
      <path d="M8 18c2-8 12-11 20-9s11 9 9 15-9 9-16 8-15-6-13-14z" stroke-dasharray="5 4"/>
      <circle cx="14" cy="20" r="2.5" fill="currentColor"/>
      <circle cx="22" cy="16" r="2.5" fill="currentColor"/>
      <circle cx="30" cy="20" r="2.5" fill="currentColor"/>
      <circle cx="18" cy="26" r="2.5" fill="currentColor"/>
      <circle cx="26" cy="26" r="2.5" fill="currentColor"/>
      <circle cx="12" cy="40" r="2.5" fill="currentColor" fill-opacity="0.4"/>
      <circle cx="22" cy="42" r="2.5" fill="currentColor" fill-opacity="0.4"/>
      <circle cx="38" cy="38" r="2.5" fill="currentColor" fill-opacity="0.4"/>`),
  },
  // A row of blocks with a cut through the middle and a knob on the cutter.
  halves: {
    hue: 100,
    emblem: svg(`
      <rect x="3" y="16" width="8" height="16" rx="2" fill="currentColor" fill-opacity="0.28"/>
      <rect x="13" y="16" width="8" height="16" rx="2" fill="currentColor" fill-opacity="0.28"/>
      <rect x="27" y="16" width="8" height="16" rx="2"/>
      <rect x="37" y="16" width="8" height="16" rx="2"/>
      <path d="M24 6v32"/>
      <circle cx="24" cy="40" r="4" fill="currentColor"/>`),
  },
}

const fallback: Dress = {
  hue: 220,
  emblem: svg(`<circle cx="24" cy="24" r="16"/><path d="M24 14v20M14 24h20"/>`),
}

export function dressOf(id: string): Dress {
  return dresses[id] ?? fallback
}

/** A small star, drawn (never the text glyph) so it sizes and colours with the step. */
export const STAR_SVG = `<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L10 14.9l-5.3 2.8 1.1-5.9L1.5 7.7l5.9-.8z"/></svg>`

/** A padlock for a locked step. */
export const LOCK_SVG = `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="9" width="12" height="9" rx="2" fill="currentColor"/><path d="M6.5 9V6.5a3.5 3.5 0 017 0V9" fill="none" stroke="currentColor" stroke-width="2"/></svg>`
