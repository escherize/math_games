import './style.css'
import { unlockedCount } from './engine/levels'
import { findGame, games } from './engine/registry'
import { describeRules, loadRules } from './engine/rules'
import { StatsStore } from './engine/stats'
import type { Cartridge } from './engine/cartridge'
import { mountPlay, type PlayInstance } from './ui/play'
import { dressOf, LOCK_SVG, STAR_SVG } from './ui/emblems'
import { el, renderSettings } from './ui/settings'

const app = document.getElementById('app')!
const stats = new StatsStore()
let current: PlayInstance | null = null

function go(hash: string) {
  location.hash = hash
}

function route() {
  current?.destroy()
  current = null
  const [, section, id, levelId] = location.hash.split('/')
  const game = id ? findGame(id) : undefined
  const level = game && levelId ? game.rules.presets.find((l) => l.id === levelId) : undefined
  if (section === 'play' && game && (level || !levelId)) {
    app.innerHTML = ''
    current = mountPlay(app, game, { stats, level, exit: () => go('#/'), openLevel: (lid) => go(`#/play/${game.id}/${lid}`) })
  } else if (section === 'settings' && game) {
    renderSettings(app, game.id, game.title, game.rules, () => go('#/'))
  } else {
    renderHub()
  }
}

function renderHub() {
  app.innerHTML = ''
  const top = el('div', 'topbar')
  top.append(el('h1', '', 'Math Games'))
  app.append(top)

  const grid = el('div', 'hub-grid')
  for (const g of games) grid.append(renderCartridge(g))
  app.append(grid)
  app.append(renderStats())
}

/**
 * One game as a cartridge: its hue and emblem on the label, the level track
 * underneath, and the two things a finger can do. Every card has the same
 * bones whatever its ladder length, so the grid rows stay level.
 */
function renderCartridge(g: Cartridge): HTMLElement {
  const dress = dressOf(g.id)
  const card = el('article', 'card')
  card.style.setProperty('--hue', String(dress.hue))

  const label = el('header', 'label')
  const emblem = el('div', 'emblem')
  emblem.innerHTML = dress.emblem
  const words = el('div', 'words')
  words.append(el('h2', '', g.title), el('p', 'tagline', g.tagline))
  label.append(emblem, words)

  const actions = el('div', 'actions')
  const play = el('button', 'btn play', 'Play') as HTMLButtonElement
  play.onclick = () => go(`#/play/${g.id}`)
  const settings = el('button', 'btn secondary small', 'Parent settings') as HTMLButtonElement
  settings.setAttribute('aria-label', `${g.title} parent settings`)
  settings.onclick = () => go(`#/settings/${g.id}`)
  actions.append(play, settings)

  card.append(label, renderLevels(g), actions)
  card.append(el('div', 'rules', describeRules(loadRules(g.id, g.rules))))
  return card
}

/**
 * The ladder as a track of steps: earned ones filled with their stars, the
 * next one open and named, the rest locked. One line for a short ladder,
 * two for Kakooma's twelve; the name of the step in play sits beneath.
 */
function renderLevels(g: Cartridge): HTMLElement {
  const levels = g.rules.presets
  const wrap = el('nav', 'ladder')
  wrap.setAttribute('aria-label', `${g.title} levels`)
  const open = unlockedCount(
    levels.map((l) => l.id),
    (id) => stats.levelStars(id),
  )
  const track = el('ol', 'track')
  let current: { name: string; index: number; stars: number } | null = null
  levels.forEach((l, i) => {
    const stars = stats.levelStars(l.id)
    const locked = i >= open
    const li = el('li')
    const b = el('button', 'step') as HTMLButtonElement
    b.type = 'button'
    if (locked) b.classList.add('locked')
    else if (stars === 0) b.classList.add('next')
    else b.classList.add('done')
    b.disabled = locked
    b.title = l.name
    b.setAttribute('aria-label', locked ? `${l.name}, locked` : `${l.name}, ${stars} of 3 stars`)
    if (locked) b.innerHTML = LOCK_SVG
    else if (stars === 0) b.textContent = String(i + 1)
    else b.innerHTML = STAR_SVG.repeat(stars)
    b.onclick = () => go(`#/play/${g.id}/${l.id}`)
    li.append(b)
    track.append(li)
    if (!locked && stars === 0 && !current) current = { name: l.name, index: i + 1, stars }
  })
  // Every level starred: the last one is the one to replay.
  if (!current) {
    const last = levels[open - 1] ?? levels[0]
    current = { name: last.name, index: Math.max(open, 1), stars: stats.levelStars(last.id) }
  }
  const now = el('div', 'now')
  now.append(el('span', 'where', `Level ${current.index} of ${levels.length}`), el('span', 'name', current.name))
  wrap.append(track, now)
  return wrap
}

function renderStats(): HTMLElement {
  const s = stats.summary()
  const wrap = el('section', 'stats')
  wrap.append(el('h2', '', 'Progress'))
  const row = el('div', 'stat-row')
  const tiles: Array<[string, string]> = [
    [String(s.plays), 'games played'],
    [String(s.puzzles), 'puzzles solved'],
    [s.accuracy === null ? '–' : `${Math.round(s.accuracy * 100)}%`, 'accuracy'],
    [`⚡ ${s.fast}`, 'fast & flawless'],
    [`★ ${stats.totalStars()}`, 'stars'],
    [String(s.bestRun), 'best challenge run'],
    [String(s.streakDays), 'day streak'],
  ]
  for (const [n, l] of tiles) {
    const t = el('div', 'stat')
    t.append(el('div', 'n', n), el('div', 'l', l))
    row.append(t)
  }
  wrap.append(row)
  const weak = stats.weakestFacts(5)
  if (weak.length) {
    const p = el('p', 'weak', 'Bonds to practice: ')
    weak.forEach((w, i) => {
      p.append(el('code', '', `${w.fact} (${Math.round(w.accuracy * 100)}%)`))
      if (i < weak.length - 1) p.append(document.createTextNode(' '))
    })
    wrap.append(p)
  } else if (s.plays === 0) {
    wrap.append(el('p', 'weak', 'Play a game and your history shows up here.'))
  }
  return wrap
}

window.addEventListener('hashchange', route)
route()
