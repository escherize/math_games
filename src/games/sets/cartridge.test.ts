// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import type { CartridgeEvent, Console } from '../../engine/cartridge'
import { mulberry32 } from '../../engine/rng'
import { generatePuzzle, setsIn, type Triple } from './generator'
import { sets } from './index'
import { presets, type SetsRules } from './rules'

function fakeConsole(puzzles: number, seed = 42, rules: SetsRules = presets[0].rules) {
  const events: CartridgeEvent[] = []
  const host: Console<SetsRules> = { rules, seed, puzzles, report: (e) => events.push(e) }
  return { host, events }
}

const cells = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLButtonElement>('button.mg-cell'))
const live = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLButtonElement>('button.mg-cell:not(.mg-found)'))
const values = (root: HTMLElement) => cells(root).map((b) => Number(b.dataset.value))
const liveSets = (root: HTMLElement) => setsIn(live(root).map((b) => Number(b.dataset.value)))
const tileFor = (root: HTMLElement, value: number) => live(root).find((b) => Number(b.dataset.value) === value)!
const clickSet = (root: HTMLElement, set: Triple) => set.forEach((v) => tileFor(root, v).click())

/** A triple of live tiles that is not a set. */
function nonSet(root: HTMLElement): HTMLButtonElement[] {
  const tiles = live(root)
  for (let i = 0; i < tiles.length; i++)
    for (let j = i + 1; j < tiles.length; j++)
      for (let k = j + 1; k < tiles.length; k++) {
        const trio = [tiles[i], tiles[j], tiles[k]]
        if (setsIn(trio.map((b) => Number(b.dataset.value))).length === 0) return trio
      }
  throw new Error('every triple is a set')
}

/** Two sets of the grid that share no tile. */
function disjointPair(found: Triple[]): [Triple, Triple] {
  for (const a of found) for (const b of found) if (!a.some((v) => b.includes(v))) return [a, b]
  throw new Error('no two disjoint sets')
}

/** Find sets from the live tiles until the board is done. */
function solve(root: HTMLElement) {
  for (let guard = 0; guard < 4; guard++) {
    const found = liveSets(root)
    if (found.length === 0) return
    clickSet(root, found[0])
    if (root.querySelector('.mg-board')!.classList.contains('mg-done')) return
  }
}

