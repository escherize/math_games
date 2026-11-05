/**
 * Cartridge hygiene (MG-4). A board is mounted inside another Console's page
 * (Math Wiz) in the DOM, not an iframe, so it must stay inside its box:
 * no document- or window-level listeners, no storage, no sound, no text
 * messages, click handlers only (the host synthesises clicks for fat taps,
 * so pointerdown/up handlers would double-fire), and CSS under .mg- only.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = join(__dirname)

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

const sources = walk(ROOT).filter((p) => p.endsWith('.ts') && !p.endsWith('.test.ts'))
const styles = walk(ROOT).filter((p) => p.endsWith('.css'))

const FORBIDDEN: Array<[RegExp, string]> = [
  [/\b(document|window)\s*\.\s*addEventListener/, 'document/window listeners'],
  [/\b(localStorage|sessionStorage|indexedDB)\b/, 'browser storage'],
  [/addEventListener\(\s*['"]pointer(down|up|move)['"]/, 'pointer handlers (use click; the host synthesises fat-tap clicks)'],
  [/\.on(pointerdown|pointerup|mousedown|mouseup|touchstart|touchend)\s*=/, 'pointer handlers (use click)'],
  [/canvas-confetti|new Audio\(|AudioContext|speechSynthesis/, 'sound or celebration (the Console owns feedback)'],
  [/\.(innerText|textContent)\s*=\s*['"`][^'"`]*[A-Za-z]{2,}/, 'text messages (the Console owns words)'],
]

describe('cartridge hygiene', () => {
  it('finds the cartridge sources', () => {
    expect(sources.length).toBeGreaterThan(0)
    expect(styles.length).toBeGreaterThan(0)
  })

  for (const file of sources) {
    it(`${file.slice(ROOT.length + 1)} stays inside its box`, () => {
      const src = readFileSync(file, 'utf8')
      for (const [re, why] of FORBIDDEN) {
        const m = src.match(re)
        expect(m ? `${why}: ${m[0]}` : null).toBeNull()
      }
    })
  }

  for (const file of styles) {
    it(`${file.slice(ROOT.length + 1)} only styles .mg- classes`, () => {
      const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      // Every top-level selector list and every keyframes name carries the prefix.
      const selectors = css.match(/(^|\})\s*([^{}@]+)\{/g) ?? []
      for (const s of selectors) {
        const sel = s.replace(/^\}?\s*/, '').replace(/\{$/, '').trim()
        if (/^\d+%|^from$|^to$/.test(sel)) continue
        expect(sel.startsWith('.mg-') ? null : sel).toBeNull()
      }
      for (const kf of css.match(/@keyframes\s+([\w-]+)/g) ?? []) expect(kf).toMatch(/@keyframes mg-/)
    })
  }
})
