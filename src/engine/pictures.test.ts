import { describe, expect, it } from 'vitest'
import { dieSvg, dotsSvg, kindsFor, pictureSvg, tallySvg, tenFrameSvg } from './pictures'

const count = (svg: string, cls: string) => (svg.match(new RegExp(`class="${cls}"`, 'g')) ?? []).length

describe('pictures of a quantity', () => {
  it('draws n pips on a die, 1 to 6 only', () => {
    for (let n = 1; n <= 6; n++) expect(count(dieSvg(n), 'mg-pip')).toBe(n)
    expect(() => dieSvg(7)).toThrow(RangeError)
    expect(() => dieSvg(0)).toThrow(RangeError)
  })

  it('fills n cells of a ten-frame and adds a second frame past ten', () => {
    for (let n = 0; n <= 20; n++) {
      const svg = tenFrameSvg(n)
      expect(count(svg, 'mg-dot')).toBe(n)
      expect((svg.match(/<rect/g) ?? []).length).toBe(n > 10 ? 20 : 10)
    }
  })

  it('draws n dots in a fixed layout', () => {
    for (let n = 0; n <= 20; n++) expect(count(dotsSvg(n), 'mg-dot')).toBe(n)
    expect(dotsSvg(7)).toBe(dotsSvg(7))
  })

  it('draws n tally strokes in groups of five', () => {
    for (let n = 0; n <= 20; n++) expect(count(tallySvg(n), 'mg-tally')).toBe(n)
  })

  it('knows which pictures can show a number', () => {
    expect(kindsFor(4)).toEqual(['die', 'tenframe', 'dots', 'tally'])
    expect(kindsFor(9)).toEqual(['tenframe', 'dots', 'tally'])
    expect(kindsFor(0)).toEqual(['tenframe', 'dots', 'tally'])
    expect(pictureSvg('die', 3)).toBe(dieSvg(3))
  })
})
