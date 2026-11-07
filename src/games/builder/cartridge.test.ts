// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import type { CartridgeEvent, Console } from '../../engine/cartridge'
import { mulberry32 } from '../../engine/rng'
import { generatePuzzle, valueAt } from './generator'
import { builder } from './index'
import { presets, type BuilderRules } from './rules'

function fakeConsole(puzzles: number, seed = 42, rules: BuilderRules = presets[0].rules) {
  const events: CartridgeEvent[] = []
  const host: Console<BuilderRules> = { rules, seed, puzzles, report: (e) => events.push(e) }
  return { host, events }
}

type Box = { left: number; top: number; width: number; height: number }
function box(el: Element, b: Box) {
  el.getBoundingClientRect = () => ({ ...b, right: b.left + b.width, bottom: b.top + b.height, x: b.left, y: b.top, toJSON: () => b }) as DOMRect
}
const blankBox = (i: number): Box => ({ left: 100 + i * 200, top: 100, width: 60, height: 60 })

/** Give every blank a real box, far apart; happy-dom lays nothing out. */
function layout(root: HTMLElement) {
  root.querySelectorAll('.mg-blank').forEach((b, i) => box(b, blankBox(i)))
}

const blanks = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>('.mg-blank'))
const trayTiles = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>('.mg-tray .mg-tile'))
const tileWith = (root: HTMLElement, value: number) => trayTiles(root).find((t) => Number(t.dataset.value) === value)!

function pointer(el: Element, type: string, x: number, y: number) {
  el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true, cancelable: true, pointerType: 'touch' }))
}
function dragTo(tile: Element, x: number, y: number) {
  pointer(tile, 'pointerdown', 10, 400)
  pointer(tile, 'pointermove', x, y)
  pointer(tile, 'pointerup', x, y)
}
const dropOnBlank = (tile: Element, i: number) => dragTo(tile, blankBox(i).left + 30, blankBox(i).top + 30)

/** The right tile for every blank, in blank order, from the generator the board uses. */
function answers(seed: number, index: number, rules: BuilderRules): number[] {
  return generatePuzzle(mulberry32(seed + index), rules).triangles.flatMap((t) => t.blanks.map((s) => valueAt(t, s)))
}
function solve(root: HTMLElement, seed: number, index: number, rules: BuilderRules) {
  answers(seed, index, rules).forEach((v, i) => dropOnBlank(tileWith(root, v), i))
}
const settle = (root: HTMLElement) => root.querySelectorAll('.mg-wrong').forEach((t) => t.dispatchEvent(new Event('animationend')))

