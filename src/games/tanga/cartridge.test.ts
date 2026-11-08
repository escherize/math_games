// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import type { CartridgeEvent, Console } from '../../engine/cartridge'
import { tanga } from './index'
import { presets, type TangaRules } from './rules'

function fakeConsole(puzzles: number, seed = 42, rules: TangaRules = presets[1].rules, avoid?: string[]) {
  const events: CartridgeEvent[] = []
  const host: Console<TangaRules> = { rules, seed, puzzles, avoid, report: (e) => events.push(e) }
  return { host, events }
}

const cards = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>('.mg-card'))
const panels = (card: HTMLElement) => Array.from(card.querySelectorAll<HTMLButtonElement>('button.mg-panel'))
const values = (card: HTMLElement) => panels(card).map((b) => Number(b.dataset.value))
const kinds = (card: HTMLElement) => panels(card).map((b) => b.dataset.kind)
const boardValues = (root: HTMLElement) => cards(root).map(values)
/** The one value on both cards, read off the board the way a solver would. */
const sharedOf = (root: HTMLElement) => {
  const [a, b] = boardValues(root)
  return a.find((v) => b.includes(v))!
}
const wrongPanel = (root: HTMLElement) => panels(cards(root)[0]).find((b) => Number(b.dataset.value) !== sharedOf(root))!

function solve(root: HTMLElement) {
  root.querySelector<HTMLButtonElement>(`button.mg-panel[data-value="${sharedOf(root)}"]`)!.click()
}

describe('same number cartridge', () => {
  it('reports taps and solved puzzles, holds until next(), and stops after the last puzzle', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(2)
    const handle = tanga.mount(root, host)
    expect(cards(root)).toHaveLength(2)
    for (const card of cards(root)) {
      expect(panels(card)).toHaveLength(host.rules.panels)
      expect(card.dataset.panels).toBe(String(host.rules.panels))
      expect(new Set(kinds(card)).size).toBe(host.rules.panels)
    }
    const shared = sharedOf(root)
    const twins = Array.from(root.querySelectorAll<HTMLButtonElement>(`button.mg-panel[data-value="${shared}"]`))
    expect(twins).toHaveLength(2)
    expect(twins[0].dataset.kind).not.toBe(twins[1].dataset.kind)
    for (const b of root.querySelectorAll<HTMLButtonElement>('button.mg-panel')) {
      expect(b.type).toBe('button')
      if (b.dataset.kind === 'numeral') expect(b.textContent).toBe(b.dataset.value)
      else expect(b.querySelector(`svg.mg-pic.mg-pic-${b.dataset.kind}`)).not.toBeNull()
    }

    const miss = wrongPanel(root)
    miss.click()
    expect(events).toEqual([expect.objectContaining({ type: 'tap', correct: false, fact: String(shared) })])
    expect(miss.classList.contains('mg-wrong')).toBe(true)
    expect(handle.next()).toBe(false)

    const before = boardValues(root)
    solve(root)
    expect(events.filter((e) => e.type === 'tap')).toEqual([
      expect.objectContaining({ correct: false }),
      expect.objectContaining({ type: 'tap', correct: true, fact: String(shared) }),
    ])
    expect(events.filter((e) => e.type === 'puzzle')).toEqual([
      expect.objectContaining({ type: 'puzzle', index: 0, of: 2, wrong: 1, response: String(shared), key: String(shared) }),
    ])
    for (const t of twins) expect(t.classList.contains('mg-found')).toBe(true)
    expect(root.querySelectorAll('.mg-found')).toHaveLength(2)
    expect(root.querySelector('.mg-board')!.classList.contains('mg-done')).toBe(true)

    // Taps while holding are ignored; the board stays until the Console moves on.
    miss.click()
    solve(root)
    expect(events).toHaveLength(3)
    expect(boardValues(root)).toEqual(before)

    expect(handle.next()).toBe(true)
    expect(boardValues(root)).not.toEqual(before)
    expect(root.querySelector('.mg-board')!.classList.contains('mg-done')).toBe(false)
    expect(root.querySelectorAll('.mg-found')).toHaveLength(0)
    solve(root)
    expect(events.filter((e) => e.type === 'puzzle').at(-1)).toMatchObject({ index: 1, of: 2, wrong: 0 })
    expect(handle.next()).toBe(false)

    handle.destroy()
    expect(root.children).toHaveLength(0)
  })

  it('plays a one-puzzle round the way Math Wiz asks for it: one puzzle event, then next() is false', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1, 99, presets[0].rules)
    const handle = tanga.mount(root, host)
    expect(cards(root).map((c) => panels(c).length)).toEqual([3, 3])
    solve(root)
    expect(events.filter((e) => e.type === 'puzzle')).toEqual([expect.objectContaining({ type: 'puzzle', index: 0, of: 1, wrong: 0 })])
    expect(events.filter((e) => e.type === 'tap')).toHaveLength(1)
    expect(handle.next()).toBe(false)
    expect(cards(root)).toHaveLength(2)
    handle.destroy()
  })

  it('reports progress on every puzzle of an open-ended run', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(Infinity, 5)
    const handle = tanga.mount(root, host)
    for (let i = 0; i < 3; i++) {
      solve(root)
      expect(events.filter((e) => e.type === 'puzzle').at(-1)).toMatchObject({ index: i, of: Infinity })
      expect(handle.next()).toBe(true)
    }
    handle.destroy()
  })

  it('never asks for the same shared number twice in a round, nor one the Console says to avoid', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(5, 11, presets[1].rules, ['3', '7'])
    const handle = tanga.mount(root, host)
    for (let i = 0; i < 5; i++) {
      solve(root)
      if (i < 4) expect(handle.next()).toBe(true)
    }
    const keys = events.filter((e) => e.type === 'puzzle').map((e) => (e as { key: string }).key)
    expect(new Set(keys).size).toBe(5)
    expect(keys).not.toContain('3')
    expect(keys).not.toContain('7')
    handle.destroy()
  })

  it('draws the same round for the same seed and a different one for another', () => {
    const a = document.createElement('div')
    const b = document.createElement('div')
    const c = document.createElement('div')
    tanga.mount(a, fakeConsole(1, 7).host)
    tanga.mount(b, fakeConsole(1, 7).host)
    tanga.mount(c, fakeConsole(1, 8).host)
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
      const { host } = fakeConsole(1)
      tanga.mount(root, host)
      solve(root)
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { value: real, configurable: true })
    }
    expect(calls).toEqual([])
  })

  it('refuses rules its spec cannot play', () => {
    const root = document.createElement('div')
    expect(() => tanga.mount(root, fakeConsole(1, 1, { ...presets[1].rules, minN: 9, maxN: 1 }).host)).toThrow(/Smallest number/)
    expect(() => tanga.mount(root, fakeConsole(1, 1, { ...presets[1].rules, minN: 1, maxN: 6, panels: 4 }).host)).toThrow(/different numbers/)
    expect(root.children).toHaveLength(0)
  })
})
