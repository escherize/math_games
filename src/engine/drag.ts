/**
 * One-finger gestures for a Cartridge board: a drag or a drawn stroke.
 *
 * Everything is attached to the surface element the Cartridge owns, never to
 * document or window, so a board stays inside its box when another Console
 * (Math Wiz) mounts it in the page. Math Wiz also runs a document-level
 * fat-tap listener that turns pointerup on a <button> into a click; drag
 * targets are not buttons, so the two never meet, and a click that trails a
 * real drag is swallowed here so a drag ending on a button cannot tap it.
 *
 * Fingers, mouse and pen all arrive as Pointer Events. The surface captures
 * the pointer, so a finger that leaves the box mid-drag keeps reporting.
 * Extra contacts (a palm, a second finger) are ignored: the first pointer
 * owns the gesture until it lifts. Give the surface `touch-action: none` in
 * CSS so the browser never claims the touch as a scroll.
 */

export interface Point {
  x: number
  y: number
}

export interface GestureHandlers {
  /** A pointer went down at `p` on `target`. Return false to let this contact go. */
  start?(p: Point, target: EventTarget | null): boolean | void
  /** The pointer moved to `p`; `delta` is the change since the previous report. */
  move?(p: Point, delta: Point): void
  /** The pointer lifted at `p`, or the system cancelled the gesture. `moved` is true past the tap threshold. */
  end?(p: Point, cancelled: boolean, moved: boolean): void
}

/** A contact that travels less than this is a tap, not a drag; its click gets through. */
export const TAP_SLOP_PX = 12

const point = (e: PointerEvent): Point => ({ x: e.clientX, y: e.clientY })

/**
 * Track one pointer on `surface` (an HTML element or an inline SVG). Returns a function that detaches every
 * listener (call it from the Cartridge's destroy()).
 */
export function gesture(surface: HTMLElement | SVGElement, h: GestureHandlers): () => void {
  let id: number | null = null
  let origin: Point | null = null
  let last: Point | null = null
  let moved = false
  let swallowClick = false

  const onDown = (e: PointerEvent) => {
    if (id !== null) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const p = point(e)
    if (h.start && h.start(p, e.target) === false) return
    id = e.pointerId
    origin = p
    last = p
    moved = false
    swallowClick = false
    try {
      surface.setPointerCapture(e.pointerId)
    } catch {
      /* happy-dom and old engines: moves still arrive while the pointer stays inside */
    }
  }

  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== id || !last || !origin) return
    const p = point(e)
    if (!moved && Math.hypot(p.x - origin.x, p.y - origin.y) >= TAP_SLOP_PX) moved = true
    const delta = { x: p.x - last.x, y: p.y - last.y }
    last = p
    h.move?.(p, delta)
  }

  const onEnd = (e: PointerEvent) => {
    if (e.pointerId !== id) return
    const cancelled = e.type === 'pointercancel'
    const p = cancelled && last ? last : point(e)
    id = null
    origin = null
    last = null
    swallowClick = moved
    try {
      surface.releasePointerCapture(e.pointerId)
    } catch {
      /* not captured */
    }
    h.end?.(p, cancelled, moved)
  }

  // The browser's click for a gesture that dragged: not a tap on whatever
  // happens to be under the finger at the end.
  const onClick = (e: MouseEvent) => {
    if (!swallowClick) return
    swallowClick = false
    e.stopPropagation()
    e.preventDefault()
  }

  // HTML and SVG elements share the pointer event map; the union hides it from the overloads.
  const target = surface as HTMLElement
  target.addEventListener('pointerdown', onDown)
  target.addEventListener('pointermove', onMove)
  target.addEventListener('pointerup', onEnd)
  target.addEventListener('pointercancel', onEnd)
  target.addEventListener('click', onClick, { capture: true })
  return () => {
    target.removeEventListener('pointerdown', onDown)
    target.removeEventListener('pointermove', onMove)
    target.removeEventListener('pointerup', onEnd)
    target.removeEventListener('pointercancel', onEnd)
    target.removeEventListener('click', onClick, { capture: true })
  }
}

export interface DragHandlers {
  /** The element was picked up. Return false to refuse (it stays put). */
  start?(): boolean | void
  /** The element is being carried; `p` is the pointer in client px. */
  over?(p: Point): void
  /** Dropped at `p`. Return true to keep it where the handler put it, false to send it back. */
  drop(p: Point): boolean
}

/**
 * Make `el` draggable by its own pointer events. While held it carries
 * `mg-dragging` and follows the pointer with a transform; on drop the
 * transform is cleared, so the handler decides where it lives by moving the
 * element in the DOM (accept) or doing nothing (it snaps back, with
 * `mg-returning` for one animation frame set of styles).
 */
export function draggable(el: HTMLElement, h: DragHandlers): () => void {
  let dx = 0
  let dy = 0
  return gesture(el, {
    start() {
      if (h.start && h.start() === false) return false
      dx = 0
      dy = 0
      el.classList.add('mg-dragging')
    },
    move(p, delta) {
      dx += delta.x
      dy += delta.y
      el.style.transform = `translate(${dx}px, ${dy}px)`
      h.over?.(p)
    },
    end(p, cancelled) {
      el.classList.remove('mg-dragging')
      const kept = !cancelled && h.drop(p)
      el.style.transform = ''
      if (!kept) {
        el.classList.add('mg-returning')
        el.addEventListener('animationend', () => el.classList.remove('mg-returning'), { once: true })
      }
    },
  })
}

/** Is the client point inside the element's box? */
export function hit(p: Point, el: Element): boolean {
  const r = el.getBoundingClientRect()
  return p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom
}

/** Do the two elements' boxes touch? A carried tile counts where it sits, not only where the finger is. */
export function overlaps(a: Element, b: Element): boolean {
  const r = a.getBoundingClientRect()
  const q = b.getBoundingClientRect()
  return r.left < q.right && r.right > q.left && r.top < q.bottom && r.bottom > q.top
}

/** The first element whose box contains the point, or null. */
export function pick<T extends Element>(p: Point, els: Iterable<T>): T | null {
  for (const el of els) if (hit(p, el)) return el
  return null
}

/** Centre of an element's box in client px. */
export function centre(el: Element): Point {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

/** Is `p` inside the polygon (even-odd rule)? A stroke drawn by a finger closes itself. */
export function inside(p: Point, poly: readonly Point[]): boolean {
  let within = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) within = !within
  }
  return within
}

/** Length of a polyline in px. */
export function pathLength(pts: readonly Point[]): number {
  let len = 0
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  return len
}
