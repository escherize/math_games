/**
 * The Bridge to Ten board: a Cartridge. Two ten-frames, a and b dots. Drag
 * dots from the second frame into the first until it is full; the split of
 * b stays visible as the dots that moved and the dots left behind. Then, if
 * the rules ask, tap the total. Owns the drags and taps and the feedback
 * under the finger; reports every answer to the Console. No text, no sound.
 */
import type { CartridgeHandle, Console } from '../../engine/cartridge'
import { draggable, pick } from '../../engine/drag'
import { mulberry32 } from '../../engine/rng'
import { bondKey } from '../../engine/rules'
import { el } from '../../ui/el'
import { generatePuzzle, type Puzzle } from './generator'
import { bridgeRules, type BridgeRules } from './rules'
import css from './board.css?inline'

export function mountBridge(container: HTMLElement, host: Console<BridgeRules>): CartridgeHandle {
  const rules: BridgeRules = { ...host.rules }
  const problem = bridgeRules.validate(rules)
  if (problem) throw new Error(`Bridge rules: ${problem}`)

  const style = el('style') as HTMLStyleElement
  style.dataset.mg = 'bridge'
  style.textContent = css
  const board = el('div', 'mg-board')
  container.append(style, board)

  let index = -1
  let puzzle: Puzzle | null = null
  let wrong = 0
  let shownAt = 0
  let holding = false
  let detachers: Array<() => void> = []
  let left: HTMLElement
  let right: HTMLElement
  let choices: HTMLElement

  const emptyLeftCells = () => Array.from(left.querySelectorAll<HTMLElement>('.mg-cell')).filter((c) => !c.querySelector('.mg-dot'))
  const leftCount = () => left.querySelectorAll('.mg-dot').length

  function show(i: number) {
    index = i
    puzzle = generatePuzzle(mulberry32(host.seed + i), rules)
    wrong = 0
    holding = false
    shownAt = Date.now()
    for (const d of detachers) d()
    detachers = []
    board.innerHTML = ''

    left = frame(puzzle.a, false)
    right = frame(puzzle.b, true)
    const frames = el('div', 'mg-frames')
    frames.append(left, el('div', 'mg-plus', '+'), right)
    choices = el('div', 'mg-choices')
    board.append(frames, choices)
  }

  function frame(dots: number, second: boolean): HTMLElement {
    const f = el('div', 'mg-frame')
    for (let c = 0; c < 10; c++) {
      const cell = el('div', 'mg-cell')
      if (c < dots) {
        const dot = el('div', second ? 'mg-dot mg-second' : 'mg-dot')
        cell.append(dot)
        if (second) detachers.push(draggable(dot, { start: () => canPick(dot), over: hover, drop: (p) => drop(dot, p) }))
      }
      f.append(cell)
    }
    return f
  }

  function canPick(dot: HTMLElement): boolean {
    return !holding && !left.contains(dot) && leftCount() < 10
  }

  function hover(p: { x: number; y: number }) {
    const target = pick(p, emptyLeftCells())
    for (const c of left.querySelectorAll('.mg-target')) c.classList.remove('mg-target')
    target?.classList.add('mg-target')
  }

  function drop(dot: HTMLElement, p: { x: number; y: number }): boolean {
    for (const c of left.querySelectorAll('.mg-target')) c.classList.remove('mg-target')
    const cell = pick(p, emptyLeftCells())
    if (!cell) return false
    cell.append(dot)
    dot.classList.add('mg-moved')
    if (leftCount() === 10) filled()
    return true
  }

  function filled() {
    if (!puzzle) return
    left.classList.add('mg-full')
    if (rules.askTotal) {
      for (const n of puzzle.choices) {
        const b = el('button', 'mg-choice', String(n)) as HTMLButtonElement
        b.type = 'button'
        b.addEventListener('click', () => tap(n, b))
        choices.append(b)
      }
    } else {
      host.report({ type: 'tap', correct: true, fact: fact(), ms: Date.now() - shownAt })
      solved()
    }
  }

  const fact = () => (puzzle ? bondKey('add', puzzle.a, puzzle.b) : '')

  function tap(n: number, btn: HTMLButtonElement) {
    if (!puzzle || holding) return
    const ms = Date.now() - shownAt
    if (n === puzzle.sum) {
      btn.classList.add('mg-found')
      choices.classList.add('mg-solved')
      host.report({ type: 'tap', correct: true, fact: fact(), ms })
      solved()
    } else {
      wrong++
      btn.classList.remove('mg-wrong')
      void btn.offsetWidth
      btn.classList.add('mg-wrong')
      btn.addEventListener('animationend', () => btn.classList.remove('mg-wrong'), { once: true })
      host.report({ type: 'tap', correct: false, fact: fact(), ms })
    }
  }

  function solved() {
    if (!puzzle) return
    holding = true
    const { a, b, sum } = puzzle
    host.report({ type: 'puzzle', index, of: host.puzzles, wrong, ms: Date.now() - shownAt, response: `${a}+${b}=10+${sum - 10}=${sum}` })
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
