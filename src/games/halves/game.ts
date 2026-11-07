/**
 * The Halves board: a Cartridge. A row of n blocks and a cutter that slides
 * along it. Wherever the cutter sits, the blocks on either side take a
 * colour, their counts show underneath and the heavier side sags. Let go:
 * equal parts (or, with odd rows allowed, parts one apart with the extra
 * block lifted out) level the row and solve the puzzle; unequal parts count
 * as a wrong try and the cutter stays where it snapped. One finger anywhere
 * on the board moves the cutter, so the target is the whole board. No text,
 * no sound, no timer.
 */
import type { CartridgeHandle, Console } from '../../engine/cartridge'
import { gesture, type Point } from '../../engine/drag'
import { distinct } from '../../engine/variety'
import { bondKey } from '../../engine/rules'
import { el } from '../../ui/el'
import { generatePuzzle, type HalvesPuzzle } from './generator'
import { halvesRules, type HalvesRules } from './rules'
import css from './board.css?inline'

/** Pixels of sag per block of difference, and the most a side drops. */
const SAG_PER_BLOCK = 2
const SAG_MAX = 10

export function mountHalves(container: HTMLElement, host: Console<HalvesRules>): CartridgeHandle {
  const rules: HalvesRules = { ...host.rules }
  const problem = halvesRules.validate(rules)
  if (problem) throw new Error(`Halves rules: ${problem}`)

  const style = el('style') as HTMLStyleElement
  style.dataset.mg = 'halves'
  style.textContent = css
  const board = el('div', 'mg-board mg-halves')
  container.append(style, board)

  let index = -1
  /** What the child perceives as this puzzle; never shown twice in a round or, via host.avoid, a session. */
  const puzzleKey = (p: HalvesPuzzle) => String(p.n)
  const used = new Set<string>(host.avoid ?? [])
  let puzzle: HalvesPuzzle | null = null
  let wrong = 0
  let shownAt = 0
  let holding = false
  let gap = 0
  let rail: HTMLElement
  let row: HTMLElement
  let divider: HTMLElement
  let blocks: HTMLElement[] = []
  let countLeft: HTMLElement
  let countRight: HTMLElement

  /** Client x of every gap between blocks: before the first, between each pair, after the last. */
  function gapXs(): number[] {
    const xs: number[] = []
    for (let k = 0; k <= blocks.length; k++) {
      if (k === 0) xs.push(blocks[0].getBoundingClientRect().left)
      else if (k === blocks.length) xs.push(blocks[k - 1].getBoundingClientRect().right)
      else xs.push((blocks[k - 1].getBoundingClientRect().right + blocks[k].getBoundingClientRect().left) / 2)
    }
    return xs
  }

  function nearestGap(x: number): number {
    const xs = gapXs()
    let best = 0
    for (let k = 1; k < xs.length; k++) if (Math.abs(xs[k] - x) < Math.abs(xs[best] - x)) best = k
    return best
  }

  function place(x: number) {
    divider.style.left = `${x - rail.getBoundingClientRect().left}px`
  }

  /** Colour the two sides for a cut after `k` blocks and show their weights. */
  function paint(k: number) {
    if (!puzzle) return
    gap = k
    const a = k
    const b = puzzle.n - k
    blocks.forEach((blk, i) => {
      blk.classList.toggle('mg-left', i < k)
      blk.classList.toggle('mg-right', i >= k)
      blk.classList.remove('mg-over')
    })
    countLeft.textContent = String(a)
    countRight.textContent = String(b)
    const sag = Math.max(-SAG_MAX, Math.min(SAG_MAX, (b - a) * SAG_PER_BLOCK))
    row.style.setProperty('--mg-sag', `${sag}px`)
  }

  function show(i: number) {
    index = i
    puzzle = distinct(host.seed, i, used, (rng) => generatePuzzle(rng, rules), puzzleKey)
    used.add(puzzleKey(puzzle))
    wrong = 0
    holding = false
    shownAt = Date.now()
    board.innerHTML = ''
    board.classList.remove('mg-level', 'mg-wrong')
    board.style.setProperty('--mg-cols', String(puzzle.n))

    rail = el('div', 'mg-rail')
    row = el('div', 'mg-row')
    blocks = []
    for (let k = 0; k < puzzle.n; k++) {
      const blk = el('div', 'mg-block')
      blocks.push(blk)
      row.append(blk)
    }
    divider = el('div', 'mg-divider')
    rail.append(row, divider)
    const counts = el('div', 'mg-counts')
    countLeft = el('div', 'mg-count mg-count-left')
    countRight = el('div', 'mg-count mg-count-right')
    counts.append(countLeft, countRight)
    board.append(rail, counts)
    paint(0)
    divider.style.left = '0px'
  }

  function release(x: number) {
    if (!puzzle || holding) return
    const k = nearestGap(x)
    paint(k)
    place(gapXs()[k])
    const a = Math.min(k, puzzle.n - k)
    const b = Math.max(k, puzzle.n - k)
    const fact = bondKey('add', a, b)
    const ms = Date.now() - shownAt
    const even = a === b
    const oddOk = rules.allowOdd && b - a === 1
    if (even || oddOk) {
      holding = true
      if (oddOk) {
        // The extra block is the one beside the cut on the bigger side.
        const extra = k > puzzle.n - k ? blocks[k - 1] : blocks[k]
        extra.classList.remove('mg-left', 'mg-right')
        extra.classList.add('mg-over')
      }
      row.style.setProperty('--mg-sag', '0px')
      board.classList.add('mg-level')
      host.report({ type: 'tap', correct: true, fact, ms })
      host.report({ type: 'puzzle', index, of: host.puzzles, wrong, ms, response: `${puzzle.n}=${a}+${b}`, key: puzzleKey(puzzle) })
      return
    }
    wrong++
    board.classList.remove('mg-wrong')
    void board.offsetWidth
    board.classList.add('mg-wrong')
    board.addEventListener('animationend', () => board.classList.remove('mg-wrong'), { once: true })
    host.report({ type: 'tap', correct: false, fact, ms })
  }

  const detach = gesture(board, {
    start(p: Point) {
      if (holding) return false
      divider.classList.add('mg-dragging')
      follow(p.x)
    },
    move(p: Point) {
      follow(p.x)
    },
    end(p: Point, cancelled: boolean) {
      divider.classList.remove('mg-dragging')
      if (cancelled) {
        place(gapXs()[gap])
        return
      }
      release(p.x)
    },
  })

  /** The cutter tracks the finger's x, clamped to the row, and the sides recolour live. */
  function follow(x: number) {
    const xs = gapXs()
    const clamped = Math.max(xs[0], Math.min(xs[xs.length - 1], x))
    place(clamped)
    paint(nearestGap(clamped))
  }

  show(0)

  return {
    next() {
      if (!holding || index + 1 >= host.puzzles) return false
      show(index + 1)
      return true
    },
    destroy() {
      detach()
      puzzle = null
      board.remove()
      style.remove()
    },
  }
}
