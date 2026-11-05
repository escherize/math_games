import { describe, expect, it } from 'vitest'
import { games, kakooma, presets, version } from './lib'

describe('library entry', () => {
  it('exports every cartridge and its presets as plain data', () => {
    const out = presets()
    expect(out.map((g) => g.id)).toEqual(games.map((g) => g.id))
    const k = out.find((g) => g.id === 'kakooma')!
    expect(k.presets.map((p) => p.id)).toEqual(kakooma.rules.presets.map((p) => p.id))
    for (const p of k.presets) {
      expect(p.rules).toMatchObject({ op: expect.any(String), min: expect.any(Number), max: expect.any(Number) })
      expect(JSON.parse(JSON.stringify(p.rules))).toEqual(p.rules)
    }
  })

  it('carries a version string', () => {
    expect(typeof version).toBe('string')
    expect(version.length).toBeGreaterThan(0)
  })

  it('can be imported without a DOM', () => {
    expect(typeof document).toBe('undefined')
    expect(typeof kakooma.mount).toBe('function')
  })
})
