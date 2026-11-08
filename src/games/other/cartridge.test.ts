// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import type { CartridgeEvent, Console } from '../../engine/cartridge'
import { other } from './index'
import { presets, type OtherRules } from './rules'

function fakeConsole(puzzles: number, seed = 42, rules: OtherRules = presets[0].rules, avoid?: string[]) {
  const events: CartridgeEvent[] = []
  const host: Console<OtherRules> = { rules, seed, puzzles, avoid, report: (e) => events.push(e) }
  return { host, events }
}

/** a and b as the board shows them. */
const sum = (root: HTMLElement) => Array.from(root.querySelectorAll('.mg-sum .mg-num')).map((n) => Number(n.textContent)) as [number, number]
const options = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLButtonElement>('button.mg-option'))
const parts = (b: HTMLButtonElement) => [Number(b.dataset.p), Number(b.dataset.q)]
/** The option a scripted solver would tap: the split with a part equal to 10 - a. */
function helpful(root: HTMLElement): HTMLButtonElement {
  const [a] = sum(root)
  return options(root).find((o) => parts(o).includes(10 - a))!
}
const unhelpful = (root: HTMLElement) => options(root).find((o) => o !== helpful(root))!
const totals = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLButtonElement>('button.mg-total'))
const boardValues = (root: HTMLElement) => ({ sum: sum(root), options: options(root).map(parts) })

function solve(root: HTMLElement) {
  helpful(root).click()
  const [a, b] = sum(root)
  totals(root).find((t) => Number(t.dataset.value) === a + b)?.click()
}

