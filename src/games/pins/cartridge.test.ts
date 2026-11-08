// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import type { CartridgeEvent, Console } from '../../engine/cartridge'
import { pins } from './index'
import { presets, type PinsRules } from './rules'

function fakeConsole(puzzles: number, seed = 42, rules: PinsRules = presets[2].rules) {
  const events: CartridgeEvent[] = []
  const host: Console<PinsRules> = { rules, seed, puzzles, report: (e) => events.push(e) }
  return { host, events }
}

const roll = (root: HTMLElement) => Number(root.querySelector<HTMLElement>('.mg-roll[data-roll]')!.dataset.roll)
const dice = (root: HTMLElement) => root.querySelectorAll('.mg-roll .mg-die svg.mg-pic-die').length
const pin = (root: HTMLElement, v: number) => root.querySelector<HTMLButtonElement>(`button.mg-pin[data-value="${v}"]`)!
const standing = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLButtonElement>('button.mg-pin:not(.mg-down)')).map((b) => Number(b.dataset.value))
const down = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLButtonElement>('button.mg-pin.mg-down')).map((b) => Number(b.dataset.value))
const puzzles = (events: CartridgeEvent[]) => events.filter((e) => e.type === 'puzzle')

/** What a scripted solver does: the matching pin if it stands, else two standing pins that make the roll. */
function solve(root: HTMLElement, allowDifference = false, preferPair = false) {
  const r = roll(root)
  const up = standing(root)
  const single = up.includes(r) ? r : null
  let pair: [number, number] | null = null
  for (let i = 0; i < up.length && !pair; i++)
    for (let j = i + 1; j < up.length && !pair; j++)
      if (up[i] + up[j] === r || (allowDifference && Math.abs(up[i] - up[j]) === r)) pair = [up[i], up[j]]
  if (single !== null && !(preferPair && pair)) {
    pin(root, single).click()
    return
  }
  if (!pair) throw new Error(`roll ${r} cannot be made from ${up.join(',')}`)
  pin(root, pair[0]).click()
  pin(root, pair[1]).click()
}

