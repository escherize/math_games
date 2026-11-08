/**
 * The Other Number board: a Cartridge. The sum a + b sits at the top; below
 * it, two or three ways to split b. The child taps the split whose one part
 * completes a to ten; when the rules ask, three candidate totals then appear
 * and the child taps a + b. Owns the taps and the feedback under the finger
 * (the found split glows, the rest fade, a wrong tap shakes) and reports
 * every tap and every solved puzzle to the Console. No text, no sound, no
 * timer.
 */
import type { CartridgeHandle, Console } from '../../engine/cartridge'
import { distinct } from '../../engine/variety'
import { bondKey } from '../../engine/rules'
import { el } from '../../ui/el'
import { generatePuzzle, helpfulSplit, sameSplit, type OtherPuzzle, type Split } from './generator'
import { otherRules, type OtherRules } from './rules'
import css from './board.css?inline'

export function mountOther(container: HTMLElement, host: Console<OtherRules>): CartridgeHandle {
  const rules: OtherRules = { ...host.rules }
  const problem = otherRules.validate(rules)
  if (problem) throw new Error(`The Other Number rules: ${problem}`)

  const style = el('style') as HTMLStyleElement
  style.dataset.mg = 'other'
  style.textContent = css
  const board = el('div', 'mg-board mg-other')
  container.append(style, board)

  let index = -1
  /** What the child perceives as this puzzle; never shown twice in a round or, via host.avoid, a session. */
  const puzzleKey = (p: OtherPuzzle) => `${p.a}+${p.b}`
  const used = new Set<string>(host.avoid ?? [])
  let puzzle: OtherPuzzle | null = null
  let wrong = 0
  let shownAt = 0
  let holding = false
  /** The split has been found; only a total tap remains. */
  let splitFound = false
  let options: HTMLElement

  function shake(btn: HTMLElement) {
    btn.classList.remove('mg-wrong')
    void btn.offsetWidth
    btn.classList.add('mg-wrong')
    btn.addEventListener('animationend', () => btn.classList.remove('mg-wrong'), { once: true })
  }

  /** Two numerals with a drawn plus between them. */
  function pair(a: number, b: number): HTMLElement[] {
    return [el('span', 'mg-num', String(a)), el('span', 'mg-plus'), el('span', 'mg-num', String(b))]
  }

  function finish(ms: number) {
    const p = puzzle!
    const h = helpfulSplit(p.a, p.b)
    const x = 10 - p.a
    const y = h.p === x ? h.q : h.p
    holding = true
    board.classList.add('mg-done')
    host.report({
      type: 'puzzle',
      index,
      of: host.puzzles,
      wrong,
      ms,
      response: `${p.a}+${p.b}=${p.a}+${x}+${y}${rules.askTotal ? `=${p.a + p.b}` : ''}`,
      key: puzzleKey(p),
    })
  }

  function tapSplit(s: Split, btn: HTMLButtonElement) {
    if (!puzzle || holding || splitFound) return
    const ms = Date.now() - shownAt
    const fact = bondKey('add', 10 - puzzle.a, puzzle.a)
    if (sameSplit(s, helpfulSplit(puzzle.a, puzzle.b))) {
      splitFound = true
      btn.classList.add('mg-found')
      for (const o of Array.from(options.children)) if (o !== btn) o.classList.add('mg-muted')
      host.report({ type: 'tap', correct: true, fact, ms })
      if (rules.askTotal) board.append(totalsEl(puzzle))
      else finish(ms)
    } else {
      wrong++
      shake(btn)
      host.report({ type: 'tap', correct: false, fact, ms })
    }
  }

  function tapTotal(v: number, btn: HTMLButtonElement) {
    if (!puzzle || holding || !splitFound) return
    const ms = Date.now() - shownAt
    const fact = bondKey('add', puzzle.a, puzzle.b)
    if (v === puzzle.a + puzzle.b) {
      btn.classList.add('mg-found')
      for (const o of Array.from(btn.parentElement!.children)) if (o !== btn) o.classList.add('mg-muted')
      host.report({ type: 'tap', correct: true, fact, ms })
      finish(ms)
    } else {
      wrong++
      shake(btn)
      host.report({ type: 'tap', correct: false, fact, ms })
    }
  }

  function totalsEl(p: OtherPuzzle): HTMLElement {
    const row = el('div', 'mg-totals')
    for (const v of p.totals) {
      const b = el('button', 'mg-total', String(v)) as HTMLButtonElement
      b.type = 'button'
      b.dataset.value = String(v)
      b.addEventListener('click', () => tapTotal(v, b))
      row.append(b)
    }
    return row
  }

  function show(i: number) {
    index = i
    puzzle = distinct(host.seed, i, used, (rng) => generatePuzzle(rng, rules), puzzleKey)
    used.add(puzzleKey(puzzle))
    wrong = 0
    holding = false
    splitFound = false
    shownAt = Date.now()
    board.innerHTML = ''
    board.classList.remove('mg-done')

    const sum = el('div', 'mg-sum')
    sum.append(...pair(puzzle.a, puzzle.b))
    options = el('div', 'mg-options')
    for (const s of puzzle.options) {
      const b = el('button', 'mg-option') as HTMLButtonElement
      b.type = 'button'
      b.dataset.p = String(s.p)
      b.dataset.q = String(s.q)
      b.append(...pair(s.p, s.q))
      b.addEventListener('click', () => tapSplit(s, b))
      options.append(b)
    }
    board.append(sum, options)
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
