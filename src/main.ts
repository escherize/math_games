import './style.css'
import { starString, unlockedCount } from './engine/levels'
import { findGame, games } from './engine/registry'
import { describeRules, loadRules } from './engine/rules'
import { StatsStore } from './engine/stats'
import type { GameDefinition, GameInstance } from './engine/types'
import { el, renderSettings } from './ui/settings'

const app = document.getElementById('app')!
const stats = new StatsStore()
let current: GameInstance | null = null

function go(hash: string) {
  location.hash = hash
}

function route() {
  current?.destroy()
  current = null
  const [, section, id, levelId] = location.hash.split('/')
  const game = id ? findGame(id) : undefined
  const level = game && levelId ? game.levels.find((l) => l.id === levelId) : undefined
  if (section === 'play' && game && (level || !levelId)) {
    app.innerHTML = ''
    current = game.mount(app, { stats, level, exit: () => go('#/'), openLevel: (lid) => go(`#/play/${game.id}/${lid}`) })
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
  for (const g of games) {
    const card = el('div', 'card')
    card.append(el('h2', '', g.title), el('p', '', g.tagline))
    card.append(el('div', 'rules', `Current rules: ${describeRules(loadRules(g.id, g.rules))}`))
    card.append(el('h3', 'levels-title', 'Levels'), renderLevels(g))
    const actions = el('div', 'actions')
    const play = el('button', 'btn', 'Play') as HTMLButtonElement
    play.onclick = () => go(`#/play/${g.id}`)
    const settings = el('button', 'btn secondary small', 'Parent settings') as HTMLButtonElement
    settings.onclick = () => go(`#/settings/${g.id}`)
    actions.append(play, settings)
    card.append(actions)
    grid.append(card)
  }
  app.append(grid)
  app.append(renderStats())
}

/** The ladder as chips: stars earned, the next open level highlighted, the rest locked. */
function renderLevels(g: GameDefinition): HTMLElement {
  const wrap = el('div', 'levels')
  const open = unlockedCount(
    g.levels.map((l) => l.id),
    (id) => stats.levelStars(id),
  )
  g.levels.forEach((l, i) => {
    const stars = stats.levelStars(l.id)
    const locked = i >= open
    const b = el('button', 'level') as HTMLButtonElement
    b.type = 'button'
    if (locked) b.classList.add('locked')
    if (!locked && stars === 0) b.classList.add('next')
    b.disabled = locked
    b.setAttribute('aria-label', locked ? `${l.name} (locked)` : `${l.name}, ${stars} of 3 stars`)
    b.append(el('span', 'name', l.name), el('span', 'stars', locked ? '🔒' : starString(stars)))
    b.onclick = () => go(`#/play/${g.id}/${l.id}`)
    wrap.append(b)
  })
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