describe('sets cartridge', () => {
  it('reports taps and solved puzzles, holds until next(), and stops after the last puzzle', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(2)
    const handle = sets.mount(root, host)
    expect(cells(root)).toHaveLength(9)
    expect(root.querySelectorAll('.mg-pip')).toHaveLength(1)

    // A wrong triple shakes, counts once, and clears the picks.
    const trio = nonSet(root)
    trio[0].click()
    trio[1].click()
    expect(events).toHaveLength(0)
    expect(trio[0].classList.contains('mg-picked')).toBe(true)
    trio[2].click()
    const [a, b] = trio
      .map((t) => Number(t.dataset.value))
      .sort((x, y) => x - y)
    expect(events).toEqual([expect.objectContaining({ type: 'tap', correct: false, fact: `${a}+${b}` })])
    for (const t of trio) {
      expect(t.classList.contains('mg-wrong')).toBe(true)
      expect(t.classList.contains('mg-picked')).toBe(false)
    }
    expect(handle.next()).toBe(false)

    const before = values(root)
    const [set] = liveSets(root)
    clickSet(root, set)
    expect(events.at(-2)).toMatchObject({ type: 'tap', correct: true, fact: `${set[0]}+${set[1]}` })
    expect(events.at(-1)).toMatchObject({ type: 'puzzle', index: 0, of: 2, wrong: 1, response: `${set[0]}+${set[1]}=${set[2]}` })
    expect((events.at(-1) as { key: string }).key).toBe(before.slice().sort((x, y) => x - y).join(','))
    for (const v of set) expect(cells(root).find((c) => Number(c.dataset.value) === v)!.classList.contains('mg-found')).toBe(true)
    expect(root.querySelector('.mg-board')!.classList.contains('mg-done')).toBe(true)
    expect(root.querySelector('.mg-pip')!.classList.contains('mg-lit')).toBe(true)

    // Taps while holding are ignored; the board stays until the Console moves on.
    const count = events.length
    nonSet(root).forEach((t) => t.click())
    expect(events).toHaveLength(count)
    expect(values(root)).toEqual(before)

    expect(handle.next()).toBe(true)
    expect(values(root)).not.toEqual(before)
    solve(root)
    expect(events.filter((e) => e.type === 'puzzle').at(-1)).toMatchObject({ index: 1, of: 2, wrong: 0 })
    expect(handle.next()).toBe(false)

    handle.destroy()
    expect(root.children).toHaveLength(0)
  })

  it('unpicking a tile reports nothing and frees the pick', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1)
    sets.mount(root, host)
    const [first, second] = live(root)
    first.click()
    first.click()
    expect(first.classList.contains('mg-picked')).toBe(false)
    second.click()
    second.click()
    first.click()
    second.click()
    expect(events).toEqual([])
    expect(live(root).filter((b) => b.classList.contains('mg-picked'))).toHaveLength(2)
  })

  it('needs two sets when setsRequired is 2 and found tiles are out of play', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1, 3, presets[1].rules)
    sets.mount(root, host)
    expect(root.querySelectorAll('.mg-pip')).toHaveLength(2)
    const [first, second] = disjointPair(liveSets(root))
    clickSet(root, first)
    expect(events.filter((e) => e.type === 'puzzle')).toHaveLength(0)
    expect(live(root)).toHaveLength(6)
    expect(root.querySelectorAll('.mg-pip.mg-lit')).toHaveLength(1)
    // A found tile does not take a pick.
    tileFor(root, second[0]).click()
    cells(root).find((c) => Number(c.dataset.value) === first[0])!.click()
    expect(live(root).filter((b) => b.classList.contains('mg-picked'))).toHaveLength(1)
    tileFor(root, second[1]).click()
    tileFor(root, second[2]).click()
    const done = events.filter((e) => e.type === 'puzzle')
    expect(done).toHaveLength(1)
    expect(done[0]).toMatchObject({ wrong: 0, response: `${first[0]}+${first[1]}=${first[2]};${second[0]}+${second[1]}=${second[2]}` })
    expect(root.querySelectorAll('.mg-pip.mg-lit')).toHaveLength(2)
    expect(root.querySelector('.mg-board')!.classList.contains('mg-done')).toBe(true)
  })

  it('solves early when the found set leaves no set among the live tiles', () => {
    // A grid where one set strands the rest: 1,2,3 beside 5..10, which is sum-free.
    const rules = presets[1].rules
    let seed = 0
    let strander: Triple | null = null
    for (let s = 1; s <= 400 && !strander; s++) {
      const puzzle = generatePuzzle(mulberry32(s), rules)
      const dead = puzzle.sets.find((t) => setsIn(puzzle.cells.filter((v) => !t.includes(v))).length === 0)
      if (dead) {
        seed = s
        strander = dead
      }
    }
    expect(strander).not.toBeNull()
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1, seed, rules)
    const handle = sets.mount(root, host)
    expect(liveSets(root).length).toBeGreaterThan(1)
    clickSet(root, strander!)
    expect(liveSets(root)).toEqual([])
    expect(events.filter((e) => e.type === 'puzzle')).toEqual([
      expect.objectContaining({ index: 0, of: 1, wrong: 0, response: `${strander![0]}+${strander![1]}=${strander![2]}` }),
    ])
    expect(root.querySelector('.mg-board')!.classList.contains('mg-done')).toBe(true)
    expect(root.querySelectorAll('.mg-pip.mg-lit')).toHaveLength(1)
    expect(root.querySelectorAll('.mg-pip')).toHaveLength(2)
    expect(handle.next()).toBe(false)
  })

  it('accepts any set in the grid, not a planted one', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1, 11, presets[0].rules)
    sets.mount(root, host)
    const found = liveSets(root)
    expect(found.length).toBeGreaterThan(1)
    clickSet(root, found[found.length - 1])
    expect(events.filter((e) => e.type === 'puzzle')).toHaveLength(1)
  })

  it('plays a one-puzzle round the way Math Wiz asks for it: one puzzle event, then next() is false', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(1, 99)
    const handle = sets.mount(root, host)
    solve(root)
    expect(events.filter((e) => e.type === 'puzzle')).toEqual([expect.objectContaining({ type: 'puzzle', index: 0, of: 1, wrong: 0 })])
    expect(events.filter((e) => e.type === 'tap')).toHaveLength(1)
    expect(handle.next()).toBe(false)
    handle.destroy()
  })

  it('reports progress on every puzzle of an open-ended run', () => {
    const root = document.createElement('div')
    const { host, events } = fakeConsole(Infinity, 5)
    const handle = sets.mount(root, host)
    for (let i = 0; i < 3; i++) {
      solve(root)
      expect(events.filter((e) => e.type === 'puzzle').at(-1)).toMatchObject({ index: i, of: Infinity })
      expect(handle.next()).toBe(true)
    }
    handle.destroy()
  })

  it('draws the same round for the same seed and a different one for another, and skips avoided keys', () => {
    const a = document.createElement('div')
    const b = document.createElement('div')
    const c = document.createElement('div')
    sets.mount(a, fakeConsole(1, 7).host)
    sets.mount(b, fakeConsole(1, 7).host)
    sets.mount(c, fakeConsole(1, 8).host)
    expect(values(a)).toEqual(values(b))
    expect(values(a)).not.toEqual(values(c))

    const key = values(a).slice().sort((x, y) => x - y).join(',')
    const d = document.createElement('div')
    sets.mount(d, { ...fakeConsole(1, 7).host, avoid: [key] })
    expect(values(d).slice().sort((x, y) => x - y).join(',')).not.toBe(key)
  })

  it('never reads or writes browser storage', () => {
    const root = document.createElement('div')
    const calls: string[] = []
    const real = globalThis.localStorage
    const spy = new Proxy(real, { get: (t, k) => (calls.push(String(k)), Reflect.get(t, k)) })
    Object.defineProperty(globalThis, 'localStorage', { value: spy, configurable: true })
    try {
      const { host } = fakeConsole(1)
      sets.mount(root, host)
      solve(root)
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { value: real, configurable: true })
    }
    expect(calls).toEqual([])
  })

  it('refuses rules its spec cannot play', () => {
    const bad = (over: Partial<SetsRules>) => () => sets.mount(document.createElement('div'), fakeConsole(1, 1, { ...presets[0].rules, ...over }).host)
    expect(bad({ max: 8 })).toThrow(/Largest number/)
    expect(bad({ max: 21 })).toThrow(/Largest number/)
    expect(bad({ setsRequired: 0 })).toThrow(/Sets to find/)
    expect(bad({ setsRequired: 4 })).toThrow(/Sets to find/)
    expect(bad({ max: 9, setsRequired: 3 })).toThrow(/cannot hold 3 sets/)
    expect(bad({ op: 'subtract' })).toThrow(/addition/)
    expect(bad({ min: 2 })).toThrow(/every number/)
    const repaired = { ...presets[0].rules, max: 12, maxResult: 10 }
    expect(sets.rules.validate(repaired)).toBeNull()
    expect(repaired.maxResult).toBe(12)
  })

  it('tells the player what to do in one sentence per rule set', () => {
    expect(sets.prompt(presets[0].rules)).toBe('Tap three numbers where two of them make the third.')
    expect(sets.prompt(presets[1].rules)).toBe('Find 2 groups of three where two numbers make the third.')
  })
})