describe('builder cartridge', () => {
  it('one triangle: a wrong tile shakes back to the tray, the right one settles and reports; holds until next()', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(2)
    const handle = builder.mount(root, host)
    layout(root)
    expect(blanks(root)).toHaveLength(1)
    expect(trayTiles(root)).toHaveLength(1)
    const [right] = answers(host.seed, 0, host.rules)
    const tile = tileWith(root, right)

    // Dropped on empty space: back to the tray, no event.
    dragTo(tile, 5, 300)
    expect(events).toHaveLength(0)
    expect(tile.classList.contains('mg-returning')).toBe(true)
    expect(tile.parentElement!.classList.contains('mg-tray')).toBe(true)

    // A wrong value: fake the tile's value to force a bad check.
    tile.dataset.value = String(right + 1)
    dropOnBlank(tile, 0)
    expect(events.at(-1)).toMatchObject({ type: 'tap', correct: false })
    expect(root.querySelector('.mg-triangle')!.classList.contains('mg-wrong')).toBe(true)
    expect(handle.next()).toBe(false)
    // While the shake runs the board ignores drops; after it the tile is back in the tray.
    settle(root)
    expect(tile.parentElement!.classList.contains('mg-tray')).toBe(true)
    expect(blanks(root)[0].querySelector('.mg-tile')).toBeNull()

    tile.dataset.value = String(right)
    const z = generatePuzzle(mulberry32(host.seed), host.rules).triangles[0]
    dropOnBlank(tile, 0)
    expect(events.filter((e) => e.type === 'puzzle')).toEqual([
      expect.objectContaining({ type: 'puzzle', index: 0, of: 2, wrong: 1, response: `${z.whole}=${Math.min(...z.parts)}+${Math.max(...z.parts)}` }),
    ])
    expect(events.filter((e) => e.type === 'tap' && e.correct)).toHaveLength(1)
    expect(root.querySelector('.mg-triangle')!.classList.contains('mg-valid')).toBe(true)
    expect(tile.parentElement!.classList.contains('mg-blank')).toBe(true)

    // A settled tile cannot be picked up again.
    dragTo(tile, 5, 300)
    expect(tile.parentElement!.classList.contains('mg-blank')).toBe(true)

    expect(handle.next()).toBe(true)
    layout(root)
    solve(root, host.seed, 1, host.rules)
    expect(events.filter((e) => e.type === 'puzzle').at(-1)).toMatchObject({ index: 1, of: 2, wrong: 0 })
    expect(handle.next()).toBe(false)

    handle.destroy()
    expect(root.children).toHaveLength(0)
  })

  it('three triangles with two blanks each: all six tiles placed right reports one response per triangle', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1, 9, presets[2].rules)
    const handle = builder.mount(root, host)
    layout(root)
    expect(blanks(root)).toHaveLength(6)
    expect(trayTiles(root)).toHaveLength(6)
    // Five placed: nothing checks yet.
    answers(host.seed, 0, host.rules)
      .slice(0, 5)
      .forEach((v, i) => dropOnBlank(tileWith(root, v), i))
    expect(events).toHaveLength(0)
    const [, , , , , last] = answers(host.seed, 0, host.rules)
    dropOnBlank(tileWith(root, last), 5)
    const z = generatePuzzle(mulberry32(host.seed), host.rules)
    const response = z.triangles.map((t) => `${t.whole}=${Math.min(...t.parts)}+${Math.max(...t.parts)}`).join(';')
    expect(events.filter((e) => e.type === 'tap' && e.correct)).toHaveLength(3)
    expect(events.filter((e) => e.type === 'puzzle')).toEqual([expect.objectContaining({ index: 0, of: 1, wrong: 0, response })])
    expect(root.querySelectorAll('.mg-triangle.mg-valid')).toHaveLength(3)
    expect(handle.next()).toBe(false)
    handle.destroy()
  })

  it('swapped parts still add up, and only the triangle that is wrong shakes', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1, 11, presets[2].rules)
    builder.mount(root, host)
    layout(root)
    const a = answers(host.seed, 0, host.rules)
    // Triangle one gets its parts swapped (still valid); triangle two gets both its tiles and triangle three's.
    const order = [a[1], a[0], a[4], a[5], a[2], a[3]]
    const z = generatePuzzle(mulberry32(host.seed), host.rules).triangles
    const t2ok = z[2].parts[0] + z[2].parts[1] === z[1].whole
    const t3ok = z[1].parts[0] + z[1].parts[1] === z[2].whole
    order.forEach((v, i) => dropOnBlank(tileWith(root, v), i))
    const tris = root.querySelectorAll('.mg-triangle')
    expect(tris[0].classList.contains('mg-wrong')).toBe(false)
    expect(tris[1].classList.contains('mg-wrong')).toBe(!t2ok)
    expect(tris[2].classList.contains('mg-wrong')).toBe(!t3ok)
    const bad = (t2ok ? 0 : 1) + (t3ok ? 0 : 1)
    expect(events.filter((e) => e.type === 'tap' && !e.correct)).toHaveLength(bad)
    expect(bad).toBeGreaterThan(0)
    settle(root)
    // The wrong triangles' tiles are back in the tray; the swapped-but-valid one keeps its tiles until the whole board is right.
    expect(trayTiles(root)).toHaveLength(bad * 2)
    expect(blanks(root)[0].querySelector('.mg-tile')).not.toBeNull()
  })

  it('a tile dropped on an occupied blank swaps the old one back to the tray; a tile can be dragged back out', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1, 5, presets[1].rules)
    builder.mount(root, host)
    layout(root)
    const [first, second] = trayTiles(root)
    dropOnBlank(first, 0)
    expect(blanks(root)[0].querySelector('.mg-tile')).toBe(first)
    dropOnBlank(second, 0)
    expect(blanks(root)[0].querySelector('.mg-tile')).toBe(second)
    expect(first.parentElement!.classList.contains('mg-tray')).toBe(true)
    expect(events).toHaveLength(0)
    dragTo(second, 5, 300)
    expect(second.parentElement!.classList.contains('mg-tray')).toBe(true)
    expect(blanks(root)[0].querySelector('.mg-tile')).toBeNull()
  })

  it('lights a blank while the finger is within 24px of it, or the tile itself touches it', () => {
    const root = document.createElement('div')
    const { host } = fakeConsole(1, 3)
    builder.mount(root, host)
    layout(root)
    const tile = trayTiles(root)[0]
    const blank = blanks(root)[0]
    pointer(tile, 'pointerdown', 10, 400)
    pointer(tile, 'pointermove', blankBox(0).left - 20, blankBox(0).top - 20)
    expect(blank.classList.contains('mg-over')).toBe(true)
    pointer(tile, 'pointermove', blankBox(0).left - 40, blankBox(0).top - 40)
    expect(blank.classList.contains('mg-over')).toBe(false)
    box(tile, { left: blankBox(0).left - 50, top: blankBox(0).top, width: 60, height: 60 })
    pointer(tile, 'pointermove', 5, 5)
    expect(blank.classList.contains('mg-over')).toBe(true)
    pointer(tile, 'pointerup', 5, 5)
    expect(blank.querySelector('.mg-tile')).toBe(tile)
    expect(blank.classList.contains('mg-over')).toBe(false)
  })

  it('refuses rules it cannot play', () => {
    const root = document.createElement('div')
    const { host } = fakeConsole(1, 1, { ...presets[0].rules, op: 'subtract' })
    expect(() => builder.mount(root, host)).toThrow(/addition/)
  })
})
