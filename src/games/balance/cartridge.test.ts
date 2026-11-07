// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import type { CartridgeEvent, Console } from '../../engine/cartridge'
import { balance } from './index'
import { presets, type BalanceRules } from './rules'

function fakeConsole(puzzles: number, seed = 42, rules: BalanceRules = presets[1].rules) {
  const events: CartridgeEvent[] = []
  const host: Console<BalanceRules> = { rules, seed, puzzles, report: (e) => events.push(e) }
  return { host, events }
}

const SLOT = { left: 300, top: 100, width: 60, height: 60 }
function box(el: Element, b: { left: number; top: number; width: number; height: number }) {
  el.getBoundingClientRect = () => ({ ...b, right: b.left + b.width, bottom: b.top + b.height, x: b.left, y: b.top, toJSON: () => b }) as DOMRect
}

const ZONE = { left: 250, top: 0, width: 250, height: 240 }
/** Give the drop zone, the right pan and its slot a real box; happy-dom lays nothing out. */
function layout(root: HTMLElement) {
  box(root.querySelector('.mg-drop')!, ZONE)
  box(root.querySelector('.mg-pan-right')!, { left: 280, top: 80, width: 150, height: 100 })
  box(root.querySelector('.mg-slot')!, SLOT)
}

const tiles = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>('.mg-tile'))
const values = (root: HTMLElement) => tiles(root).map((t) => Number(t.dataset.value))
const whole = (root: HTMLElement) => Number(root.querySelector('.mg-pan-left .mg-weight')!.textContent)
const part = (root: HTMLElement) => Number(root.querySelector('.mg-pan-right .mg-weight')!.textContent)
const missingTile = (root: HTMLElement) => tiles(root).find((t) => Number(t.dataset.value) === whole(root) - part(root))!

function pointer(el: Element, type: string, x: number, y: number) {
  el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true, cancelable: true, pointerType: 'touch' }))
}
function dragTo(tile: Element, x: number, y: number) {
  pointer(tile, 'pointerdown', 10, 400)
  pointer(tile, 'pointermove', x, y)
  pointer(tile, 'pointerup', x, y)
}
const dropOnSlot = (tile: Element) => dragTo(tile, SLOT.left + 30, SLOT.top + 30)
const tiltOf = (root: HTMLElement) => root.querySelector<HTMLElement>('.mg-beam')!.style.getPropertyValue('--mg-tilt')

