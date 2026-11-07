/**
 * The bond builder board: a Cartridge. One to three part-part-whole
 * triangles with dashed blanks and a tray of numeral tiles below; every
 * tile belongs in exactly one blank. Drag tiles into blanks (or back out);
 * when the last blank fills, each triangle checks itself: the ones that add
 * up settle, the ones that do not shake and hand their tiles back. Owns the
 * drag and the feedback under the finger; reports every check and every
 * solved puzzle to the Console. No text, no sound, no timer.
 */
import type { CartridgeHandle, Console } from '../../engine/cartridge'
import { draggable, overlaps, type Point } from '../../engine/drag'
import { mulberry32 } from '../../engine/rng'
import { bondKey } from '../../engine/rules'
import { el } from '../../ui/el'
import { generatePuzzle, valueAt, type BuilderPuzzle, type Slot, type Triangle } from './generator'
import { builderRules, type BuilderRules } from './rules'
import css from './board.css?inline'

/** A blank's drop zone is its own box grown by this much on every side: a finger is not a cursor. */
const ZONE_PAD = 24

/** Is the point inside the element's box grown by `pad` px on every side? */
function near(p: Point, e: Element, pad: number): boolean {
  const r = e.getBoundingClientRect()
  return p.x >= r.left - pad && p.x <= r.right + pad && p.y >= r.top - pad && p.y <= r.bottom + pad
}

interface Board {
  triangle: Triangle
  root: HTMLElement
  /** Slot elements by position: 0 whole, 1 and 2 parts. Blanks are `.mg-blank`. */
  slots: [HTMLElement, HTMLElement, HTMLElement]
}

export function mountBuilder(container: HTMLElement, host: Console<BuilderRules>): CartridgeHandle {
  const rules: BuilderRules = { ...host.rules }
  const problem = builderRules.validate(rules)
  if (problem) throw new Error(`Builder rules: ${problem}`)

  const style = el('style') as HTMLStyleElement
  style.dataset.mg = 'builder'
  style.textContent = css
  const board = el('div', 'mg-board mg-builder')
  container.append(style, board)

  let index = -1
  let puzzle: BuilderPuzzle | null = null
  let wrong = 0
  let shownAt = 0
  let holding = false
  let checking = false
  let detachers: Array<() => void> = []
  let boards: Board[] = []
  let blanks: HTMLElement[] = []
  let tray: HTMLElement

  const tileIn = (blank: HTMLElement) => blank.querySelector<HTMLElement>('.mg-tile')
  const valueOf = (e: HTMLElement) => Number(e.dataset.value)

  /** The blank the carried tile is over: finger in the grown zone, or the tile's own box on the blank. */
  function target(tile: HTMLElement, p: Point): HTMLElement | null {
    for (const b of blanks) if (b.closest('.mg-valid') === null && (near(p, b, ZONE_PAD) || overlaps(tile, b))) return b
    return null
  }

  function toTray(tile: HTMLElement) {
    tile.classList.remove('mg-placed')
    tray.append(tile)
  }

  function show(i: number) {
    for (const d of detachers) d()
    detachers = []
    index = i
    puzzle = generatePuzzle(mulberry32(host.seed + i), rules)
    wrong = 0
    holding = false
    checking = false
    shownAt = Date.now()
    board.innerHTML = ''
    boards = []
    blanks = []

    const row = el('div', 'mg-triangles')
    for (const t of puzzle.triangles) {
      const root = el('div', 'mg-triangle')
      const slots = ([0, 1, 2] as Slot[]).map((s) => {
        const blank = t.blanks.includes(s)
        const e = el('div', `${s === 0 ? 'mg-whole' : 'mg-part'} ${blank ? 'mg-blank' : 'mg-given'}`, blank ? '' : String(valueAt(t, s)))
        e.dataset.slot = String(s)
        if (blank) blanks.push(e)
        return e
      }) as Board['slots']
      root.append(...slots)
      row.append(root)
      boards.push({ triangle: t, root, slots })
    }

    tray = el('div', 'mg-tray')
    for (const value of puzzle.tray) {
      const tile = el('div', 'mg-tile', String(value))
      tile.dataset.value = String(value)
      tray.append(tile)
      detachers.push(
        draggable(tile, {
          start: () => !holding && !checking && tile.closest('.mg-valid') === null,
          over: (p) => {
            const b = target(tile, p)
            for (const x of blanks) x.classList.toggle('mg-over', x === b)
          },
          drop: (p) => drop(tile, p),
        }),
      )
    }
    board.append(row, tray)
  }

  function drop(tile: HTMLElement, p: Point): boolean {
    if (!puzzle || holding || checking) return false
    for (const x of blanks) x.classList.remove('mg-over')
    const from = tile.parentElement?.classList.contains('mg-blank') ? tile.parentElement : null
    const b = target(tile, p)
    if (!b) {
      if (!from) return false
      toTray(tile)
      return true
    }
    const other = tileIn(b)
    if (other && other !== tile) toTray(other)
    tile.classList.add('mg-placed')
    b.append(tile)
    if (blanks.every((x) => tileIn(x))) check()
    return true
  }

  function check() {
    if (!puzzle) return
    const ms = Date.now() - shownAt
    const results = boards.map((bd) => {
      const v = bd.slots.map((s) => (s.classList.contains('mg-blank') ? valueOf(tileIn(s)!) : valueOf0(s))) as [number, number, number]
      return { bd, whole: v[0], a: v[1], b: v[2], valid: v[0] === v[1] + v[2] }
    })
    const bad = results.filter((r) => !r.valid)
    if (bad.length === 0) {
      holding = true
      for (const r of results) {
        r.bd.root.classList.add('mg-valid')
        host.report({ type: 'tap', correct: true, fact: bondKey('add', r.a, r.b), ms })
      }
      const response = results.map((r) => `${r.whole}=${Math.min(r.a, r.b)}+${Math.max(r.a, r.b)}`).join(';')
      host.report({ type: 'puzzle', index, of: host.puzzles, wrong, ms, response })
      return
    }
    checking = true
    let pending = bad.length
    for (const r of bad) {
      wrong++
      host.report({ type: 'tap', correct: false, fact: bondKey('add', r.a, r.b), ms })
      const root = r.bd.root
      root.classList.remove('mg-wrong')
      void root.offsetWidth
      root.classList.add('mg-wrong')
      root.addEventListener(
        'animationend',
        () => {
          root.classList.remove('mg-wrong')
          for (const s of r.bd.slots) {
            const t = s.classList.contains('mg-blank') ? tileIn(s) : null
            if (t) toTray(t)
          }
          if (--pending === 0) checking = false
        },
        { once: true },
      )
    }
  }

  const valueOf0 = (e: HTMLElement) => Number(e.textContent)

  show(0)

  return {
    next() {
      if (!holding || index + 1 >= host.puzzles) return false
      show(index + 1)
      return true
    },
    destroy() {
      for (const d of detachers) d()
      detachers = []
      puzzle = null
      board.remove()
      style.remove()
    },
  }
}
