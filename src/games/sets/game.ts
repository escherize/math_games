/**
 * The Sets board: a Cartridge. Nine distinct numerals in a 3x3 grid; the
 * child picks three tiles, and if two of them add to the third the set is
 * found and its tiles go out. Any set counts, so a found set may strand the
 * rest; when no set is left the puzzle is solved with what was found. Owns
 * the picks and the feedback under the
 * finger (a picked tile fills, a found set greys, a wrong triple shakes) and
 * reports every completed triple and every solved puzzle to the Console.
 * No text, no sound, no timer: the Console does those.
 */
import type { CartridgeHandle, Console } from '../../engine/cartridge'
import { distinct } from '../../engine/variety'
import { bondKey } from '../../engine/rules'
import { el } from '../../ui/el'
import { generatePuzzle, puzzleKey, setsIn, type SetsPuzzle } from './generator'
import { setsRules, type SetsRules } from './rules'
import css from './board.css?inline'

export function mountSets(container: HTMLElement, host: Console<SetsRules>): CartridgeHandle {
  const rules: SetsRules = { ...host.rules }
  const problem = setsRules.validate(rules)
  if (problem) throw new Error(`Sets rules: ${problem}`)

  // The board carries its own stylesheet, so one JS file is the whole
  // cartridge wherever it is mounted. <style> is valid anywhere in the body
  // and the rules are all .mg-*, so nothing outside the board is touched.
  const style = el('style') as HTMLStyleElement
  style.dataset.mg = 'sets'
  style.textContent = css
  const board = el('div', 'mg-board mg-sets')
  container.append(style, board)

  let index = -1
  /** Never shown twice in a round or, via host.avoid, a session. */
  const used = new Set<string>(host.avoid ?? [])
  let puzzle: SetsPuzzle | null = null
  let tiles: HTMLButtonElement[] = []
  let pips: HTMLElement[] = []
  /** Cell indices picked so far, in tap order. */
  let picked: number[] = []
  let found = 0
  let wrong = 0
  let shownAt = 0
  let responses: string[] = []
  /** The current puzzle is solved and the board is holding for `next()`. */
  let holding = false

  function show(i: number) {
    index = i
    puzzle = distinct(host.seed, i, used, (rng) => generatePuzzle(rng, rules), puzzleKey)
    used.add(puzzleKey(puzzle))
    picked = []
    found = 0
    wrong = 0
    responses = []
    holding = false
    shownAt = Date.now()
    board.innerHTML = ''
    board.className = 'mg-board mg-sets'
    const grid = el('div', 'mg-grid')
    tiles = puzzle.cells.map((value, idx) => {
      const b = el('button', 'mg-cell', String(value)) as HTMLButtonElement
      b.type = 'button'
      b.dataset.value = String(value)
      b.addEventListener('click', () => tap(idx))
      grid.append(b)
      return b
    })
    const row = el('div', 'mg-pips')
    pips = []
    for (let p = 0; p < rules.setsRequired; p++) {
      const pip = el('span', 'mg-pip')
      pips.push(pip)
      row.append(pip)
    }
    board.append(grid, row)
  }

  function tap(idx: number) {
    if (!puzzle || holding) return
    const btn = tiles[idx]
    if (btn.classList.contains('mg-found')) return
    const at = picked.indexOf(idx)
    if (at >= 0) {
      picked.splice(at, 1)
      btn.classList.remove('mg-picked')
      return
    }
    picked.push(idx)
    btn.classList.add('mg-picked')
    if (picked.length < 3) return

    const trio = picked.slice()
    const [small, mid, large] = trio.map((i) => puzzle!.cells[i]).sort((a, b) => a - b)
    const fact = bondKey('add', small, mid)
    const ms = Date.now() - shownAt
    picked = []
    if (small + mid === large) {
      found++
      responses.push(`${small}+${mid}=${large}`)
      for (const i of trio) tiles[i].classList.replace('mg-picked', 'mg-found')
      pips[found - 1]?.classList.add('mg-lit')
      host.report({ type: 'tap', correct: true, fact, ms })
      const live = puzzle.cells.filter((_, i) => !tiles[i].classList.contains('mg-found'))
      if (found >= rules.setsRequired || setsIn(live).length === 0) {
        holding = true
        board.classList.add('mg-done')
        host.report({ type: 'puzzle', index, of: host.puzzles, wrong, ms, response: responses.join(';'), key: puzzleKey(puzzle) })
      }
    } else {
      wrong++
      for (const i of trio) {
        const t = tiles[i]
        t.classList.remove('mg-picked', 'mg-wrong')
        void t.offsetWidth
        t.classList.add('mg-wrong')
        t.addEventListener('animationend', () => t.classList.remove('mg-wrong'), { once: true })
      }
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
