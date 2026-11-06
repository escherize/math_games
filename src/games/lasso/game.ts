/**
 * The Lasso ten board: a Cartridge. Dots scattered on an SVG; draw a loop
 * with one finger around exactly ten of them. The rest are the ones. Owns
 * the stroke and the feedback (a kept loop, tinted ten, a fading loop with
 * flashing dots when the count is off) and reports every loop and every
 * solved puzzle to the Console. No text, no sound, no timer.
 */
import type { CartridgeHandle, Console } from '../../engine/cartridge'
import { gesture, inside, pathLength, type Point } from '../../engine/drag'
import { mulberry32 } from '../../engine/rng'
import { bondKey } from '../../engine/rules'
import { generatePuzzle, RADIUS, VIEW_H, VIEW_W, type LassoPuzzle } from './generator'
import { lassoRules, type LassoRules } from './rules'
import css from './board.css?inline'

const SVG = 'http://www.w3.org/2000/svg'
/** A stroke shorter than this (client px) is a tap, not a loop. */
const MIN_LOOP_PX = 40
const FADE_MS = 400

function svgEl(tag: string, cls: string): SVGElement {
  const e = document.createElementNS(SVG, tag)
  e.setAttribute('class', cls)
  return e
}

export function mountLasso(container: HTMLElement, host: Console<LassoRules>): CartridgeHandle {
  const rules: LassoRules = { ...host.rules }
  const problem = lassoRules.validate(rules)
  if (problem) throw new Error(`Lasso ten rules: ${problem}`)

  const style = document.createElement('style')
  style.dataset.mg = 'lasso'
  style.textContent = css
  const board = svgEl('svg', 'mg-board mg-lasso') as SVGSVGElement
  board.setAttribute('viewBox', `0 0 ${VIEW_W} ${VIEW_H}`)
  const dotsLayer = svgEl('g', 'mg-dots')
  const loop = svgEl('path', 'mg-loop') as SVGPathElement
  board.append(dotsLayer, loop)
  container.append(style, board)

  let index = -1
  let puzzle: LassoPuzzle | null = null
  let circles: SVGCircleElement[] = []
  let wrong = 0
  let shownAt = 0
  let holding = false
  let stroke: Point[] = []
  let fadeTimer: ReturnType<typeof setTimeout> | null = null

  /** Client px -> viewBox units. */
  function toView(p: Point): Point {
    const r = board.getBoundingClientRect()
    const scale = r.width > 0 ? VIEW_W / r.width : 1
    return { x: (p.x - r.left) * scale, y: (p.y - r.top) * scale }
  }

  function pathD(pts: Point[], close: boolean): string {
    if (pts.length === 0) return ''
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
    return close ? `${d} Z` : d
  }

  function clearLoop() {
    if (fadeTimer) clearTimeout(fadeTimer)
    fadeTimer = null
    loop.setAttribute('d', '')
    loop.setAttribute('class', 'mg-loop')
  }

  function show(i: number) {
    index = i
    puzzle = generatePuzzle(mulberry32(host.seed + i), rules)
    wrong = 0
    holding = false
    shownAt = Date.now()
    clearLoop()
    dotsLayer.innerHTML = ''
    circles = puzzle.dots.map((d) => {
      const c = svgEl('circle', 'mg-dot') as SVGCircleElement
      c.setAttribute('cx', String(d.x))
      c.setAttribute('cy', String(d.y))
      c.setAttribute('r', String(RADIUS))
      dotsLayer.append(c)
      return c
    })
  }

  function finish(clientPts: Point[]) {
    if (!puzzle || holding) return
    if (clientPts.length < 3 || pathLength(clientPts) < MIN_LOOP_PX) {
      clearLoop()
      return
    }
    const poly = clientPts.map(toView)
    loop.setAttribute('d', pathD(poly, true))
    const caught = circles.filter((_, k) => inside(puzzle!.dots[k], poly))
    const ms = Date.now() - shownAt
    const fact = bondKey('add', 10, puzzle.n - 10)
    if (caught.length === 10) {
      holding = true
      for (const c of caught) c.classList.add('mg-ten')
      loop.classList.add('mg-kept')
      host.report({ type: 'tap', correct: true, fact, ms })
      host.report({ type: 'puzzle', index, of: host.puzzles, wrong, ms, response: `${puzzle.n}=10+${puzzle.n - 10}` })
    } else {
      wrong++
      for (const c of caught) {
        c.classList.remove('mg-wrong')
        c.classList.add('mg-wrong')
        c.addEventListener('animationend', () => c.classList.remove('mg-wrong'), { once: true })
      }
      loop.classList.add('mg-fading')
      // animationend is the usual exit; the timer covers engines that never fire it.
      loop.addEventListener('animationend', clearLoop, { once: true })
      fadeTimer = setTimeout(clearLoop, FADE_MS)
      host.report({ type: 'tap', correct: false, fact, ms })
    }
  }

  const detach = gesture(board, {
    start(p) {
      if (holding) return false
      clearLoop()
      stroke = [p]
    },
    move(p) {
      stroke.push(p)
      loop.setAttribute('d', pathD(stroke.map(toView), false))
    },
    end(p, cancelled) {
      if (cancelled) {
        clearLoop()
        return
      }
      stroke.push(p)
      finish(stroke)
      stroke = []
    },
  })

  show(0)

  return {
    next() {
      if (!holding || index + 1 >= host.puzzles) return false
      show(index + 1)
      return true
    },
    destroy() {
      detach()
      if (fadeTimer) clearTimeout(fadeTimer)
      puzzle = null
      board.remove()
      style.remove()
    },
  }
}