describe('balance cartridge', () => {
  it('reports drops and solved puzzles, holds until next(), and stops after the last puzzle', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(2)
    const handle = balance.mount(root, host)
    layout(root)
    expect(tiles(root)).toHaveLength(host.rules.tray)
    expect(tiltOf(root)).not.toBe('0deg')

    const wrongTile = tiles(root).find((t) => t !== missingTile(root))!
    // Dropped on empty space: back to the tray, no event.
    dragTo(wrongTile, 5, 5)
    expect(events).toHaveLength(0)
    expect(wrongTile.classList.contains('mg-returning')).toBe(true)

    dropOnSlot(wrongTile)
    expect(events.at(-1)).toMatchObject({ type: 'tap', correct: false })
    expect(wrongTile.classList.contains('mg-wrong')).toBe(true)
    expect(wrongTile.parentElement!.classList.contains('mg-tray')).toBe(true)
    expect(handle.next()).toBe(false)

    const before = [whole(root), part(root), ...values(root)]
    const right = missingTile(root)
    dropOnSlot(right)
    expect(events.filter((e) => e.type === 'puzzle')).toEqual([
      expect.objectContaining({ type: 'puzzle', index: 0, of: 2, wrong: 1, response: `${before[0]}=${before[1]}+${before[0] - before[1]}` }),
    ])
    expect(events.filter((e) => e.type === 'tap' && e.correct)).toHaveLength(1)
    expect(right.parentElement!.classList.contains('mg-slot')).toBe(true)
    expect(tiltOf(root)).toBe('0deg')
    expect(root.querySelector('.mg-beam')!.classList.contains('mg-level')).toBe(true)

    // Drops while holding are ignored.
    dropOnSlot(wrongTile)
    expect(events.filter((e) => e.type === 'tap')).toHaveLength(2)

    expect(handle.next()).toBe(true)
    layout(root)
    expect([whole(root), part(root), ...values(root)]).not.toEqual(before)
    dropOnSlot(missingTile(root))
    expect(events.filter((e) => e.type === 'puzzle').at(-1)).toMatchObject({ index: 1, of: 2, wrong: 0 })
    expect(handle.next()).toBe(false)

    handle.destroy()
    expect(root.children).toHaveLength(0)
  })

  it('plays a one-puzzle round the way Math Wiz asks for it', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1, 99, presets[0].rules)
    const handle = balance.mount(root, host)
    layout(root)
    dropOnSlot(missingTile(root))
    expect(events.filter((e) => e.type === 'puzzle')).toEqual([expect.objectContaining({ index: 0, of: 1, wrong: 0 })])
    expect(handle.next()).toBe(false)
    handle.destroy()
  })

  it('previews the tilt while a tile hovers over the right pan', () => {
    const root = document.createElement('div')
    const { host } = fakeConsole(1, 3)
    balance.mount(root, host)
    layout(root)
    const right = missingTile(root)
    const base = tiltOf(root)
    pointer(right, 'pointerdown', 10, 400)
    pointer(right, 'pointermove', 300, 100)
    expect(tiltOf(root)).toBe('0deg')
    pointer(right, 'pointermove', 10, 400)
    expect(tiltOf(root)).toBe(base)
    pointer(right, 'pointerup', 10, 400)
  })

  it('accepts a drop anywhere on the right side of the scale, not only on the pan', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1, 7)
    balance.mount(root, host)
    layout(root)
    // Finger in the zone's far corner, well outside the pan's box.
    dragTo(missingTile(root), ZONE.left + ZONE.width - 5, ZONE.top + 5)
    expect(events.filter((e) => e.type === 'puzzle')).toHaveLength(1)
  })

  it('accepts a tile whose own box touches the pan while the finger is outside the zone', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1, 8)
    balance.mount(root, host)
    layout(root)
    const tile = missingTile(root)
    // The tile sits across the pan's left edge; the finger is left of the zone.
    box(tile, { left: 240, top: 90, width: 60, height: 60 })
    pointer(tile, 'pointerdown', 10, 400)
    pointer(tile, 'pointermove', 245, 95)
    expect(root.querySelector('.mg-slot')!.classList.contains('mg-over')).toBe(true)
    pointer(tile, 'pointerup', 245, 95)
    expect(events.filter((e) => e.type === 'puzzle')).toHaveLength(1)
    expect(root.querySelector('.mg-slot')!.classList.contains('mg-over')).toBe(false)
  })

  it('never repeats a puzzle within a round, reports its key, and honours avoid across mounts', () => {
    const keys: string[] = []
    const root = document.createElement('div')
    const { host, events } = fakeConsole(6, 11, presets[0].rules)
    const handle = balance.mount(root, host)
    for (let i = 0; i < 6; i++) {
      layout(root)
      dropOnSlot(missingTile(root))
      handle.next()
    }
    for (const e of events) if (e.type === 'puzzle') keys.push(e.key)
    expect(keys).toHaveLength(6)
    expect(new Set(keys).size).toBe(6)
    expect(keys[0]).toMatch(/^\d+=\d+\+\d+$/)
    handle.destroy()

    // A second Console with the same seed but told to avoid the first puzzle gets a different one.
    const again = document.createElement('div')
    const second = fakeConsole(1, 11, presets[0].rules)
    balance.mount(again, { ...second.host, avoid: [keys[0]] })
    layout(again)
    dropOnSlot(missingTile(again))
    const k = second.events.find((e) => e.type === 'puzzle')
    expect(k && k.type === 'puzzle' ? k.key : null).not.toBe(keys[0])
  })

  it('refuses rules it cannot play', () => {
    const root = document.createElement('div')
    const { host } = fakeConsole(1, 1, { ...presets[0].rules, op: 'subtract' })
    expect(() => balance.mount(root, host)).toThrow(/addition/)
  })
})
