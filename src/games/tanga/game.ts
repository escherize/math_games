/**
 * The Same Number board: a Cartridge. Two cards of pictured numbers; tap
 * the number that is on both. Owns the taps and the feedback under the
 * finger (both twin panels glow, a wrong one shakes) and reports every tap
 * and every solved puzzle to the Console. No text beyond numerals, no
 * sound, no timer: the Console does those.
 */
import type { CartridgeHandle, Console } from '../../engine/cartridge'
import { pictureSvg } from '../../engine/pictures'
import { distinct } from '../../engine/variety'
import { el } from '../../ui/el'
import { generatePuzzle, type Panel, type TangaPuzzle } from './generator'
import { tangaRules, type TangaRules } from './rules'
import css from './board.css?inline'

export function mountTanga(container: HTMLElement, host: Console<TangaRules>): CartridgeHandle {
  const rules: TangaRules = { ...host.rules }
  const problem = tangaRules.validate(rules)
  if (problem) throw new Error(`Same Number rules: ${problem}`)

  const style = el('style') as HTMLStyleElement
  style.dataset.mg = 'tanga'
  style.textContent = css
  const board = el('div', 'mg-board mg-tanga')
  container.append(style, board)

  let index = -1
  /** What the child perceives as this puzzle: the number on both cards. Never shown twice in a round or, via host.avoid, a session. */
  const puzzleKey = (p: TangaPuzzle) => String(p.shared)
  const used = new Set<string>(host.avoid ?? [])
  let puzzle: TangaPuzzle | null = null
  let wrong = 0
  let shownAt = 0
  let holding = false

  function show(i: number) {
    index = i
    puzzle = distinct(host.seed, i, used, (rng) => generatePuzzle(rng, rules), puzzleKey)
    used.add(puzzleKey(puzzle))
    wrong = 0
    holding = false
    shownAt = Date.now()
    board.innerHTML = ''
    board.className = 'mg-board mg-tanga'
    for (const card of puzzle.cards) board.append(cardEl(card))
  }

  function cardEl(panels: Panel[]): HTMLElement {
    const card = el('div', 'mg-card')
    card.dataset.panels = String(panels.length)
    for (const panel of panels) {
      const b = el('button', `mg-panel mg-kind-${panel.kind}`) as HTMLButtonElement
      b.type = 'button'
      b.dataset.value = String(panel.value)
      b.dataset.kind = panel.kind
      if (panel.kind === 'numeral') b.textContent = String(panel.value)
      else b.innerHTML = pictureSvg(panel.kind, panel.value)
      b.addEventListener('click', () => tap(panel.value, b))
      card.append(b)
    }
    return card
  }

  function tap(value: number, btn: HTMLButtonElement) {
    if (!puzzle || holding) return
    const fact = String(puzzle.shared)
    const ms = Date.now() - shownAt
    if (value === puzzle.shared) {
      for (const twin of board.querySelectorAll(`.mg-panel[data-value="${value}"]`)) twin.classList.add('mg-found')
      board.classList.add('mg-done')
      holding = true
      host.report({ type: 'tap', correct: true, fact, ms })
      host.report({ type: 'puzzle', index, of: host.puzzles, wrong, ms, response: fact, key: puzzleKey(puzzle) })
    } else {
      wrong++
      btn.classList.remove('mg-wrong')
      void btn.offsetWidth
      btn.classList.add('mg-wrong')
      btn.addEventListener('animationend', () => btn.classList.remove('mg-wrong'), { once: true })
      host.report({ type: 'tap', correct: false, fact, ms })
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
