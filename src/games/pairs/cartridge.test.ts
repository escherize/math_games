// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import type { CartridgeEvent, Console } from '../../engine/cartridge'
import { pairs } from './index'
import { presets, type PairsRules } from './rules'

function fakeConsole(puzzles: number, seed = 42, rules: PairsRules = presets[1].rules) {
  const events: CartridgeEvent[] = []
  const host: Console<PairsRules> = { rules, seed, puzzles, report: (e) => events.push(e) }
  return { host, events }
}

const cells = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLButtonElement>('button.mg-cell'))
const values = (root: HTMLElement) => cells(root).map((b) => Number(b.dataset.value))
const target = (root: HTMLElement) => Number(root.querySelector('.mg-target')!.textContent)
const live = (root: HTMLElement, v: number) => root.querySelector<HTMLButtonElement>(`button.mg-cell[data-value="${v}"]:not(.mg-found):not(.mg-picked)`)
const picked = (root: HTMLElement) => cells(root).filter((b) => b.classList.contains('mg-picked'))
const puzzles = (events: CartridgeEvent[]) => events.filter((e) => e.type === 'puzzle') as Array<Extract<CartridgeEvent, { type: 'puzzle' }>>

/** A tile whose partner is not on the board. */
function decoy(root: HTMLElement): HTMLButtonElement {
  const t = target(root)
  const vs = values(root)
  return cells(root).find((b, i) => !vs.some((w, j) => j !== i && Number(b.dataset.value) + w === t))!
}

/** Tap each unfound tile that has a partner, then its partner, the way a scripted solver would. */
function solve(root: HTMLElement) {
  const t = target(root)
  for (const b of cells(root)) {
    if (b.classList.contains('mg-found')) continue
    const x = Number(b.dataset.value)
    b.click()
    const partner = live(root, t - x)
    if (partner) partner.click()
    else b.click()
  }
}

