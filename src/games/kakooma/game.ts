import confetti from 'canvas-confetti'
import { randomRng } from '../../engine/rng'
import { bondKey, describeRules, loadRules, operations } from '../../engine/rules'
import { isFast } from '../../engine/scoring'
import type { GameContext, GameInstance } from '../../engine/types'
import { el } from '../../ui/settings'
import { generatePuzzle, type Pod, type Puzzle } from './generator'
import { kakoomaRules, type KakoomaRules } from './rules'

type Mode = 'practice' | 'challenge'

/** Plus-shaped layout for 5-cell pods: which 3x3 slots are blank, and which edges of each filled slot face outward. */
const PLUS_BLANKS = new Set([0, 2, 6, 8])
const PLUS_EDGES: Record<number, string[]> = {
  1: ['Top', 'Left', 'Right'],
  3: ['Top', 'Left', 'Bottom'],
  4: [],
  5: ['Top', 'Right', 'Bottom'],
  7: ['Left', 'Right', 'Bottom'],
}

const PROMPTS: Record<KakoomaRules['op'], string> = {
  add: 'In each pod, tap the number that is the sum of two others.',
  subtract: 'In each pod, tap a number that is the difference of two others.',
  multiply: 'In each pod, tap the number that is the product of two others.',
  divide: 'In each pod, tap a number that is the quotient of two others.',
  power: 'In each pod, tap the number that is one number raised to another.',
}

export function mountKakooma(container: HTMLElement, ctx: GameContext): GameInstance {
  const rules = loadRules('kakooma', kakoomaRules)
  const info = operations[rules.op]
  let mode: Mode = 'practice'
  let timeLeft = rules.timerSeconds
  let timer: number | undefined
  let pending: number | undefined
  let puzzle: Puzzle | null = null
  let puzzleShownAt = 0
  let solved = new Set<number>()
  let puzzleWrong = 0
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
  top.append(back, el('h1', '', 'Kakooma'))
  const hud = el('div', 'hud')
  const prompt = el('div', 'prompt', PROMPTS[rules.op])
  const board = el('div', 'board')
  const message = el('div', 'message')
  root.append(top, hud, prompt, board, message)
  container.append(root)

  showStart()

  function showStart() {
    hud.innerHTML = ''
    board.innerHTML = ''
    message.textContent = ''
    const o = el('div', 'overlay')
    o.append(el('h2', '', describeRules(rules)))
    o.append(
      el(
        'p',
        '',
        `${rules.podCount} pods of ${rules.podSize}. Practice is a round of ${rules.puzzlesPerRound} puzzles with no timer. Challenge gives ${rules.timerSeconds}s per puzzle for as long as you can keep going.`,
      ),
    )
    const choices = el('div', 'choices')
    const practice = el('button', 'btn', 'Practice') as HTMLButtonElement
    practice.onclick = () => start('practice')
    const challenge = el('button', 'btn secondary', 'Challenge') as HTMLButtonElement
    challenge.onclick = () => start('challenge')
    choices.append(practice, challenge)
    o.append(choices)
    board.append(o)
  }

  function start(m: Mode) {
    mode = m
    session.startedAt = Date.now()
    session.puzzlesSolved = session.correct = session.wrong = session.fast = 0
    sessionRecorded = false
    nextPuzzle()
  }

  function nextPuzzle() {
    puzzle = generatePuzzle(randomRng, rules, { podCount: rules.podCount, podSize: rules.podSize })
    solved = new Set()
    puzzleWrong = 0
    puzzleShownAt = Date.now()
    timeLeft = rules.timerSeconds
    message.textContent = ''
    message.className = 'message'
    renderBoard()
    renderHud()
    if (mode === 'challenge') {
      stopTimer()
      timer = window.setInterval(tick, 1000)
    }
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

  function renderBoard() {
    if (!puzzle) return
    board.innerHTML = ''
    board.className = `board ${puzzle.pods.length === 4 ? 'pods-4' : 'pods-many'}`
    puzzle.pods.forEach((pod, p) => board.append(podEl(pod, p)))
    if (puzzle.pods.length === 4) board.append(el('div', 'op', info.symbol))
  }

  function podEl(pod: Pod, p: number): HTMLElement {
    const wrap = el('div', 'pod')
    wrap.dataset.size = String(pod.cells.length)
    if (solved.has(p)) wrap.classList.add('solved')
    const slots = pod.cells.length === 5 ? 9 : pod.cells.length
    let ci = 0
    for (let s = 0; s < slots; s++) {
      if (pod.cells.length === 5 && PLUS_BLANKS.has(s)) {
        wrap.append(el('div', 'cell blank'))
        continue
      }
      const idx = ci++
      const b = el('button', 'cell', String(pod.cells[idx])) as HTMLButtonElement
      if (pod.cells.length === 5) for (const edge of PLUS_EDGES[s]) b.style.setProperty(`border-${edge.toLowerCase()}-width`, '3px')
      if (solved.has(p) && pod.targets.includes(idx)) b.classList.add('found')
      b.onclick = () => tap(p, idx, b)
      wrap.append(b)
    }
    return wrap
  }

  function tap(p: number, idx: number, btn: HTMLButtonElement) {
    if (!puzzle || solved.has(p)) return
    const pod = puzzle.pods[p]
    const [i, j] = pod.parts
    const fact = bondKey(info.base, pod.cells[i], pod.cells[j])
    const ms = Date.now() - puzzleShownAt
    if (pod.targets.includes(idx)) {
      solved.add(p)
      session.correct++
      ctx.stats.recordAttempt({ fact, correct: true, ms })
      btn.classList.add('found')
      btn.parentElement?.classList.add('solved')
      if (solved.size === puzzle.pods.length) puzzleSolved()
    } else {
      session.wrong++
      puzzleWrong++
      ctx.stats.recordAttempt({ fact, correct: false, ms })
      btn.classList.remove('wrong')
      void btn.offsetWidth
      btn.classList.add('wrong')
      btn.addEventListener('animationend', () => btn.classList.remove('wrong'), { once: true })
      if (mode === 'challenge') {
        timeLeft = Math.max(1, timeLeft - 3)
        renderHud()
      }
    }
  }

  function puzzleSolved() {
    stopTimer()
    session.puzzlesSolved++
    const fast = isFast({ ms: Date.now() - puzzleShownAt, wrong: puzzleWrong }, rules.fastSeconds)
    if (fast) session.fast++
    renderHud()
    const done = mode === 'practice' && session.puzzlesSolved >= rules.puzzlesPerRound
    if (done) {
      finish('Round complete!')
      return
    }
    message.textContent = fast ? '⚡ Fast!' : 'Nice!'
    message.className = fast ? 'message fast' : 'message good'
    burst(fast ? 1 : 0.5)
    pending = window.setTimeout(nextPuzzle, 1100)
  }

  function finish(title: string) {
    endSession()
    board.innerHTML = ''
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
    const again = el('button', 'btn', mode === 'practice' ? 'Another round' : 'Try again?') as HTMLButtonElement
    again.onclick = () => start(mode)
    const home = el('button', 'btn secondary', 'Games') as HTMLButtonElement
    home.onclick = ctx.exit
    choices.append(again, home)
    o.append(choices)
    board.append(o)
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
      gameId: 'kakooma',
      variant: describeRules(rules),
      mode,
      startedAt: session.startedAt,
      durationMs: Date.now() - session.startedAt,
      puzzlesSolved: session.puzzlesSolved,
      correct: session.correct,
      wrong: session.wrong,
      fast: session.fast,
    })
  }

  return {
    destroy() {
      endSession()
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
