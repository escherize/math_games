// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import type { CartridgeEvent, Console } from '../../engine/cartridge'
import { halves } from './index'
import { presets, type HalvesRules } from './rules'

function fakeConsole(puzzles: number, seed = 42, rules: HalvesRules = presets[0].rules) {
  const events: CartridgeEvent[] = []
  const host: Console<HalvesRules> = { rules, seed, puzzles, report: (e) => events.push(e) }
  return { host, events }
}

const BLOCK = 40
const GAP = 8
const LEFT = 20
function box(el: Element, b: { left: number; top: number; width: number; height: number }) {
  el.getBoundingClientRect = () => ({ ...b, right: b.left + b.width, bottom: b.top + b.height, x: b.left, y: b.top, toJSON: () => b }) as DOMRect
}

/** Lay the blocks out in a row; happy-dom lays nothing out. */
function layout(root: HTMLElement) {
  box(root.querySelector('.mg-rail')!, { left: LEFT, top: 80, width: 600, height: 100 })
  root.querySelectorAll('.mg-block').forEach((b, i) => box(b, { left: LEFT + i * (BLOCK + GAP), top: 100, width: BLOCK, height: 60 }))
}
/** Client x of the gap after `k` blocks. */
const gapX = (k: number) => (k === 0 ? LEFT : LEFT + k * (BLOCK + GAP) - GAP / 2)

const n = (root: HTMLElement) => root.querySelectorAll('.mg-block').length
const counts = (root: HTMLElement) => Array.from(root.querySelectorAll('.mg-count')).map((c) => Number(c.textContent))
const sides = (root: HTMLElement) => Array.from(root.querySelectorAll('.mg-block')).map((b) => (b.classList.contains('mg-left') ? 'L' : b.classList.contains('mg-over') ? 'O' : 'R')).join('')

function pointer(el: Element, type: string, x: number, y: number) {
  el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true, cancelable: true, pointerType: 'touch' }))
}
function dragTo(board: Element, x: number) {
  pointer(board, 'pointerdown', 10, 120)
  pointer(board, 'pointermove', x, 120)
  pointer(board, 'pointerup', x, 120)
}
const board = (root: HTMLElement) => root.querySelector<HTMLElement>('.mg-halves')!

describe('halves cartridge', () => {
  it('colours the sides live, counts a wrong cut, levels on the half, holds until next()', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(2)
    const handle = halves.mount(root, host)
    layout(root)
    const total = n(root)
    expect(total % 2).toBe(0)
    expect(counts(root)).toEqual([0, total])
    expect(sides(root)).toBe('R'.repeat(total))

    // Live: the cutter follows the finger and the sides recolour before release.
    pointer(board(root), 'pointerdown', 10, 120)
    pointer(board(root), 'pointermove', gapX(1) + 3, 120)
    expect(sides(root)).toBe('L' + 'R'.repeat(total - 1))
    expect(counts(root)).toEqual([1, total - 1])
    expect(root.querySelector<HTMLElement>('.mg-row')!.style.getPropertyValue('--mg-sag')).not.toBe('0px')
    pointer(board(root), 'pointerup', gapX(1) + 3, 120)
    expect(events.at(-1)).toMatchObject({ type: 'tap', correct: false })
    expect(board(root).classList.contains('mg-wrong')).toBe(true)
    expect(handle.next()).toBe(false)
    expect(root.querySelector<HTMLElement>('.mg-divider')!.style.left).toBe(`${gapX(1) - LEFT}px`)

    dragTo(board(root), gapX(total / 2) - 4)
    expect(sides(root)).toBe('L'.repeat(total / 2) + 'R'.repeat(total / 2))
    expect(board(root).classList.contains('mg-level')).toBe(true)
    expect(events.filter((e) => e.type === 'puzzle')).toEqual([
      expect.objectContaining({ type: 'puzzle', index: 0, of: 2, wrong: 1, response: `${total}=${total / 2}+${total / 2}` }),
    ])
    expect(events.filter((e) => e.type === 'tap' && e.correct)).toHaveLength(1)
    expect(root.querySelector<HTMLElement>('.mg-row')!.style.getPropertyValue('--mg-sag')).toBe('0px')

    // Touches while holding do nothing.
    dragTo(board(root), gapX(1))
    expect(events.filter((e) => e.type === 'tap')).toHaveLength(2)
    expect(sides(root)).toBe('L'.repeat(total / 2) + 'R'.repeat(total / 2))

    expect(handle.next()).toBe(true)
    layout(root)
    const second = n(root)
    expect(second).not.toBe(total)
    dragTo(board(root), gapX(second / 2))
    expect(events.filter((e) => e.type === 'puzzle').at(-1)).toMatchObject({ index: 1, of: 2, wrong: 0 })
    expect(handle.next()).toBe(false)

    handle.destroy()
    expect(root.children).toHaveLength(0)
  })

  it('plays a one-puzzle round the way Math Wiz asks for it, snapping a finger that overshoots the row', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1, 99, presets[1].rules)
    const handle = halves.mount(root, host)
    layout(root)
    const total = n(root)
    dragTo(board(root), gapX(total) + 500)
    expect(counts(root)).toEqual([total, 0])
    expect(events.at(-1)).toMatchObject({ type: 'tap', correct: false, fact: `0+${total}` })
    dragTo(board(root), gapX(total / 2))
    expect(events.filter((e) => e.type === 'puzzle')).toEqual([expect.objectContaining({ index: 0, of: 1, wrong: 1 })])
    expect(handle.next()).toBe(false)
    handle.destroy()
  })

  it('with odd rows allowed, a cut one apart lifts the extra block and solves', () => {
    const root = document.createElement('div')
    const rules = { ...presets[2].rules, minN: 7, maxN: 7 }
    const { host, events } = fakeConsole(1, 5, rules)
    halves.mount(root, host)
    layout(root)
    expect(n(root)).toBe(7)
    dragTo(board(root), gapX(4))
    expect(sides(root)).toBe('LLLORRR')
    expect(board(root).classList.contains('mg-level')).toBe(true)
    expect(events.filter((e) => e.type === 'puzzle')).toEqual([expect.objectContaining({ response: '7=3+4' })])
  })

  it('a cancelled gesture puts the cutter back on its last gap', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1, 11)
    halves.mount(root, host)
    layout(root)
    pointer(board(root), 'pointerdown', 10, 120)
    pointer(board(root), 'pointermove', gapX(2), 120)
    pointer(board(root), 'pointercancel', gapX(2), 120)
    expect(events).toHaveLength(0)
    expect(root.querySelector<HTMLElement>('.mg-divider')!.style.left).toBe(`${gapX(2) - LEFT}px`)
  })

  it('refuses rules it cannot play', () => {
    const root = document.createElement('div')
    const { host } = fakeConsole(1, 1, { ...presets[0].rules, minN: 3, maxN: 3 })
    expect(() => halves.mount(root, host)).toThrow(/even/)
  })
})