describe('pairs cartridge', () => {
  it('picks, pairs, shakes a miss, reports taps and puzzles, holds until next(), stops after the last puzzle', () => {
    const root = document.createElement('div')
    const rules = { ...presets[1].rules, pairs: 2, decoys: 1 }
    const { host, events } = fakeConsole(2, 42, rules)
    const handle = pairs.mount(root, host)
    expect(target(root)).toBe(10)
    expect(cells(root)).toHaveLength(5)
    expect(root.querySelector<HTMLElement>('.mg-grid')!.style.getPropertyValue('--mg-cols')).toBe('3')
    for (const b of cells(root)) expect(b.type).toBe('button')

    const d = decoy(root)
    const dv = Number(d.dataset.value)
    const first = cells(root).find((b) => b !== d)!
    const fv = Number(first.dataset.value)

    // Pick, then unpick: nothing is reported.
    first.click()
    expect(picked(root)).toEqual([first])
    first.click()
    expect(picked(root)).toEqual([])
    expect(events).toEqual([])

    // A tile and the decoy never make the target: both shake, the pick clears.
    first.click()
    d.click()
    const [lo, hi] = fv < dv ? [fv, dv] : [dv, fv]
    expect(events).toEqual([expect.objectContaining({ type: 'tap', correct: false, fact: `${lo}+${hi}` })])
    expect(first.classList.contains('mg-wrong')).toBe(true)
    expect(d.classList.contains('mg-wrong')).toBe(true)
    expect(picked(root)).toEqual([])
    expect(handle.next()).toBe(false)

    const before = values(root)
    solve(root)
    const found = cells(root).filter((b) => b.classList.contains('mg-found'))
    expect(found).toHaveLength(4)
    expect(d.classList.contains('mg-found')).toBe(false)
    expect(root.querySelector('.mg-board')!.classList.contains('mg-done')).toBe(true)
    expect(events.filter((e) => e.type === 'tap' && e.correct)).toHaveLength(2)
    expect(puzzles(events)).toHaveLength(1)
    const solved = puzzles(events)[0]
    expect(solved).toMatchObject({ index: 0, of: 2, wrong: 1 })
    expect(solved.response.split(';')).toHaveLength(2)
    for (const r of solved.response.split(';')) {
      const [a, b] = r.split('+').map(Number)
      expect(a + b).toBe(10)
    }
    expect(solved.key).toBe(`10:${[...before].sort((a, b) => a - b).join(',')}`)

    // Held: found tiles are inert and the decoy no longer picks.
    found[0].click()
    d.click()
    expect(picked(root)).toEqual([])
    expect(events).toHaveLength(4)
    expect(values(root)).toEqual(before)

    expect(handle.next()).toBe(true)
    expect(root.querySelector('.mg-board')!.classList.contains('mg-done')).toBe(false)
    expect(values(root)).not.toEqual(before)
    solve(root)
    expect(puzzles(events).at(-1)).toMatchObject({ index: 1, of: 2, wrong: 0 })
    expect(handle.next()).toBe(false)

    handle.destroy()
    expect(root.children).toHaveLength(0)
  })

  it('reports the bond of a found pair and leaves found tiles inert', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1, 3, { ...presets[1].rules, pairs: 2, decoys: 0 })
    pairs.mount(root, host)
    const [a] = cells(root)
    const x = Number(a.dataset.value)
    a.click()
    live(root, 10 - x)!.click()
    expect(events).toEqual([expect.objectContaining({ type: 'tap', correct: true, fact: `${Math.min(x, 10 - x)}+${Math.max(x, 10 - x)}` })])
    expect(a.classList.contains('mg-found')).toBe(true)
    a.click()
    expect(picked(root)).toEqual([])
    expect(events).toHaveLength(1)
  })

  it('pairs a tile with its twin when doubles are allowed, and the twin is a separate tile', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1, 1, { ...presets[2].rules, pairs: 5, decoys: 0 })
    pairs.mount(root, host)
    const fives = cells(root).filter((b) => b.dataset.value === '5')
    expect(fives).toHaveLength(2)
    fives[0].click()
    expect(live(root, 5)).toBe(fives[1])
    fives[1].click()
    expect(events).toEqual([expect.objectContaining({ type: 'tap', correct: true, fact: '5+5' })])
    solve(root)
    expect(puzzles(events)).toEqual([expect.objectContaining({ index: 0, of: 1, wrong: 0 })])
    expect(puzzles(events)[0].response.startsWith('5+5;')).toBe(true)
  })

  it('plays a one-puzzle round the way Math Wiz asks for it: one puzzle event, then next() is false', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1, 99)
    const handle = pairs.mount(root, host)
    solve(root)
    expect(puzzles(events)).toEqual([expect.objectContaining({ type: 'puzzle', index: 0, of: 1, wrong: 0 })])
    expect(events.filter((e) => e.type === 'tap')).toHaveLength(host.rules.pairs)
    expect(handle.next()).toBe(false)
    expect(cells(root).length).toBeGreaterThan(0)
    handle.destroy()
  })

  it('reports progress on every puzzle of an open-ended run', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(Infinity, 5)
    const handle = pairs.mount(root, host)
    for (let i = 0; i < 3; i++) {
      solve(root)
      expect(puzzles(events).at(-1)).toMatchObject({ index: i, of: Infinity })
      expect(handle.next()).toBe(true)
    }
    handle.destroy()
  })

  it('never repeats a key within a round or one the Console asks it to avoid', () => {
    const root = document.createElement('div')
    const rules = { ...presets[1].rules, pairs: 2, decoys: 1 }
    const first = fakeConsole(1, 7, rules)
    const h = pairs.mount(root, first.host)
    solve(root)
    const seen = puzzles(first.events)[0].key
    h.destroy()
    const again = fakeConsole(3, 7, rules)
    again.host.avoid = [seen]
    const handle = pairs.mount(root, again.host)
    for (let i = 0; i < 3; i++) {
      solve(root)
      if (i < 2) expect(handle.next()).toBe(true)
    }
    const keys = puzzles(again.events).map((e) => e.key)
    expect(keys).not.toContain(seen)
    expect(new Set(keys).size).toBe(3)
  })

  it('draws the same round for the same seed and a different one for another', () => {
    const a = document.createElement('div')
    const b = document.createElement('div')
    const c = document.createElement('div')
    pairs.mount(a, fakeConsole(1, 7).host)
    pairs.mount(b, fakeConsole(1, 7).host)
    pairs.mount(c, fakeConsole(1, 8).host)
    expect(values(a)).toEqual(values(b))
    expect(values(a)).not.toEqual(values(c))
  })

  it('never reads or writes browser storage', () => {
    const root = document.createElement('div')
    const calls: string[] = []
    const real = globalThis.localStorage
    const spy = new Proxy(real, { get: (t, k) => (calls.push(String(k)), Reflect.get(t, k)) })
    Object.defineProperty(globalThis, 'localStorage', { value: spy, configurable: true })
    try {
      const { host } = fakeConsole(1)
      pairs.mount(root, host)
      solve(root)
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { value: real, configurable: true })
    }
    expect(calls).toEqual([])
  })

  it('refuses rules its spec cannot play', () => {
    const root = document.createElement('div')
    expect(() => pairs.mount(root, fakeConsole(1, 1, { ...presets[1].rules, pairs: 9 }).host)).toThrow(/does not have/)
    expect(() => pairs.mount(root, fakeConsole(1, 1, { ...presets[1].rules, target: 12 as 10 }).host)).toThrow(/5, 10 or 20/)
  })

  it('speaks one sentence naming the target', () => {
    expect(pairs.prompt(presets[3].rules)).toBe('Tap two numbers that make 20. Find every pair.')
  })
})
