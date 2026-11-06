// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import type { CartridgeEvent, Console } from '../../engine/cartridge'
import { mulberry32 } from '../../engine/rng'
import { generatePuzzle, RADIUS, VIEW_H, VIEW_W, type Dot } from './generator'
import { lasso } from './index'
import { presets, type LassoRules } from './rules'

function fakeConsole(puzzles: number, seed = 42, rules: LassoRules = presets[2].rules) {
  const events: CartridgeEvent[] = []
  const host: Console<LassoRules> = { rules, seed, puzzles, report: (e) => events.push(e) }
  return { host, events }
}

/** Client px = viewBox units: the svg sits at the origin at its natural size. */
function mountAt(root: HTMLElement, host: Console<LassoRules>) {
  const handle = lasso.mount(root, host)
  const svg = root.querySelector('svg.mg-lasso') as SVGSVGElement
  svg.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: VIEW_W, bottom: VIEW_H, width: VIEW_W, height: VIEW_H, x: 0, y: 0, toJSON() {} }) as DOMRect
  return { handle, svg }
}

function pointer(el: Element, type: string, x: number, y: number) {
  el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true, cancelable: true, pointerType: 'touch' }))
}

/** Trace a rectangle hugging the given dots (and nothing else, given the generator's spacing). */
function loopAround(svg: SVGSVGElement, dots: Dot[]) {
  const pad = RADIUS + 3
  const x0 = Math.min(...dots.map((d) => d.x)) - pad
  const x1 = Math.max(...dots.map((d) => d.x)) + pad
  const y0 = Math.min(...dots.map((d) => d.y)) - pad
  const y1 = Math.max(...dots.map((d) => d.y)) + pad
  pointer(svg, 'pointerdown', x0, y0)
  pointer(svg, 'pointermove', x1, y0)
  pointer(svg, 'pointermove', x1, y1)
  pointer(svg, 'pointermove', x0, y1)
  pointer(svg, 'pointerup', x0, y0 + 1)
}

const circles = (svg: SVGSVGElement) => Array.from(svg.querySelectorAll<SVGCircleElement>('circle.mg-dot'))
const loopPath = (svg: SVGSVGElement) => svg.querySelector('path.mg-loop')!
const dotsOf = (host: Console<LassoRules>, i: number) => generatePuzzle(mulberry32(host.seed + i), host.rules)

describe('lasso cartridge', () => {
  it('solves on a loop around ten, rejects one around nine, holds until next(), stops after the last puzzle', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(2, 42, presets[0].rules)
    const { handle, svg } = mountAt(root, host)
    const p0 = dotsOf(host, 0)
    expect(circles(svg)).toHaveLength(p0.n)

    // A tap is not a loop.
    pointer(svg, 'pointerdown', 5, 5)
    pointer(svg, 'pointermove', 8, 5)
    pointer(svg, 'pointerup', 9, 6)
    expect(events).toEqual([])
    expect(loopPath(svg).getAttribute('d')).toBe('')

    // Nine of the row: wrong, the loop fades and clears, the nine flash.
    loopAround(svg, p0.dots.slice(0, 9))
    expect(events.at(-1)).toMatchObject({ type: 'tap', correct: false, fact: `${p0.n - 10}+10` })
    expect(loopPath(svg).classList.contains('mg-fading')).toBe(true)
    expect(circles(svg).filter((c) => c.classList.contains('mg-wrong'))).toHaveLength(9)
    expect(handle.next()).toBe(false)

    // All ten: solved.
    loopAround(svg, p0.dots.slice(0, 10))
    const solved = events.filter((e) => e.type === 'puzzle')
    expect(solved).toHaveLength(1)
    expect(solved[0]).toMatchObject({ type: 'puzzle', index: 0, of: 2, wrong: 1, response: `${p0.n}=10+${p0.n - 10}` })
    expect(circles(svg).filter((c) => c.classList.contains('mg-ten'))).toHaveLength(10)
    expect(loopPath(svg).classList.contains('mg-kept')).toBe(true)

    // Strokes while holding are ignored.
    loopAround(svg, p0.dots.slice(0, 9))
    expect(events.filter((e) => e.type === 'tap')).toHaveLength(2)

    expect(handle.next()).toBe(true)
    const p1 = dotsOf(host, 1)
    expect(circles(svg).map((c) => Number(c.getAttribute('cx')))).toEqual(p1.dots.map((d) => d.x))
    expect(loopPath(svg).getAttribute('d')).toBe('')
    loopAround(svg, p1.dots.slice(0, 10))
    expect(events.filter((e) => e.type === 'puzzle').at(-1)).toMatchObject({ index: 1, of: 2, wrong: 0 })
    expect(handle.next()).toBe(false)

    handle.destroy()
    expect(root.children).toHaveLength(0)
  })

  it('a rejected loop is cleared after the fade timer', async () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1, 11, presets[0].rules)
    const { handle, svg } = mountAt(root, host)
    const p0 = dotsOf(host, 0)
    loopAround(svg, p0.dots.slice(0, 9))
    expect(events.at(-1)).toMatchObject({ type: 'tap', correct: false })
    expect(loopPath(svg).getAttribute('d')).not.toBe('')
    await new Promise((r) => setTimeout(r, 450))
    expect(loopPath(svg).getAttribute('d')).toBe('')
    expect(loopPath(svg).classList.contains('mg-fading')).toBe(false)
    handle.destroy()
  })

  it('plays a one-puzzle round the way Math Wiz asks for it', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1, 99, presets[2].rules)
    const { handle, svg } = mountAt(root, host)
    loopAround(svg, dotsOf(host, 0).dots.slice(0, 10))
    expect(events.filter((e) => e.type === 'puzzle')).toEqual([expect.objectContaining({ type: 'puzzle', index: 0, of: 1, wrong: 0 })])
    expect(events.filter((e) => e.type === 'tap')).toEqual([expect.objectContaining({ correct: true })])
    expect(handle.next()).toBe(false)
    handle.destroy()
  })

  it('refuses rules it cannot play', () => {
    const root = document.createElement('div')
    const { host } = fakeConsole(1, 1, { ...presets[0].rules, op: 'subtract' })
    expect(() => lasso.mount(root, host)).toThrow(/addition/)
  })
})
