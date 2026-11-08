/**
 * Pictures of a quantity, for pre-readers: a die face, a ten-frame, a
 * scatter of dots, tally marks. Pure functions from a number to an SVG
 * string (viewBox 0 0 100 100, drawn in currentColor), so a Cartridge can
 * show the same number several ways and a Console can style them by colour
 * alone. No text: a numeral is the one picture a Cartridge draws itself.
 */

export type PictureKind = 'die' | 'tenframe' | 'dots' | 'tally'

export const pictureKinds: PictureKind[] = ['die', 'tenframe', 'dots', 'tally']

/** Largest n each picture can show. */
export const pictureMax: Record<PictureKind, number> = { die: 6, tenframe: 20, dots: 20, tally: 20 }

const wrap = (body: string, cls: string) => `<svg viewBox="0 0 100 100" class="mg-pic mg-pic-${cls}" aria-hidden="true">${body}</svg>`

/** Pip positions of a standard die face, on a 3x3 of thirds. */
const PIPS: Record<number, Array<[number, number]>> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 28], [72, 28], [28, 50], [72, 50], [28, 72], [72, 72]],
}

export function dieSvg(n: number): string {
  if (!(n >= 1 && n <= 6)) throw new RangeError(`a die shows 1 to 6, not ${n}`)
  const pips = PIPS[n].map(([x, y]) => `<circle class="mg-pip" cx="${x}" cy="${y}" r="9" fill="currentColor"/>`).join('')
  return wrap(`<rect x="6" y="6" width="88" height="88" rx="16" fill="none" stroke="currentColor" stroke-width="4"/>${pips}`, 'die')
}

/** A 5x2 frame with n filled cells, filled left to right along the top row first; a second frame below it past 10. */
export function tenFrameSvg(n: number): string {
  if (!(n >= 0 && n <= 20)) throw new RangeError(`a ten-frame picture shows 0 to 20, not ${n}`)
  const frames = n > 10 ? 2 : 1
  const cellW = 17
  const cellH = frames === 2 ? 16 : 18
  const frameW = cellW * 5
  const gap = 8
  const totalH = cellH * 2 * frames + gap * (frames - 1)
  const x0 = (100 - frameW) / 2
  const y0 = (100 - totalH) / 2
  let body = ''
  let left = n
  for (let f = 0; f < frames; f++) {
    const fy = y0 + f * (cellH * 2 + gap)
    for (let i = 0; i < 10; i++) {
      const col = i % 5
      const row = Math.floor(i / 5)
      const cx = x0 + col * cellW
      const cy = fy + row * cellH
      body += `<rect x="${cx}" y="${cy}" width="${cellW}" height="${cellH}" fill="none" stroke="currentColor" stroke-width="1.5"/>`
      if (left > 0) {
        body += `<circle class="mg-dot" cx="${cx + cellW / 2}" cy="${cy + cellH / 2}" r="${cellW * 0.34}" fill="currentColor"/>`
        left--
      }
    }
  }
  return wrap(body, 'tenframe')
}

/**
 * Dots to subitize: 1..6 as die faces, 7..20 as rows of five with the
 * remainder below, so the fives show. Fixed layouts, never a random
 * scatter, so the same n always looks the same.
 */
export function dotsSvg(n: number): string {
  if (!(n >= 0 && n <= 20)) throw new RangeError(`a dots picture shows 0 to 20, not ${n}`)
  const pts: Array<[number, number]> = []
  if (n <= 6) {
    for (const p of PIPS[n] ?? []) pts.push(p)
  } else {
    const rows: number[] = []
    for (let left = n; left > 0; left -= 5) rows.push(Math.min(5, left))
    const pitch = rows.length <= 2 ? 18 : 15
    const y0 = 50 - ((rows.length - 1) * pitch * 1.3) / 2
    rows.forEach((count, r) => {
      const y = y0 + r * pitch * 1.3
      const span = (count - 1) * pitch
      for (let i = 0; i < count; i++) pts.push([50 - span / 2 + i * pitch, y])
    })
  }
  const r = n <= 6 ? 9 : n <= 10 ? 7 : 5.5
  return wrap(pts.map(([x, y]) => `<circle class="mg-dot" cx="${x}" cy="${y}" r="${r}" fill="currentColor"/>`).join(''), 'dots')
}

/** Tally marks in groups of five, the fifth stroke crossing the four. */
export function tallySvg(n: number): string {
  if (!(n >= 0 && n <= 20)) throw new RangeError(`a tally picture shows 0 to 20, not ${n}`)
  const groups: number[] = []
  for (let left = n; left > 0; left -= 5) groups.push(Math.min(5, left))
  const rows = groups.length > 2 ? 2 : 1
  const perRow = Math.ceil(groups.length / rows)
  const groupW = 30
  const stride = 7
  let body = ''
  groups.forEach((g, gi) => {
    const row = Math.floor(gi / perRow)
    const col = gi % perRow
    const inRow = Math.min(perRow, groups.length - row * perRow)
    const x0 = 50 - (inRow * groupW) / 2 + col * groupW + 4
    const y0 = rows === 1 ? 30 : 10 + row * 46
    const y1 = y0 + 40
    const strokes = Math.min(4, g)
    for (let i = 0; i < strokes; i++) {
      const x = x0 + i * stride
      body += `<line class="mg-tally" x1="${x}" y1="${y0}" x2="${x}" y2="${y1}" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`
    }
    if (g === 5) body += `<line class="mg-tally" x1="${x0 - 4}" y1="${y1 - 4}" x2="${x0 + 3 * stride + 4}" y2="${y0 + 4}" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`
  })
  return wrap(body, 'tally')
}

export function pictureSvg(kind: PictureKind, n: number): string {
  switch (kind) {
    case 'die':
      return dieSvg(n)
    case 'tenframe':
      return tenFrameSvg(n)
    case 'dots':
      return dotsSvg(n)
    case 'tally':
      return tallySvg(n)
  }
}

/** The picture kinds that can show n. */
export function kindsFor(n: number): PictureKind[] {
  return pictureKinds.filter((k) => n >= (k === 'die' ? 1 : 0) && n <= pictureMax[k])
}
