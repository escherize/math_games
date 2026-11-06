// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import type { CartridgeEvent, Console } from '../../engine/cartridge'
import { bridge } from './index'
import { presets, type BridgeRules } from './rules'

function fakeConsole(puzzles: number, seed = 42, rules: BridgeRules = presets[0].rules) {
  const events: CartridgeEvent[] = []
  const host: Console<BridgeRules> = { rules, seed, puzzles, report: (e) => events.push(e) }
  return { host, events }
}

function pointer(el: Element, type: string, x: number, y: number) {
  el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true, cancelable: true, pointerType: 'touch' }))
}

const frames = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>('.mg-frame'))
const dotsIn = (f: HTMLElement) => Array.from(f.querySelectorAll<HTMLElement>('.mg-dot'))
const choiceButtons = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLButtonElement>('button.mg-choice'))

/** happy-dom gives every box 0×0; lay the left cells out on a 60px grid so pick() can find them. */
function layout(root: HTMLElement) {
  const cells = Array.from(frames(root)[0].querySelectorAll<HTMLElement>('.mg-cell'))
  cells.forEach((c, i) => {
    const left = (i % 5) * 60
    const top = Math.floor(i / 5) * 60
    c.getBoundingClientRect = () => ({ left, top, right: left + 60, bottom: top + 60, width: 60, height: 60, x: left, y: top, toJSON: () => ({}) })
  })
  return cells
}

const centreOf = (c: HTMLElement) => {
  const r = c.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

function drag(dot: HTMLElement, to: { x: number; y: number }) {
  pointer(dot, 'pointerdown', 500, 500)
  pointer(dot, 'pointermove', to.x, to.y)
  pointer(dot, 'pointerup', to.x, to.y)
}

/** Move dots from the right frame into empty left cells until the left is full. */
function fill(root: HTMLElement) {
  const [left, right] = frames(root)
  const cells = Array.from(left.querySelectorAll<HTMLElement>('.mg-cell'))
  for (const cell of cells) {
    if (cell.querySelector('.mg-dot')) continue
    const dot = dotsIn(right)[0]
    drag(dot, centreOf(cell))
  }
}

describe('bridge cartridge', () => {
  it('moves dots across, asks the total, holds until next(), and stops after the last puzzle', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(2)
    const handle = bridge.mount(root, host)
    const [left, right] = frames(root)
    const a = dotsIn(left).length
    const b = dotsIn(right).length
    expect(a + b).toBeGreaterThanOrEqual(11)
    const cells = layout(root)

    // A drop outside any empty cell snaps back with no event.
    const dot = dotsIn(right)[0]
    drag(dot, { x: 2000, y: 2000 })
    expect(right.contains(dot)).toBe(true)
    expect(dot.classList.contains('mg-returning')).toBe(true)
    expect(events).toHaveLength(0)
    expect(choiceButtons(root)).toHaveLength(0)

    // A drop on an empty left cell moves the dot and keeps its colour.
    const empty = cells.find((c) => !c.querySelector('.mg-dot'))!
    drag(dot, centreOf(empty))
    expect(empty.contains(dot)).toBe(true)
    expect(dot.classList.contains('mg-second')).toBe(true)
    expect(dot.classList.contains('mg-moved')).toBe(true)
    // A dot on the left cannot be picked up again.
    drag(dot, centreOf(cells.find((c) => !c.querySelector('.mg-dot'))!))
    expect(empty.contains(dot)).toBe(true)

    fill(root)
    expect(dotsIn(left)).toHaveLength(10)
    expect(dotsIn(right)).toHaveLength(a + b - 10)
    expect(left.classList.contains('mg-full')).toBe(true)
    expect(events).toHaveLength(0)
    expect(handle.next()).toBe(false)

    const buttons = choiceButtons(root)
    expect(buttons).toHaveLength(3)
    const sum = a + b
    const wrongBtn = buttons.find((x) => Number(x.textContent) !== sum)!
    const rightBtn = buttons.find((x) => Number(x.textContent) === sum)!
    wrongBtn.click()
    expect(events.at(-1)).toMatchObject({ type: 'tap', correct: false, fact: `${Math.min(a, b)}+${Math.max(a, b)}` })
    expect(wrongBtn.classList.contains('mg-wrong')).toBe(true)
    rightBtn.click()
    expect(events.slice(-2)).toEqual([
      expect.objectContaining({ type: 'tap', correct: true }),
      expect.objectContaining({ type: 'puzzle', index: 0, of: 2, wrong: 1, response: `${a}+${b}=10+${sum - 10}=${sum}` }),
    ])
    expect(rightBtn.classList.contains('mg-found')).toBe(true)

    // Holding: taps are ignored.
    wrongBtn.click()
    expect(events).toHaveLength(3)

    expect(handle.next()).toBe(true)
    expect(choiceButtons(root)).toHaveLength(0)
    expect(dotsIn(frames(root)[0]).length).toBeLessThan(10)
    layout(root)
    fill(root)
    const a2 = dotsIn(frames(root)[0]).length
    choiceButtons(root).find((x) => Number(x.textContent) === a2 + dotsIn(frames(root)[1]).length)!.click()
    expect(events.at(-1)).toMatchObject({ type: 'puzzle', index: 1, of: 2, wrong: 0 })
    expect(handle.next()).toBe(false)

    handle.destroy()
    expect(root.children).toHaveLength(0)
  })

  it('solves on the fill alone when askTotal is false', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1, 9, presets[2].rules)
    const handle = bridge.mount(root, host)
    const [left, right] = frames(root)
    const a = dotsIn(left).length
    const b = dotsIn(right).length
    layout(root)
    fill(root)
    expect(choiceButtons(root)).toHaveLength(0)
    expect(events).toEqual([
      expect.objectContaining({ type: 'tap', correct: true, fact: `${Math.min(a, b)}+${Math.max(a, b)}` }),
      expect.objectContaining({ type: 'puzzle', index: 0, of: 1, wrong: 0, response: `${a}+${b}=10+${a + b - 10}=${a + b}` }),
    ])
    expect(handle.next()).toBe(false)
    handle.destroy()
  })

  it('plays a one-puzzle round the way Math Wiz asks for it', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1, 99)
    const handle = bridge.mount(root, host)
    layout(root)
    fill(root)
    const sum = dotsIn(frames(root)[0]).length + dotsIn(frames(root)[1]).length
    choiceButtons(root).find((x) => Number(x.textContent) === sum)!.click()
    expect(events.filter((e) => e.type === 'puzzle')).toEqual([expect.objectContaining({ index: 0, of: 1, wrong: 0 })])
    expect(handle.next()).toBe(false)
    handle.destroy()
  })

  it('rejects rules that are not an addition board', () => {
    const root = document.createElement('div')
    const { host } = fakeConsole(1, 1, { ...presets[0].rules, op: 'subtract' })
    expect(() => bridge.mount(root, host)).toThrow()
  })
})
