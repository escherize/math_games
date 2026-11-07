// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { draggable, gesture, hit, inside, overlaps, pathLength, pick, TAP_SLOP_PX, type Point } from './drag'

function pointer(el: Element, type: string, x: number, y: number, pointerId = 1, extra: PointerEventInit = {}) {
  const e = new PointerEvent(type, { clientX: x, clientY: y, pointerId, bubbles: true, cancelable: true, pointerType: 'touch', ...extra })
  el.dispatchEvent(e)
  return e
}

describe('gesture', () => {
  it('tracks the first pointer only, reports moves, and ends with moved=true past the slop', () => {
    const surface = document.createElement('div')
    const log: string[] = []
    const detach = gesture(surface, {
      start: (p) => void log.push(`start ${p.x},${p.y}`),
      move: (p, d) => void log.push(`move ${p.x},${p.y} d${d.x},${d.y}`),
      end: (p, cancelled, moved) => void log.push(`end ${p.x},${p.y} ${cancelled} ${moved}`),
    })
    pointer(surface, 'pointerdown', 10, 10)
    pointer(surface, 'pointerdown', 50, 50, 2) // a second finger: ignored
    pointer(surface, 'pointermove', 15, 10)
    pointer(surface, 'pointermove', 60, 60, 2) // ignored
    pointer(surface, 'pointermove', 40, 10)
    pointer(surface, 'pointerup', 40, 12)
    expect(log).toEqual(['start 10,10', 'move 15,10 d5,0', 'move 40,10 d25,0', 'end 40,12 false true'])
    detach()
    pointer(surface, 'pointerdown', 1, 1)
    expect(log).toHaveLength(4)
  })

  it('a short contact is a tap: moved=false and its click gets through', () => {
    const surface = document.createElement('div')
    const button = document.createElement('button')
    surface.append(button)
    let clicks = 0
    button.addEventListener('click', () => clicks++)
    const ends: boolean[] = []
    gesture(surface, { end: (_p, _c, moved) => void ends.push(moved) })
    pointer(button, 'pointerdown', 10, 10)
    pointer(button, 'pointermove', 10 + TAP_SLOP_PX - 1, 10)
    pointer(button, 'pointerup', 10 + TAP_SLOP_PX - 1, 10)
    button.click()
    expect(ends).toEqual([false])
    expect(clicks).toBe(1)
  })

  it('refuses the touchmove default while a gesture is live, so iOS does not scroll the page', () => {
    const surface = document.createElement('div')
    gesture(surface, {})
    const idle = new Event('touchmove', { bubbles: true, cancelable: true })
    surface.dispatchEvent(idle)
    expect(idle.defaultPrevented).toBe(false)
    pointer(surface, 'pointerdown', 10, 10)
    const live = new Event('touchmove', { bubbles: true, cancelable: true })
    surface.dispatchEvent(live)
    expect(live.defaultPrevented).toBe(true)
    pointer(surface, 'pointerup', 50, 10)
  })

  it('swallows the click that trails a drag, once', () => {
    const surface = document.createElement('div')
    const button = document.createElement('button')
    surface.append(button)
    let clicks = 0
    button.addEventListener('click', () => clicks++)
    gesture(surface, {})
    pointer(button, 'pointerdown', 0, 0)
    pointer(button, 'pointermove', 100, 0)
    pointer(button, 'pointerup', 100, 0)
    button.click()
    expect(clicks).toBe(0)
    button.click()
    expect(clicks).toBe(1)
  })

  it('start may refuse a contact, and pointercancel ends with cancelled=true', () => {
    const surface = document.createElement('div')
    const log: string[] = []
    gesture(surface, {
      start: (p) => p.x > 0,
      end: (_p, cancelled) => void log.push(cancelled ? 'cancelled' : 'lifted'),
    })
    pointer(surface, 'pointerdown', 0, 0)
    pointer(surface, 'pointerup', 0, 0)
    expect(log).toEqual([])
    pointer(surface, 'pointerdown', 5, 5)
    pointer(surface, 'pointercancel', 5, 5)
    expect(log).toEqual(['cancelled'])
  })
})

describe('draggable', () => {
  it('carries the element with a transform, then clears it; a refused drop snaps back', () => {
    const el = document.createElement('div')
    document.body.append(el)
    const drops: Point[] = []
    let accept = false
    draggable(el, { drop: (p) => (drops.push(p), accept) })
    pointer(el, 'pointerdown', 10, 10)
    pointer(el, 'pointermove', 30, 25)
    expect(el.classList.contains('mg-dragging')).toBe(true)
    expect(el.style.transform).toBe('translate(20px, 15px)')
    pointer(el, 'pointerup', 30, 25)
    expect(el.classList.contains('mg-dragging')).toBe(false)
    expect(el.style.transform).toBe('')
    expect(el.classList.contains('mg-returning')).toBe(true)
    expect(drops).toEqual([{ x: 30, y: 25 }])

    accept = true
    el.classList.remove('mg-returning')
    pointer(el, 'pointerdown', 0, 0)
    pointer(el, 'pointermove', 50, 0)
    pointer(el, 'pointerup', 50, 0)
    expect(el.classList.contains('mg-returning')).toBe(false)
  })

  it('a refused start leaves the element alone', () => {
    const el = document.createElement('div')
    const drops: Point[] = []
    draggable(el, { start: () => false, drop: (p) => (drops.push(p), true) })
    pointer(el, 'pointerdown', 0, 0)
    pointer(el, 'pointermove', 50, 0)
    pointer(el, 'pointerup', 50, 0)
    expect(el.classList.contains('mg-dragging')).toBe(false)
    expect(el.style.transform).toBe('')
    expect(drops).toEqual([])
  })
})

describe('geometry', () => {
  const box = (left: number, top: number, w: number, h: number) =>
    ({ getBoundingClientRect: () => ({ left, top, right: left + w, bottom: top + h, width: w, height: h }) }) as unknown as Element

  it('hit and pick use client boxes', () => {
    const a = box(0, 0, 10, 10)
    const b = box(20, 0, 10, 10)
    expect(hit({ x: 5, y: 5 }, a)).toBe(true)
    expect(hit({ x: 15, y: 5 }, a)).toBe(false)
    expect(pick({ x: 25, y: 5 }, [a, b])).toBe(b)
    expect(pick({ x: 15, y: 5 }, [a, b])).toBeNull()
  })

  it('overlaps is true when two boxes touch, false when they only share an edge', () => {
    const a = box(0, 0, 10, 10)
    expect(overlaps(a, box(5, 5, 10, 10))).toBe(true)
    expect(overlaps(a, box(10, 0, 10, 10))).toBe(false)
    expect(overlaps(a, box(20, 20, 10, 10))).toBe(false)
  })

  it('inside is a point-in-polygon test and pathLength sums the segments', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]
    expect(inside({ x: 5, y: 5 }, square)).toBe(true)
    expect(inside({ x: 15, y: 5 }, square)).toBe(false)
    expect(pathLength(square)).toBe(30)
  })
})
