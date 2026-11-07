/**
 * The balance scale board: a Cartridge. The whole sits on the left pan, one
 * part on the right beside an empty slot, numeral tiles in a tray below.
 * Drag a tile toward the right pan: the whole right side of the scale is the
 * drop zone, and a tile counts as there when its own box touches the pan or
 * the finger is anywhere in that zone. The beam tilts toward the heavier
 * side while the tile hovers and levels when the bond is complete. Owns
 * the drag and the feedback under the finger; reports every drop and every
 * solved puzzle to the Console. No text, no sound, no timer.
 */
import type { CartridgeHandle, Console } from '../../engine/cartridge'
import { draggable, hit, overlaps } from '../../engine/drag'
import { distinct } from '../../engine/variety'
import { bondKey } from '../../engine/rules'
import { el } from '../../ui/el'
import { generatePuzzle, type BalancePuzzle } from './generator'
import { balanceRules, type BalanceRules } from './rules'
import css from './board.css?inline'

/** Degrees of tilt per unit of difference, and the most the beam leans. */
const TILT_PER_UNIT = 3
const TILT_MAX = 12

export function mountBalance(container: HTMLElement, host: Console<BalanceRules>): CartridgeHandle {
  const rules: BalanceRules = { ...host.rules }
  const problem = balanceRules.validate(rules)
  if (problem) throw new Error(`Balance rules: ${problem}`)

  const style = el('style') as HTMLStyleElement
  style.dataset.mg = 'balance'
  style.textContent = css
  const board = el('div', 'mg-board mg-balance')
  container.append(style, board)

  let index = -1
  /** What the child perceives as this puzzle; never shown twice in a round or, via host.avoid, a session. */
  const puzzleKey = (p: BalancePuzzle) => `${p.whole}=${p.part}+${p.missing}`
  const used = new Set<string>(host.avoid ?? [])
  let puzzle: BalancePuzzle | null = null
  let wrong = 0
  let shownAt = 0
  let holding = false
  let detachers: Array<() => void> = []
  let beam: HTMLElement
  let rightPan: HTMLElement
  let slot: HTMLElement
  let zone: HTMLElement

  /** Is the carried tile over the right pan: finger in the zone, or the tile's box on the pan? */
  const onPan = (tile: HTMLElement, p: { x: number; y: number }) => hit(p, zone) || overlaps(tile, rightPan)

  function tilt(rightTotal: number) {
    if (!puzzle) return
    const diff = puzzle.whole - rightTotal
    const deg = Math.max(-TILT_MAX, Math.min(TILT_MAX, diff * TILT_PER_UNIT))
    // CSS rotation is clockwise, which drops the right end; the heavier side goes down.
    beam.style.setProperty('--mg-tilt', `${-deg}deg`)
    beam.classList.toggle('mg-level', diff === 0)
  }

  function show(i: number) {
    for (const d of detachers) d()
    detachers = []
    index = i
    puzzle = distinct(host.seed, i, used, (rng) => generatePuzzle(rng, rules), puzzleKey)
    used.add(puzzleKey(puzzle))
    wrong = 0
    holding = false
    shownAt = Date.now()
    board.innerHTML = ''

    const scale = el('div', 'mg-scale')
    beam = el('div', 'mg-beam')
    const leftPan = el('div', 'mg-pan mg-pan-left')
    leftPan.append(el('div', 'mg-weight', String(puzzle.whole)))
    rightPan = el('div', 'mg-pan mg-pan-right')
    slot = el('div', 'mg-slot')
    rightPan.append(el('div', 'mg-weight', String(puzzle.part)), slot)
    beam.append(leftPan, rightPan)
    zone = el('div', 'mg-drop')
    scale.append(zone, beam, el('div', 'mg-post'))

    const tray = el('div', 'mg-tray')
    for (const value of puzzle.tray) {
      const tile = el('div', 'mg-tile', String(value))
      tile.dataset.value = String(value)
      tray.append(tile)
      detachers.push(
        draggable(tile, {
          start: () => !holding && !tile.classList.contains('mg-placed'),
          over: (p) => {
            const over = onPan(tile, p)
            slot.classList.toggle('mg-over', over)
            tilt(puzzle!.part + (over ? value : 0))
          },
          drop: (p) => drop(tile, value, p),
        }),
      )
    }
    board.append(scale, tray)
    tilt(puzzle.part)
  }

  function drop(tile: HTMLElement, value: number, p: { x: number; y: number }): boolean {
    if (!puzzle || holding) return false
    slot.classList.remove('mg-over')
    if (!onPan(tile, p)) {
      tilt(puzzle.part)
      return false
    }
    const fact = bondKey('add', puzzle.part, value)
    const ms = Date.now() - shownAt
    if (value === puzzle.missing) {
      holding = true
      tile.classList.add('mg-placed')
      slot.append(tile)
      tilt(puzzle.part + value)
      host.report({ type: 'tap', correct: true, fact, ms })
      host.report({ type: 'puzzle', index, of: host.puzzles, wrong, ms, response: `${puzzle.whole}=${puzzle.part}+${value}`, key: puzzleKey(puzzle) })
      return true
    }
    wrong++
    tilt(puzzle.part + value)
    tile.classList.remove('mg-wrong')
    void tile.offsetWidth
    tile.classList.add('mg-wrong')
    tile.addEventListener(
      'animationend',
      () => {
        tile.classList.remove('mg-wrong')
        if (!holding) tilt(puzzle!.part)
      },
      { once: true },
    )
    host.report({ type: 'tap', correct: false, fact, ms })
    return false
  }

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
