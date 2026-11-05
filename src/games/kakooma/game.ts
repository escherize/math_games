/**
 * The Kakooma board: a Cartridge. Pods of numbers; in each, tap the one two
 * others make. Owns the taps and the feedback under the finger (a found
 * cell glows, a wrong one shakes) and reports every tap and every solved
 * puzzle to the Console. No text, no sound, no timer: the Console does those.
 */
import type { CartridgeHandle, Console } from '../../engine/cartridge'
import { mulberry32 } from '../../engine/rng'
import { bondKey, operations } from '../../engine/rules'
import { el } from '../../ui/el'
import { generatePuzzle, type Pod, type Puzzle } from './generator'
import { kakoomaRules, type KakoomaRules } from './rules'

/** Plus-shaped layout for 5-cell pods: which 3x3 slots are blank, and which edges of each filled slot face outward. */
const PLUS_BLANKS = new Set([0, 2, 6, 8])
const PLUS_EDGES: Record<number, string[]> = {
  1: ['Top', 'Left', 'Right'],
  3: ['Top', 'Left', 'Bottom'],
  4: [],
  5: ['Top', 'Right', 'Bottom'],
  7: ['Left', 'Right', 'Bottom'],
}

export function mountKakooma(container: HTMLElement, host: Console<KakoomaRules>): CartridgeHandle {
  const rules: KakoomaRules = { ...host.rules }
  const problem = kakoomaRules.validate(rules)
  if (problem) throw new Error(`Kakooma rules: ${problem}`)
  const info = operations[rules.op]

  const board = el('div', 'board')
  container.append(board)

  let index = -1
  let puzzle: Puzzle | null = null
  let solved = new Set<number>()
  let wrong = 0
  let shownAt = 0
  let responses: string[] = []
  /** The current puzzle is solved and the board is holding for `next()`. */
  let holding = false

  function show(i: number) {
    index = i
    puzzle = generatePuzzle(mulberry32(host.seed + i), rules, { podCount: rules.podCount, podSize: rules.podSize })
    solved = new Set()
    wrong = 0
    responses = []
    holding = false
    shownAt = Date.now()
    board.innerHTML = ''
    board.className = `board ${puzzle.pods.length === 4 ? 'pods-4' : 'pods-many'}`
    puzzle.pods.forEach((pod, p) => board.append(podEl(pod, p)))
    if (puzzle.pods.length === 4) board.append(el('div', 'op', info.symbol))
  }

  function podEl(pod: Pod, p: number): HTMLElement {
    const wrap = el('div', 'pod')
    wrap.dataset.size = String(pod.cells.length)
    const slots = pod.cells.length === 5 ? 9 : pod.cells.length
    let ci = 0
    for (let s = 0; s < slots; s++) {
      if (pod.cells.length === 5 && PLUS_BLANKS.has(s)) {
        wrap.append(el('div', 'cell blank'))
        continue
      }
      const idx = ci++
      const b = el('button', 'cell', String(pod.cells[idx])) as HTMLButtonElement
      b.type = 'button'
      if (pod.cells.length === 5) for (const edge of PLUS_EDGES[s]) b.style.setProperty(`border-${edge.toLowerCase()}-width`, '3px')
      b.addEventListener('click', () => tap(p, idx, b))
      wrap.append(b)
    }
    return wrap
  }

  function tap(p: number, idx: number, btn: HTMLButtonElement) {
    if (!puzzle || holding || solved.has(p)) return
    const pod = puzzle.pods[p]
    const [i, j] = pod.parts
    const fact = bondKey(info.base, pod.cells[i], pod.cells[j])
    const ms = Date.now() - shownAt
    if (pod.targets.includes(idx)) {
      solved.add(p)
      responses.push(`${pod.cells[i]}${info.symbol}${pod.cells[j]}=${pod.cells[pod.whole]}`)
      btn.classList.add('found')
      btn.parentElement?.classList.add('solved')
      host.report({ type: 'tap', correct: true, fact, ms })
      if (solved.size === puzzle.pods.length) {
        holding = true
        host.report({ type: 'puzzle', index, of: host.puzzles, wrong, ms, response: responses.join(' ') })
      }
    } else {
      wrong++
      btn.classList.remove('wrong')
      void btn.offsetWidth
      btn.classList.add('wrong')
      btn.addEventListener('animationend', () => btn.classList.remove('wrong'), { once: true })
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
    },
  }
}
