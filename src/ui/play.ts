/**
 * The hub's Console: everything around a Cartridge's board. Loads the
 * parent's rules, picks Practice or Challenge, runs the timer, keeps the
 * session, says "Nice!", pops confetti, scores stars and records history.
 * The board itself only reports taps and solved puzzles.
 */
import confetti from 'canvas-confetti'
import type { Cartridge, CartridgeEvent, CartridgeHandle } from '../engine/cartridge'
import { starString, starsFor } from '../engine/levels'
import { describeRules, loadRules, type PacedRules, type Preset } from '../engine/rules'
import { isFast } from '../engine/scoring'
import type { StatsStore } from '../engine/stats'
import { el } from './el'

type Mode = 'practice' | 'challenge'

export interface PlayContext {
  stats: StatsStore
  /** Set when the hub opened a level rather than free play. */
  level?: Preset<PacedRules>
  /** Return to the hub. */
  exit(): void
  /** Open another level of the same game. */
  openLevel(levelId: string): void
}

export interface PlayInstance {
  destroy(): void
}

export function mountPlay<R extends PacedRules>(container: HTMLElement, cart: Cartridge<R>, ctx: PlayContext): PlayInstance {
  const saved = loadRules(cart.id, cart.rules)
  // A level supplies the numbers; the parent's saved rules supply the pacing.
  const level = ctx.level as Preset<R> | undefined
  const rules: R = level
    ? { ...level.rules, puzzlesPerRound: saved.puzzlesPerRound, fastSeconds: saved.fastSeconds, timerSeconds: saved.timerSeconds }
    : saved
  const presets = cart.rules.presets
  const nextLevel = level ? presets[presets.findIndex((p) => p.id === level.id) + 1] : undefined
  let mode: Mode = 'practice'
  let handle: CartridgeHandle | null = null
  let timeLeft = rules.timerSeconds
  let timer: number | undefined
  let pending: number | undefined
  const session = { startedAt: Date.now(), puzzlesSolved: 0, correct: 0, wrong: 0, fast: 0 }
  let sessionRecorded = false

  container.innerHTML = ''
  const root = el('div', 'game')
  const top = el('div', 'topbar')
  const back = el('button', 'back', '← Games') as HTMLButtonElement
  back.onclick = () => {
    endSession()
    ctx.exit()
  }
  top.append(back, el('h1', '', level ? `${cart.title} · ${level.name}` : cart.title))
  const hud = el('div', 'hud')
  const prompt = el('div', 'prompt', cart.prompt(rules))
  const slot = el('div', 'board-slot')
  const message = el('div', 'message')
  root.append(top, hud, prompt, slot, message)
  container.append(root)

  if (level) start('practice')
  else showStart()

  function showStart() {
    hud.innerHTML = ''
    slot.innerHTML = ''
    message.textContent = ''
    const o = el('div', 'overlay')
    o.append(el('h2', '', describeRules(rules)))
    o.append(
      el(
        'p',
        '',
        `Practice is a round of ${rules.puzzlesPerRound} puzzles with no timer. Challenge gives ${rules.timerSeconds}s per puzzle for as long as you can keep going.`,
      ),
    )
    const choices = el('div', 'choices')
    const practice = el('button', 'btn', 'Practice') as HTMLButtonElement
    practice.onclick = () => start('practice')
    const challenge = el('button', 'btn secondary', 'Challenge') as HTMLButtonElement
    challenge.onclick = () => start('challenge')
    choices.append(practice, challenge)
    o.append(choices)
    slot.append(o)
  }

  function start(m: Mode) {
    mode = m
    session.startedAt = Date.now()
    session.puzzlesSolved = session.correct = session.wrong = session.fast = 0
    sessionRecorded = false
    unmountBoard()
    message.textContent = ''
    message.className = 'message'
    handle = cart.mount(slot, {
      rules,
      seed: Math.floor(Math.random() * 2 ** 31),
      puzzles: mode === 'practice' ? rules.puzzlesPerRound : Infinity,
      report,
    })
    armTimer()
    renderHud()
  }

  function unmountBoard() {
    handle?.destroy()
    handle = null
    slot.innerHTML = ''
  }

  function report(e: CartridgeEvent) {
    if (e.type === 'tap') {
      ctx.stats.recordAttempt({ fact: e.fact, correct: e.correct, ms: e.ms })
      if (e.correct) session.correct++
      else {
        session.wrong++
        if (mode === 'challenge') {
          timeLeft = Math.max(1, timeLeft - 3)
          renderHud()
        }
      }
      return
    }
    stopTimer()
    session.puzzlesSolved++
    const fast = isFast({ ms: e.ms, wrong: e.wrong }, rules.fastSeconds)
    if (fast) session.fast++
    renderHud()
    if (mode === 'practice' && e.index + 1 >= e.of) {
      finish('Round complete!')
      return
    }
    message.textContent = fast ? '⚡ Fast!' : 'Nice!'
    message.className = fast ? 'message fast' : 'message good'
    burst(fast ? 1 : 0.5)
    pending = window.setTimeout(() => {
      pending = undefined
      message.textContent = ''
      message.className = 'message'
      handle?.next()
      armTimer()
      renderHud()
    }, 1100)
  }

  function armTimer() {
    stopTimer()
    timeLeft = rules.timerSeconds
    if (mode === 'challenge') timer = window.setInterval(tick, 1000)
  }

  function tick() {
    timeLeft -= 1
    renderHud()
    if (timeLeft <= 0) {
      stopTimer()
      finish("Time's up")
    }
  }

  function stopTimer() {
    if (timer !== undefined) {
      clearInterval(timer)
      timer = undefined
    }
  }

  function renderHud() {
    hud.innerHTML = ''
    if (mode === 'practice') {
      hud.append(span('Puzzle ', `${Math.min(session.puzzlesSolved + 1, rules.puzzlesPerRound)} of ${rules.puzzlesPerRound}`))
    } else {
      hud.append(span('Solved: ', String(session.puzzlesSolved)))
    }
    if (session.fast > 0) {
      const f = span('⚡ ', String(session.fast))
      f.classList.add('fast-count')
      f.title = 'Fast and flawless puzzles'
      hud.append(f)
    }
    if (mode === 'challenge') {
      const t = span('Time left: ', `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`)
      t.classList.add('timer')
      if (timeLeft <= 10) t.classList.add('low')
      hud.append(t)
    }
  }

  function finish(title: string) {
    endSession()
    unmountBoard()
    message.textContent = ''
    const secs = Math.round((Date.now() - session.startedAt) / 1000)
    const o = el('div', 'overlay')
    o.append(el('h2', '', title))
    o.append(el('p', '', `${session.puzzlesSolved} puzzles in ${secs}s. ${session.correct} right, ${session.wrong} wrong.`))
    if (session.puzzlesSolved > 0) {
      const fastLine = el('p', 'fast-line', `⚡ ${session.fast} of ${session.puzzlesSolved} fast and flawless`)
      if (session.fast === session.puzzlesSolved) fastLine.classList.add('all')
      o.append(fastLine)
    }
    const choices = el('div', 'choices')
    let stars = 0
    if (level && mode === 'practice') {
      const completed = session.puzzlesSolved >= rules.puzzlesPerRound
      stars = starsFor({ puzzles: session.puzzlesSolved, wrong: session.wrong, fast: session.fast, completed })
      const best = ctx.stats.levelStars(level.id)
      if (completed) ctx.stats.recordLevel(level.id, stars)
      const row = el('div', 'stars-row', starString(stars))
      row.setAttribute('aria-label', `${stars} of 3 stars`)
      o.append(row)
      if (stars > best) o.append(el('p', 'stars-note', best === 0 ? 'Level cleared!' : 'New best!'))
      else if (stars < 3 && stars > 0) o.append(el('p', 'stars-note', stars === 1 ? 'No wrong taps next time for two stars.' : 'Every puzzle fast for three stars.'))
    }
    const again = el('button', stars >= 1 && nextLevel ? 'btn secondary' : 'btn', mode === 'practice' ? 'Another round' : 'Try again?') as HTMLButtonElement
    again.onclick = () => start(mode)
    if (level && stars >= 1 && nextLevel) {
      const next = el('button', 'btn', `Next level: ${nextLevel.name}`) as HTMLButtonElement
      next.onclick = () => ctx.openLevel(nextLevel.id)
      choices.append(next)
    }
    const home = el('button', 'btn secondary', 'Games') as HTMLButtonElement
    home.onclick = ctx.exit
    choices.append(again, home)
    o.append(choices)
    slot.append(o)
    if (session.puzzlesSolved > 0) celebrate()
  }

  function endSession() {
    stopTimer()
    if (pending !== undefined) {
      clearTimeout(pending)
      pending = undefined
    }
    if (sessionRecorded || session.correct + session.wrong === 0) return
    sessionRecorded = true
    ctx.stats.recordSession({
      gameId: cart.id,
      variant: describeRules(rules),
      mode,
      startedAt: session.startedAt,
      durationMs: Date.now() - session.startedAt,
      puzzlesSolved: session.puzzlesSolved,
      correct: session.correct,
      wrong: session.wrong,
      fast: session.fast,
      levelId: level?.id,
    })
  }

  return {
    destroy() {
      endSession()
      unmountBoard()
      confetti.reset()
      container.innerHTML = ''
    },
  }
}

/** A quick pop from the bottom-centre of the screen. */
function burst(scale: number) {
  void confetti({ particleCount: Math.round(80 * scale), spread: 70, startVelocity: 45, origin: { y: 0.8 }, disableForReducedMotion: true })
}

/** Two cannons from the sides for a few seconds. */
function celebrate() {
  const end = Date.now() + 2500
  const frame = () => {
    void confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, disableForReducedMotion: true })
    void confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, disableForReducedMotion: true })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}

function span(label: string, value: string): HTMLElement {
  const s = el('span', '', label)
  s.append(el('b', '', value))
  return s
}
