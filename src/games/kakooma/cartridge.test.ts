// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import type { CartridgeEvent, Console } from '../../engine/cartridge'
import { solutions } from './generator'
import { kakooma } from './index'
import { presets, type KakoomaRules } from './rules'

function fakeConsole(puzzles: number, seed = 42, rules: KakoomaRules = presets[2].rules) {
  const events: CartridgeEvent[] = []
  const host: Console<KakoomaRules> = { rules, seed, puzzles, report: (e) => events.push(e) }
  return { host, events }
}

const pods = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>('.mg-pod'))
const cells = (pod: HTMLElement) => Array.from(pod.querySelectorAll<HTMLButtonElement>('button.mg-cell'))
const values = (pod: HTMLElement) => cells(pod).map((b) => Number(b.textContent))
const answerIndex = (pod: HTMLElement) => solutions(values(pod), 'add')[0].whole
const boardValues = (root: HTMLElement) => pods(root).map(values)

function solve(root: HTMLElement) {
  for (const pod of pods(root)) cells(pod)[answerIndex(pod)].click()
}

describe('kakooma cartridge', () => {
  it('reports taps and solved puzzles, holds until next(), and stops after the last puzzle', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(2)
    const handle = kakooma.mount(root, host)
    expect(pods(root)).toHaveLength(host.rules.podCount)

    const first = pods(root)[0]
    const wrongIdx = [0, 1, 2, 3].find((i) => i !== answerIndex(first))!
    cells(first)[wrongIdx].click()
    expect(events.at(-1)).toMatchObject({ type: 'tap', correct: false })
    expect(cells(first)[wrongIdx].classList.contains('mg-wrong')).toBe(true)
    expect(handle.next()).toBe(false)

    const before = boardValues(root)
    solve(root)
    const solvedEvents = events.filter((e) => e.type === 'puzzle')
    expect(solvedEvents).toHaveLength(1)
    expect(solvedEvents[0]).toMatchObject({ type: 'puzzle', index: 0, of: 2, wrong: 1 })
    expect((solvedEvents[0] as { response: string }).response.split(' ')).toHaveLength(host.rules.podCount)
    expect(events.filter((e) => e.type === 'tap' && e.correct)).toHaveLength(host.rules.podCount)
    expect(cells(first)[answerIndex(first)].classList.contains('mg-found')).toBe(true)

    // Taps while holding are ignored; the board stays until the Console moves on.
    cells(first)[wrongIdx].click()
    expect(events.filter((e) => e.type === 'tap')).toHaveLength(host.rules.podCount + 1)
    expect(boardValues(root)).toEqual(before)

    expect(handle.next()).toBe(true)
    expect(boardValues(root)).not.toEqual(before)
    solve(root)
    expect(events.filter((e) => e.type === 'puzzle').at(-1)).toMatchObject({ index: 1, of: 2, wrong: 0 })
    expect(handle.next()).toBe(false)

    handle.destroy()
    expect(root.children).toHaveLength(0)
  })

  it('plays a one-puzzle round the way Math Wiz asks for it: one puzzle event, then next() is false', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1, 99)
    const handle = kakooma.mount(root, host)
    solve(root)
    expect(events.filter((e) => e.type === 'puzzle')).toEqual([
      expect.objectContaining({ type: 'puzzle', index: 0, of: 1, wrong: 0 }),
    ])
    expect(events.filter((e) => e.type === 'tap')).toHaveLength(host.rules.podCount)
    expect(handle.next()).toBe(false)
    expect(boardValues(root)).toHaveLength(host.rules.podCount)
    handle.destroy()
  })

  it('reports progress on every puzzle of an open-ended run', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(Infinity, 5)
    const handle = kakooma.mount(root, host)
    for (let i = 0; i < 3; i++) {
      solve(root)
      expect(events.filter((e) => e.type === 'puzzle').at(-1)).toMatchObject({ index: i, of: Infinity })
      expect(handle.next()).toBe(true)
    }
    handle.destroy()
  })

  it('draws the same round for the same seed and a different one for another', () => {
    const a = document.createElement('div')
    const b = document.createElement('div')
    const c = document.createElement('div')
    kakooma.mount(a, fakeConsole(1, 7).host)
    kakooma.mount(b, fakeConsole(1, 7).host)
    kakooma.mount(c, fakeConsole(1, 8).host)
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
      kakooma.mount(root, host)
      solve(root)
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { value: real, configurable: true })
    }
    expect(calls).toEqual([])
  })

  it('refuses rules its spec cannot play', () => {
    const root = document.createElement('div')
    const { host } = fakeConsole(1, 1, { ...presets[2].rules, min: 9, max: 1 })
    expect(() => kakooma.mount(root, host)).toThrow(/Smallest number/)
  })
})
