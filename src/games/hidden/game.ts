/**
 * The hidden-bonds board: a Cartridge. One number above a row of its dots;
 * a divider slides along the row and the dots either side take two
 * colours. Each release at a split the shelf does not hold yet shelves it;
 * the puzzle is solved when enough bonds are shelved. Owns the drag and the
 * feedback under the finger; reports every new bond and every solved
 * puzzle to the Console. No text, no sound, no timer.
 */
import type { CartridgeHandle, Console } from '../../engine/cartridge'
import { gesture, type Point } from '../../engine/drag'
import { distinct } from '../../engine/variety'
import { bondKey } from '../../engine/rules'
import { el } from '../../ui/el'
import { generatePuzzle, type HiddenPuzzle } from './generator'
import { hiddenRules, splitKey, splitsOf, type HiddenRules } from './rules'
import css from './board.css?inline'

export function mountHidden(container: HTMLElement, host: Console<HiddenRules>): CartridgeHandle {
  const rules: HiddenRules = { ...host.rules }
  const problem = hiddenRules.validate(rules)
  if (problem) throw new Error(`Hidden bonds rules: ${problem}`)

  const style = el('style') as HTMLStyleElement
  style.dataset.mg = 'hidden'
  style.textContent = css
  const board = el('div', 'mg-board mg-hidden')
  container.append(style, board)

  let index = -1
  /** What the child perceives as this puzzle; never shown twice in a round or, via host.avoid, a session. */
  const puzzleKey = (p: HiddenPuzzle) => String(p.n)
  const used = new Set<string>(host.avoid ?? [])
  let puzzle: HiddenPuzzle | null = null
  let shownAt = 0
  let holding = false
  let detach: (() => void) | null = null
  let row: HTMLElement
  let divider: HTMLElement
  let shelf: HTMLElement
  let dots: HTMLElement[] = []
  let found: Array<{ a: number; b: number }> = []
  const shelved = new Map<string, HTMLElement>()

  /** The split a (dots left of the finger) the row allows nearest to x. */
  function splitAt(x: number): number {
    const allowed = splitsOf(puzzle!.n, rules)
    let a = 0
    for (const d of dots) {
      const r = d.getBoundingClientRect()
      if (r.left + r.width / 2 < x) a++
    }
    return Math.max(allowed[0], Math.min(allowed[allowed.length - 1], a))
  }

  /** Place the divider at the gap after `a` dots and tint the dots. */
  function place(a: number) {
    const base = row.getBoundingClientRect()
    const first = dots[0].getBoundingClientRect()
    const last = dots[dots.length - 1].getBoundingClientRect()
    const gap = dots.length > 1 ? dots[1].getBoundingClientRect().left - first.right : 10
    let x: number
    if (a <= 0) x = first.left - gap / 2 - 8
    else if (a >= dots.length) x = last.right + gap / 2 + 8
    else x = (dots[a - 1].getBoundingClientRect().right + dots[a].getBoundingClientRect().left) / 2
    divider.style.left = `${x - base.left}px`
    dots.forEach((d, i) => {
      d.classList.toggle('mg-left', i < a)
      d.classList.toggle('mg-right', i >= a)
    })
  }

  function shelve(a: number) {
    if (!puzzle) return
    const b = puzzle.n - a
    const key = splitKey(a, b, rules)
    const ms = Date.now() - shownAt
    const existing = shelved.get(key)
    if (existing) {
      existing.classList.remove('mg-again')
      void existing.offsetWidth
      existing.classList.add('mg-again')
      existing.addEventListener('animationend', () => existing.classList.remove('mg-again'), { once: true })
      return
    }
    const item = el('div', 'mg-bond')
    const group = el('div', 'mg-dots')
    for (let i = 0; i < a; i++) group.append(el('span', 'mg-dot mg-left'))
    for (let i = 0; i < b; i++) group.append(el('span', 'mg-dot mg-right'))
    item.append(group, el('span', 'mg-num', String(a)), el('span', 'mg-plus'), el('span', 'mg-num', String(b)))
    shelf.append(item)
    shelved.set(key, item)
    found.push({ a, b })
    host.report({ type: 'tap', correct: true, fact: bondKey('add', a, b), ms })
    if (found.length >= puzzle.needed) {
      holding = true
      row.classList.add('mg-done')
      host.report({
        type: 'puzzle',
        index,
        of: host.puzzles,
        wrong: 0,
        ms,
        response: found.map((f) => `${puzzle!.n}=${f.a}+${f.b}`).join(';'),
        key: puzzleKey(puzzle!),
      })
    }
  }

  function show(i: number) {
    detach?.()
    detach = null
    index = i
    puzzle = distinct(host.seed, i, used, (rng) => generatePuzzle(rng, rules), puzzleKey)
    used.add(puzzleKey(puzzle))
    shownAt = Date.now()
    holding = false
    found = []
    shelved.clear()
    board.innerHTML = ''

    row = el('div', 'mg-row')
    dots = []
    for (let k = 0; k < puzzle.n; k++) {
      const d = el('div', 'mg-dot')
      dots.push(d)
      row.append(d)
    }
    divider = el('div', 'mg-divider mg-settled')
    row.append(divider)
    shelf = el('div', 'mg-shelf')
    board.append(el('div', 'mg-total', String(puzzle.n)), row, shelf)

    const allowed = splitsOf(puzzle.n, rules)
    place(allowed[Math.floor(allowed.length / 2)])

    detach = gesture(row, {
      start(p: Point) {
        if (holding) return false
        divider.classList.remove('mg-settled')
        divider.classList.add('mg-dragging')
        follow(p)
      },
      move(p) {
        follow(p)
      },
      end(p, cancelled) {
        divider.classList.remove('mg-dragging')
        divider.classList.add('mg-settled')
        const a = splitAt(p.x)
        place(a)
        if (!cancelled) shelve(a)
      },
    })
  }

  /** The handle rides under the finger (clamped to the row); the tint follows the nearest split. */
  function follow(p: Point) {
    const base = row.getBoundingClientRect()
    const x = Math.max(base.left, Math.min(base.right, p.x))
    const a = splitAt(p.x)
    divider.style.left = `${x - base.left}px`
    dots.forEach((d, i) => {
      d.classList.toggle('mg-left', i < a)
      d.classList.toggle('mg-right', i >= a)
    })
  }

  show(0)

  return {
    next() {
      if (!holding || index + 1 >= host.puzzles) return false
      show(index + 1)
      return true
    },
    destroy() {
      detach?.()
      detach = null
      puzzle = null
      board.remove()
      style.remove()
    },
  }
}
