/**
 * The Pins board: a Cartridge. A rack of numbered pins under a roll of one
 * or two dice. Tap the pin that matches the roll, or one pin and then
 * another that add to it (or, when allowed, differ by it): they fall and
 * the roll is solved. With manyPins any set of pins that adds to the roll
 * falls; picking past the roll is a wrong tap, and a knock that takes the
 * most pins the rack allows is a strike. Fallen pins stay down across the round's puzzles and
 * only stand again when nothing standing can make a roll; each roll is
 * drawn from what the standing pins can make. Owns the taps and the
 * feedback under the finger; reports every tap and every solved puzzle to
 * the Console. No text, no sound, no timer.
 */
import type { CartridgeHandle, Console } from '../../engine/cartridge'
import { dieSvg } from '../../engine/pictures'
import { bondKey } from '../../engine/rules'
import { distinct } from '../../engine/variety'
import { el } from '../../ui/el'
import { achievable, bestKnock, generateRoll, maxPinsPerKnock, rackRows, type PinsPuzzle } from './generator'
import { pinsRules, type PinsRules } from './rules'
import css from './board.css?inline'

export function mountPins(container: HTMLElement, host: Console<PinsRules>): CartridgeHandle {
  const rules: PinsRules = { ...host.rules }
  const problem = pinsRules.validate(rules)
  if (problem) throw new Error(`Pins rules: ${problem}`)

  const style = el('style') as HTMLStyleElement
  style.dataset.mg = 'pins'
  style.textContent = css
  const board = el('div', 'mg-board mg-pins')
  const rollEl = el('div', 'mg-roll')
  const lane = el('div', 'mg-lane')
  board.append(rollEl, lane)
  container.append(style, board)

  /** Pin buttons by value; built once, the set persists across puzzles. */
  const pinEls = new Map<number, HTMLButtonElement>()
  for (const row of rackRows(rules.pins)) {
    const rowEl = el('div', 'mg-row')
    for (const value of row) {
      const b = el('button', 'mg-pin', String(value)) as HTMLButtonElement
      b.type = 'button'
      b.dataset.value = String(value)
      b.addEventListener('click', () => tap(value))
      pinEls.set(value, b)
      rowEl.append(b)
    }
    lane.append(rowEl)
  }

  let index = -1
  /** What the child perceives as this puzzle: the roll. Never shown twice in a round while the standing pins allow it. */
  const puzzleKey = (p: PinsPuzzle) => String(p.roll)
  const used = new Set<string>(host.avoid ?? [])
  let puzzle: PinsPuzzle | null = null
  const picked = new Set<number>()
  const limit = maxPinsPerKnock(rules)
  let wrong = 0
  let shownAt = 0
  let holding = false

  const standing = () => [...pinEls.entries()].filter(([, b]) => !b.classList.contains('mg-down')).map(([v]) => v)

  function knock(values: number[]) {
    for (const v of values) {
      const b = pinEls.get(v)!
      b.classList.remove('mg-picked')
      b.classList.add('mg-down')
    }
  }

  function shake(values: number[]) {
    for (const v of values) {
      const b = pinEls.get(v)!
      b.classList.remove('mg-picked', 'mg-wrong')
      void b.offsetWidth
      b.classList.add('mg-wrong')
      b.addEventListener('animationend', () => b.classList.remove('mg-wrong'), { once: true })
    }
  }

  function solve(values: number[], response: string, fact: string, ms: number) {
    knock(values)
    picked.clear()
    holding = true
    board.classList.add('mg-done')
    if (rules.manyPins && values.length >= 2 && values.length === bestKnock(puzzle!.roll, [...values, ...standing()], rules)) board.classList.add('mg-strike')
    host.report({ type: 'tap', correct: true, fact, ms })
    host.report({ type: 'puzzle', index, of: host.puzzles, wrong, ms, response, key: puzzleKey(puzzle!) })
  }

  function tap(value: number) {
    if (!puzzle || holding) return
    const b = pinEls.get(value)!
    if (b.classList.contains('mg-down')) return
    const ms = Date.now() - shownAt
    const roll = puzzle.roll
    if (picked.has(value)) {
      picked.delete(value)
      b.classList.remove('mg-picked')
      return
    }
    const chosen = [...picked, value].sort((x, y) => x - y)
    const total = chosen.reduce((s, v) => s + v, 0)
    if (total === roll) {
      solve(chosen, chosen.length === 1 ? String(roll) : `${roll}=${chosen.join('+')}`, factOf(chosen), ms)
      return
    }
    if (chosen.length === 2 && rules.allowDifference && chosen[1] - chosen[0] === roll) {
      solve(chosen, `${roll}=${chosen[1]}-${chosen[0]}`, bondKey('add', roll, chosen[0]), ms)
      return
    }
    // Past the roll (unless a second pin could still take away to it), or at the pin limit without making it: wrong, start over.
    const mayStillDiffer = rules.allowDifference && chosen.length === 1
    if ((total > roll && !mayStillDiffer) || chosen.length >= limit) {
      wrong++
      picked.clear()
      shake(chosen)
      host.report({ type: 'tap', correct: false, fact: factOf(chosen), ms })
      return
    }
    picked.add(value)
    b.classList.add('mg-picked')
  }

  /** Stats key: a lone pin is the number, two pins a bond, more pins their sum written out. */
  function factOf(values: number[]): string {
    if (values.length === 1) return String(values[0])
    if (values.length === 2) return bondKey('add', values[0], values[1])
    return values.join('+')
  }

  function show(i: number) {
    index = i
    holding = false
    wrong = 0
    picked.clear()
    board.classList.remove('mg-done', 'mg-strike')
    for (const b of pinEls.values()) b.classList.remove('mg-picked')
    // The rack stands again only when nothing standing can make a roll.
    if (achievable(standing(), rules).length === 0) for (const b of pinEls.values()) b.classList.remove('mg-down')
    const up = standing()
    puzzle = distinct(host.seed, i, used, (rng) => generateRoll(rng, rules, up)!, puzzleKey)
    used.add(puzzleKey(puzzle))
    shownAt = Date.now()
    rollEl.innerHTML = ''
    rollEl.dataset.roll = String(puzzle.roll)
    for (const face of puzzle.dice) {
      const die = el('div', 'mg-die')
      die.innerHTML = dieSvg(face)
      rollEl.append(die)
    }
  }

  show(0)

  return {
    next() {
      if (!holding || index + 1 >= host.puzzles) return false
      show(index + 1)
      return true
    },
    destroy() {
      puzzle = null
      board.remove()
      style.remove()
    },
  }
}
