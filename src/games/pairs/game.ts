/**
 * The Pairs board: a Cartridge. A target above a grid of numerals; the
 * child taps one tile, then another. Two that make the target stay greyed
 * out; two that do not shake and the pick clears. Decoys with no partner
 * stay live until the last pair is found. Owns the taps and the feedback
 * under the finger; reports every completed pair and every solved puzzle to
 * the Console. No text, no sound, no timer.
 */
import type { CartridgeHandle, Console } from '../../engine/cartridge'
import { distinct } from '../../engine/variety'
import { bondKey } from '../../engine/rules'
import { el } from '../../ui/el'
import { columnsFor, generatePuzzle, puzzleKey, type PairsPuzzle } from './generator'
import { pairsRules, type PairsRules } from './rules'
import css from './board.css?inline'

export function mountPairs(container: HTMLElement, host: Console<PairsRules>): CartridgeHandle {
  const rules: PairsRules = { ...host.rules }
  const problem = pairsRules.validate(rules)
  if (problem) throw new Error(`Pairs rules: ${problem}`)

  const style = el('style') as HTMLStyleElement
  style.dataset.mg = 'pairs'
  style.textContent = css
  const board = el('div', 'mg-board mg-pairs')
  container.append(style, board)

  let index = -1
  /** Keys never shown twice in a round or, via host.avoid, a session. */
  const used = new Set<string>(host.avoid ?? [])
  let puzzle: PairsPuzzle | null = null
  let picked: HTMLButtonElement | null = null
  let found: string[] = []
  let wrong = 0
  let shownAt = 0
  /** The current puzzle is solved and the board is holding for `next()`. */
  let holding = false

  function shake(btn: HTMLButtonElement) {
    btn.classList.remove('mg-wrong')
    void btn.offsetWidth
    btn.classList.add('mg-wrong')
    btn.addEventListener('animationend', () => btn.classList.remove('mg-wrong'), { once: true })
  }

  function tap(btn: HTMLButtonElement) {
    if (!puzzle || holding || btn.classList.contains('mg-found')) return
    if (picked === btn) {
      btn.classList.remove('mg-picked')
      picked = null
      return
    }
    if (!picked) {
      picked = btn
      btn.classList.add('mg-picked')
      return
    }
    const first = picked
    const x = Number(first.dataset.value)
    const y = Number(btn.dataset.value)
    const ms = Date.now() - shownAt
    const fact = bondKey('add', x, y)
    first.classList.remove('mg-picked')
    picked = null
    if (x + y === puzzle.target) {
      first.classList.add('mg-found')
      btn.classList.add('mg-found')
      found.push(`${x}+${y}`)
      host.report({ type: 'tap', correct: true, fact, ms })
      if (found.length >= puzzle.pairs) {
        holding = true
        board.classList.add('mg-done')
        host.report({ type: 'puzzle', index, of: host.puzzles, wrong, ms, response: found.join(';'), key: puzzleKey(puzzle) })
      }
    } else {
      wrong++
      shake(first)
      shake(btn)
      host.report({ type: 'tap', correct: false, fact, ms })
    }
  }

  function show(i: number) {
    index = i
    puzzle = distinct(host.seed, i, used, (rng) => generatePuzzle(rng, rules), puzzleKey)
    used.add(puzzleKey(puzzle))
    picked = null
    found = []
    wrong = 0
    holding = false
    shownAt = Date.now()
    board.innerHTML = ''
    board.classList.remove('mg-done')

    const grid = el('div', 'mg-grid')
    grid.style.setProperty('--mg-cols', String(columnsFor(puzzle.tiles.length)))
    for (const v of puzzle.tiles) {
      const b = el('button', 'mg-cell', String(v)) as HTMLButtonElement
      b.type = 'button'
      b.dataset.value = String(v)
      b.addEventListener('click', () => tap(b))
      grid.append(b)
    }
    board.append(el('div', 'mg-target', String(puzzle.target)), grid)
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