describe('pins cartridge', () => {
  it('racks the pins, shows the roll, knocks the matching pin, and holds until next()', () => {
    const root = document.createElement('div')
    // Ten pins with one die: every roll has a standing match until that pin falls.
    const { host, events } = fakeConsole(2, 42, { ...presets[2].rules, dice: 1 })
    const handle = pins.mount(root, host)
    expect(root.querySelectorAll('button.mg-pin')).toHaveLength(10)
    expect(root.querySelectorAll('.mg-lane .mg-row')).toHaveLength(4)
    expect(Array.from(root.querySelectorAll('.mg-row')).map((row) => row.querySelectorAll('.mg-pin').length)).toEqual([4, 3, 2, 1])
    expect(dice(root)).toBe(1)
    const r = roll(root)
    expect(r).toBeGreaterThanOrEqual(1)
    expect(r).toBeLessThanOrEqual(6)
    expect(handle.next()).toBe(false)

    // All pins stand, so the matching pin is there to tap.
    pin(root, r).click()
    expect(pin(root, r).classList.contains('mg-down')).toBe(true)
    expect(down(root)).toEqual([r])
    expect(events).toEqual([
      expect.objectContaining({ type: 'tap', correct: true, fact: String(r) }),
      expect.objectContaining({ type: 'puzzle', index: 0, of: 2, wrong: 0, response: String(r), key: String(r) }),
    ])
    expect(root.querySelector('.mg-board')!.classList.contains('mg-done')).toBe(true)

    // Held: taps do nothing until the Console moves on.
    pin(root, 10).click()
    expect(events).toHaveLength(2)
    expect(down(root)).toEqual([r])

    expect(handle.next()).toBe(true)
    expect(root.querySelector('.mg-board')!.classList.contains('mg-done')).toBe(false)
    // The fallen pin stays down into the next roll.
    expect(down(root)).toEqual([r])
    expect(roll(root)).not.toBe(r)
    solve(root)
    expect(puzzles(events).at(-1)).toMatchObject({ index: 1, of: 2, wrong: 0 })
    expect(handle.next()).toBe(false)

    handle.destroy()
    expect(root.children).toHaveLength(0)
  })

  it('knocks two pins that add to the roll, shakes a pair that does not, and unpicks a picked pin', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1, 3)
    pins.mount(root, host)
    const r = roll(root)
    expect(r).toBeGreaterThanOrEqual(3)
    // A pair that misses.
    const [a, b] = 1 + 2 === r ? [1, 4] : [1, 2]
    pin(root, a).click()
    expect(pin(root, a).classList.contains('mg-picked')).toBe(true)
    pin(root, a).click()
    expect(pin(root, a).classList.contains('mg-picked')).toBe(false)
    expect(events).toHaveLength(0)

    pin(root, a).click()
    pin(root, b).click()
    expect(events).toEqual([expect.objectContaining({ type: 'tap', correct: false })])
    expect(pin(root, a).classList.contains('mg-wrong')).toBe(true)
    expect(pin(root, b).classList.contains('mg-wrong')).toBe(true)
    expect(pin(root, a).classList.contains('mg-picked')).toBe(false)
    expect(standing(root)).toHaveLength(10)

    // Now the right pair: 1 and the rest.
    const lo = 1
    const hi = r - 1
    pin(root, hi).click()
    pin(root, lo).click()
    expect(down(root).sort((x, y) => x - y)).toEqual([lo, hi])
    expect(events.slice(1)).toEqual([
      expect.objectContaining({ type: 'tap', correct: true, fact: `${lo}+${hi}` }),
      expect.objectContaining({ type: 'puzzle', index: 0, of: 1, wrong: 1, response: `${r}=${lo}+${hi}`, key: String(r) }),
    ])
  })

  it('with take-away allowed, two pins that differ by the roll fall and report the bond underneath', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1, 11, presets[3].rules)
    pins.mount(root, host)
    expect(dice(root)).toBe(2)
    const r = roll(root)
    const lo = 10 - r >= 1 ? 10 - r : 1
    const hi = lo + r
    expect(hi).toBeLessThanOrEqual(10)
    pin(root, lo).click()
    pin(root, hi).click()
    expect(down(root).sort((x, y) => x - y)).toEqual([lo, hi])
    expect(events).toEqual([
      expect.objectContaining({ type: 'tap', correct: true, fact: `${Math.min(r, lo)}+${Math.max(r, lo)}` }),
      expect.objectContaining({ type: 'puzzle', response: `${r}=${hi}-${lo}`, key: String(r) }),
    ])
  })

  it('shows two dice whose faces sum to the roll', () => {
    const root = document.createElement('div')
    const { host } = fakeConsole(Infinity, 5, presets[2].rules)
    const handle = pins.mount(root, host)
    for (let i = 0; i < 12; i++) {
      const faces = Array.from(root.querySelectorAll('.mg-die')).map((d) => d.querySelectorAll('.mg-pip').length)
      expect(faces).toHaveLength(2)
      for (const f of faces) expect(f).toBeGreaterThanOrEqual(1)
      expect(faces[0] + faces[1]).toBe(roll(root))
      solve(root)
      expect(handle.next()).toBe(true)
    }
  })

  it('keeps fallen pins down across the round and stands them again once nothing can make a roll', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(Infinity, 9, presets[0].rules)
    const handle = pins.mount(root, host)
    expect(root.querySelectorAll('button.mg-pin')).toHaveLength(6)
    let fallen: number[] = []
    let resets = 0
    for (let i = 0; i < 20; i++) {
      // Every roll is achievable from what stands, so each solve knocks at least one more pin down.
      const before = standing(root)
      for (const v of fallen) expect(before).not.toContain(v)
      solve(root, false, true)
      expect(puzzles(events).at(-1)).toMatchObject({ index: i, of: Infinity, wrong: 0 })
      expect(standing(root).length).toBeLessThan(before.length)
      fallen = down(root)
      expect(handle.next()).toBe(true)
      if (standing(root).length === 6) {
        resets++
        fallen = []
      } else {
        expect(down(root)).toEqual(fallen)
      }
    }
    expect(resets).toBeGreaterThan(1)
  })

  it('plays a one-puzzle round the way Math Wiz asks for it', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1, 99, presets[2].rules)
    const handle = pins.mount(root, host)
    solve(root)
    expect(puzzles(events)).toEqual([expect.objectContaining({ type: 'puzzle', index: 0, of: 1, wrong: 0 })])
    expect(handle.next()).toBe(false)
    handle.destroy()
  })

  it('draws the same roll for the same seed and another for a different seed', () => {
    const rolls = (seed: number) => {
      const root = document.createElement('div')
      const { host } = fakeConsole(3, seed, presets[2].rules)
      const handle = pins.mount(root, host)
      const out = [roll(root)]
      for (let i = 0; i < 2; i++) {
        solve(root)
        handle.next()
        out.push(roll(root))
      }
      return out
    }
    expect(rolls(7)).toEqual(rolls(7))
    const differs = [8, 9, 10, 11].some((s) => JSON.stringify(rolls(s)) !== JSON.stringify(rolls(7)))
    expect(differs).toBe(true)
  })

  it('never rolls what the standing pins cannot make', () => {
    for (const p of presets) {
      const root = document.createElement('div')
      const { host } = fakeConsole(Infinity, 17, p.rules)
      const handle = pins.mount(root, host)
      for (let i = 0; i < 30; i++) {
        expect(() => solve(root, p.rules.allowDifference, i % 2 === 0)).not.toThrow()
        expect(handle.next()).toBe(true)
      }
      handle.destroy()
    }
  })

  it('never reads or writes browser storage', () => {
    const root = document.createElement('div')
    const calls: string[] = []
    const real = globalThis.localStorage
    const spy = new Proxy(real, { get: (t, k) => (calls.push(String(k)), Reflect.get(t, k)) })
    Object.defineProperty(globalThis, 'localStorage', { value: spy, configurable: true })
    try {
      const { host } = fakeConsole(1)
      pins.mount(root, host)
      solve(root)
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { value: real, configurable: true })
    }
    expect(calls).toEqual([])
  })

  it('refuses rules its spec cannot play', () => {
    const root = document.createElement('div')
    const { host } = fakeConsole(1, 1, { ...presets[1].rules, pins: 8 as PinsRules['pins'] })
    expect(() => pins.mount(root, host)).toThrow(/6 or 10/)
  })
})