describe('the other number cartridge', () => {
  it('shows a + b and true splits of b, shakes a wrong split, glows the helpful one, holds until next(), stops after the last puzzle', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(2)
    const handle = other.mount(root, host)
    const [a, b] = sum(root)
    expect(a).toBeGreaterThanOrEqual(7)
    expect(a + b).toBeGreaterThan(10)
    expect(options(root)).toHaveLength(2)
    for (const o of options(root)) {
      const [p, q] = parts(o)
      expect(p + q).toBe(b)
      expect(Array.from(o.querySelectorAll('.mg-num')).map((n) => n.textContent)).toEqual([String(p), String(q)])
      expect(o.querySelector('.mg-plus')).not.toBeNull()
    }
    expect(root.querySelector('.mg-sum .mg-plus')).not.toBeNull()

    const bad = unhelpful(root)
    bad.click()
    expect(bad.classList.contains('mg-wrong')).toBe(true)
    expect(events).toEqual([expect.objectContaining({ type: 'tap', correct: false, fact: `${Math.min(10 - a, a)}+${Math.max(10 - a, a)}` })])
    expect(handle.next()).toBe(false)

    const good = helpful(root)
    good.click()
    expect(good.classList.contains('mg-found')).toBe(true)
    expect(bad.classList.contains('mg-muted')).toBe(true)
    expect(good.classList.contains('mg-muted')).toBe(false)
    expect(root.querySelector('.mg-board')!.classList.contains('mg-done')).toBe(true)
    expect(totals(root)).toHaveLength(0)
    const x = 10 - a
    expect(events.slice(1)).toEqual([
      expect.objectContaining({ type: 'tap', correct: true, fact: `${Math.min(x, a)}+${Math.max(x, a)}` }),
      expect.objectContaining({ type: 'puzzle', index: 0, of: 2, wrong: 1, response: `${a}+${b}=${a}+${x}+${b - x}`, key: `${a}+${b}` }),
    ])

    // Held: further taps do nothing.
    const before = boardValues(root)
    bad.click()
    good.click()
    expect(events).toHaveLength(3)
    expect(boardValues(root)).toEqual(before)

    expect(handle.next()).toBe(true)
    expect(root.querySelector('.mg-board')!.classList.contains('mg-done')).toBe(false)
    expect(boardValues(root)).not.toEqual(before)
    solve(root)
    expect(events.filter((e) => e.type === 'puzzle').at(-1)).toMatchObject({ index: 1, of: 2, wrong: 0 })
    expect(handle.next()).toBe(false)

    handle.destroy()
    expect(root.children).toHaveLength(0)
  })

  it('asks for the total after the split when the rules say so, and the wrong total shakes', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1, 11, presets[2].rules)
    const handle = other.mount(root, host)
    const [a, b] = sum(root)
    expect(options(root)).toHaveLength(Math.min(3, Math.floor(b / 2)))
    expect(totals(root)).toHaveLength(0)

    // Totals are not tappable before the split is found.
    helpful(root).click()
    expect(root.querySelector('.mg-board')!.classList.contains('mg-done')).toBe(false)
    expect(handle.next()).toBe(false)
    const choices = totals(root)
    expect(choices).toHaveLength(3)
    expect(choices.map((t) => t.textContent)).toEqual(choices.map((t) => t.dataset.value))
    const right = choices.find((t) => Number(t.dataset.value) === a + b)!
    const decoy = choices.find((t) => t !== right)!
    decoy.click()
    expect(decoy.classList.contains('mg-wrong')).toBe(true)
    expect(events.at(-1)).toMatchObject({ type: 'tap', correct: false, fact: `${Math.min(a, b)}+${Math.max(a, b)}` })

    // A second tap on an option after it is found changes nothing.
    helpful(root).click()
    expect(events.filter((e) => e.type === 'tap')).toHaveLength(2)

    right.click()
    expect(right.classList.contains('mg-found')).toBe(true)
    expect(decoy.classList.contains('mg-muted')).toBe(true)
    expect(root.querySelector('.mg-board')!.classList.contains('mg-done')).toBe(true)
    const x = 10 - a
    expect(events.filter((e) => e.type === 'puzzle')).toEqual([
      expect.objectContaining({ index: 0, of: 1, wrong: 1, response: `${a}+${b}=${a}+${x}+${b - x}=${a + b}`, key: `${a}+${b}` }),
    ])
    expect(handle.next()).toBe(false)
    handle.destroy()
  })

  it('plays a one-puzzle round the way Math Wiz asks for it: one puzzle event, then next() is false', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1, 99)
    const handle = other.mount(root, host)
    solve(root)
    expect(events.filter((e) => e.type === 'puzzle')).toEqual([expect.objectContaining({ type: 'puzzle', index: 0, of: 1, wrong: 0 })])
    expect(events.filter((e) => e.type === 'tap')).toHaveLength(1)
    expect(handle.next()).toBe(false)
    handle.destroy()
  })

  it('reports progress on every puzzle of an open-ended run, never repeating a sum while one remains', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(Infinity, 5, presets[1].rules)
    const handle = other.mount(root, host)
    const keys = new Set<string>()
    for (let i = 0; i < 8; i++) {
      keys.add(sum(root).join('+'))
      solve(root)
      expect(events.filter((e) => e.type === 'puzzle').at(-1)).toMatchObject({ index: i, of: Infinity })
      expect(handle.next()).toBe(true)
    }
    expect(keys.size).toBe(8)
    handle.destroy()
  })

  it('skips the sums the Console says the child has already seen', () => {
    const seen = document.createElement('div')
    other.mount(seen, fakeConsole(1, 3, presets[1].rules).host)
    const key = sum(seen).join('+')
    const fresh = document.createElement('div')
    other.mount(fresh, fakeConsole(1, 3, presets[1].rules, [key]).host)
    expect(sum(fresh).join('+')).not.toBe(key)
  })

  it('draws the same round for the same seed and a different one for another', () => {
    const a = document.createElement('div')
    const b = document.createElement('div')
    const c = document.createElement('div')
    other.mount(a, fakeConsole(1, 7, presets[1].rules).host)
    other.mount(b, fakeConsole(1, 7, presets[1].rules).host)
    other.mount(c, fakeConsole(1, 8, presets[1].rules).host)
    expect(boardValues(a)).toEqual(boardValues(b))
    expect(boardValues(a)).not.toEqual(boardValues(c))
  })

  it('never reads or writes browser storage', () => {
    const root = document.createElement('div')
    const calls: string[] = []
    const real = globalThis.localStorage
    const spy = new Proxy(real, { get: (t, k) => (calls.push(String(k)), Reflect.get(t, k)) })
    Object.defineProperty(globalThis, 'localStorage', { value: spy, configurable: true })
    try {
      const { host } = fakeConsole(1, 1, presets[2].rules)
      other.mount(root, host)
      solve(root)
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { value: real, configurable: true })
    }
    expect(calls).toEqual([])
  })

  it('refuses rules its spec cannot play', () => {
    const root = document.createElement('div')
    expect(() => other.mount(root, fakeConsole(1, 1, { ...presets[0].rules, minA: 9, maxA: 9, maxSum: 12 }).host)).toThrow(/No sum crosses ten/)
    expect(() => other.mount(root, fakeConsole(1, 1, { ...presets[0].rules, op: 'subtract' }).host)).toThrow(/addition/)
  })
})
