// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import type { CartridgeEvent, Console } from '../../engine/cartridge'
import { hidden } from './index'
import { presets, type HiddenRules } from './rules'

function fakeConsole(puzzles: number, seed = 42, rules: HiddenRules = presets[0].rules) {
  const events: CartridgeEvent[] = []
  const host: Console<HiddenRules> = { rules, seed, puzzles, report: (e) => events.push(e) }
  return { host, events }
}

function box(el: Element, b: { left: number; top: number; width: number; height: number }) {
  el.getBoundingClientRect = () => ({ ...b, right: b.left + b.width, bottom: b.top + b.height, x: b.left, y: b.top, toJSON: () => b }) as DOMRect
}

const PITCH = 50
/** Lay the row out: dot k spans [100 + 50k, 140 + 50k]; happy-dom lays nothing out. */
function layout(root: HTMLElement) {
  const dots = root.querySelectorAll('.mg-row .mg-dot')
  box(root.querySelector('.mg-row')!, { left: 60, top: 100, width: 100 + PITCH * dots.length, height: 80 })
  dots.forEach((d, k) => box(d, { left: 100 + PITCH * k, top: 120, width: 40, height: 40 }))
}
/** The x of the gap after `a` dots. */
const gapX = (a: number) => 100 + PITCH * a - 5

function pointer(el: Element, type: string, x: number, y: number) {
  el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true, cancelable: true, pointerType: 'touch' }))
}
function slideTo(root: HTMLElement, a: number) {
  const row = root.querySelector('.mg-row')!
  pointer(row, 'pointerdown', gapX(2), 140)
  pointer(row, 'pointermove', gapX(a), 140)
  pointer(row, 'pointerup', gapX(a), 140)
}
const n = (root: HTMLElement) => Number(root.querySelector('.mg-total')!.textContent)
const shelf = (root: HTMLElement) => Array.from(root.querySelectorAll('.mg-bond')).map((b) => Array.from(b.querySelectorAll('.mg-num')).map((x) => x.textContent).join('+'))
const tint = (root: HTMLElement) => Array.from(root.querySelectorAll('.mg-row .mg-dot')).map((d) => (d.classList.contains('mg-left') ? 'L' : d.classList.contains('mg-right') ? 'R' : '-')).join('')

describe('hidden bonds cartridge', () => {
  it('shelves each new split, wiggles a repeat, solves when enough bonds are found, holds until next()', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(2, 42, { ...presets[1].rules, minN: 6, maxN: 6, allowZero: false })
    const handle = hidden.mount(root, host)
    layout(root)
    expect(n(root)).toBe(6)
    expect(root.querySelectorAll('.mg-row .mg-dot')).toHaveLength(6)
    expect(tint(root)).toBe('LLLRRR')

    slideTo(root, 1)
    expect(tint(root)).toBe('LRRRRR')
    expect(shelf(root)).toEqual(['1+5'])
    expect(events).toEqual([expect.objectContaining({ type: 'tap', correct: true, fact: '1+5' })])

    // The same bond from the other side: commutative pairs count once, so it wiggles and nothing is reported.
    slideTo(root, 5)
    expect(shelf(root)).toEqual(['1+5'])
    expect(root.querySelector('.mg-bond')!.classList.contains('mg-again')).toBe(true)
    expect(events).toHaveLength(1)
    expect(handle.next()).toBe(false)

    // The divider cannot rest at the ends.
    slideTo(root, 0)
    expect(tint(root)).toBe('LRRRRR')
    expect(shelf(root)).toEqual(['1+5'])

    slideTo(root, 2)
    slideTo(root, 3)
    expect(shelf(root)).toEqual(['1+5', '2+4', '3+3'])
    expect(events.filter((e) => e.type === 'puzzle')).toEqual([
      expect.objectContaining({ type: 'puzzle', index: 0, of: 2, wrong: 0, response: '6=1+5;6=2+4;6=3+3' }),
    ])
    expect(root.querySelector('.mg-row')!.classList.contains('mg-done')).toBe(true)

    // Held: further slides do nothing.
    slideTo(root, 4)
    expect(shelf(root)).toHaveLength(3)
    expect(events).toHaveLength(4)

    expect(handle.next()).toBe(true)
    layout(root)
    expect(shelf(root)).toEqual([])
    expect(root.querySelector('.mg-row')!.classList.contains('mg-done')).toBe(false)
    slideTo(root, 1)
    slideTo(root, 2)
    slideTo(root, 3)
    expect(events.filter((e) => e.type === 'puzzle').at(-1)).toMatchObject({ index: 1, of: 2 })
    expect(handle.next()).toBe(false)

    handle.destroy()
    expect(root.children).toHaveLength(0)
  })

  it('a tap between two dots is a split too, and the tint follows the finger mid-drag', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1, 7, { ...presets[0].rules, minN: 4, maxN: 4, allowZero: false })
    hidden.mount(root, host)
    layout(root)
    const row = root.querySelector('.mg-row')!
    pointer(row, 'pointerdown', gapX(3), 140)
    expect(tint(root)).toBe('LLLR')
    pointer(row, 'pointermove', gapX(1), 140)
    expect(tint(root)).toBe('LRRR')
    pointer(row, 'pointerup', gapX(1), 140)
    expect(shelf(root)).toEqual(['1+3'])
    pointer(row, 'pointerdown', gapX(2), 140)
    pointer(row, 'pointerup', gapX(2), 140)
    expect(shelf(root)).toEqual(['1+3', '2+2'])
    expect(events.filter((e) => e.type === 'puzzle')).toEqual([expect.objectContaining({ response: '4=1+3;4=2+2' })])
  })

  it('counts 2|4 and 4|2 apart when commutative pairs count twice', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1, 7, { ...presets[2].rules, minN: 6, maxN: 6, bondsRequired: 2 })
    hidden.mount(root, host)
    layout(root)
    slideTo(root, 2)
    slideTo(root, 4)
    expect(shelf(root)).toEqual(['2+4', '4+2'])
    expect(events.filter((e) => e.type === 'puzzle')).toEqual([expect.objectContaining({ response: '6=2+4;6=4+2' })])
  })

  it('counts the zero split by default: the divider rests at the end and 0 + n goes on the shelf', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1, 5, { ...presets[0].rules, minN: 4, maxN: 4, bondsRequired: 1 })
    hidden.mount(root, host)
    layout(root)
    const row = root.querySelector('.mg-row')!
    pointer(row, 'pointerdown', gapX(2), 140)
    pointer(row, 'pointermove', gapX(0) - 30, 140)
    expect(tint(root)).toBe('RRRR')
    pointer(row, 'pointerup', gapX(0) - 30, 140)
    expect(shelf(root)).toEqual(['0+4'])
    expect(events.filter((e) => e.type === 'puzzle')).toEqual([expect.objectContaining({ response: '4=0+4' })])
  })

  it('refuses rules it cannot play', () => {
    const root = document.createElement('div')
    const { host } = fakeConsole(1, 1, { ...presets[0].rules, op: 'subtract' })
    expect(() => hidden.mount(root, host)).toThrow(/addition/)
  })
})
