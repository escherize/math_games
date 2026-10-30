import { randomRng } from '../../engine/rng'
import { bondKey, describeRules, loadRules, operations } from '../../engine/rules'
import type { GameContext, GameInstance } from '../../engine/types'
import { el } from '../../ui/settings'
import { generatePuzzle, type Pod, type Puzzle } from './generator'
import { kakoomaRules, type KakoomaRules } from './rules'

type Mode = 'practice' | 'challenge'

/** Plus-shaped layout for 5-cell pods: which 3x3 slots are blank. */
const PLUS_BLANKS = new Set([0, 2, 6, 8])

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
  let level = 1
  let puzzlesLeft = rules.puzzlesPerLevel
  let timeLeft = rules.timerSeconds
  let timer: number | undefined
  let puzzle: Puzzle | null = null
  let puzzleShownAt = 0
  let solved = new Set<number>()
  const session = { startedAt: Date.now(), puzzlesSolved: 0, correct: 0, wrong: 0, levelReached: 1 }
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
    o.append(el('p', '', `${rules.podCount} pods of ${rules.podSize}. Practice has no timer; Challenge gives ${rules.timerSeconds}s per puzzle.`))
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
    level = 1
    puzzlesLeft = rules.puzzlesPerLevel
    session.startedAt = Date.now()
    session.puzzlesSolved = session.correct = session.wrong = 0
    session.levelReached = 1
    sessionRecorded = false
    nextPuzzle()
  }

  function nextPuzzle() {
    puzzle = generatePuzzle(randomRng, rules, { podCount: rules.podCount, podSize: rules.podSize })
    solved = new Set()
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
      gameOver()
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
    hud.append(span(`Level: `, String(level)), span(`Puzzles left: `, String(puzzlesLeft)))
    if (mode === 'challenge') {
      const t = span(`Time left: `, `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`)
      t.classList.add('timer')
      if (timeLeft <= 10) t.classList.add('low')
      hud.append(t)
    } else {
      hud.append(span('Mode: ', 'Practice'))
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
    puzzlesLeft--
    message.textContent = puzzlesLeft > 0 ? 'Nice!' : `Level ${level} complete!`
    message.className = 'message good'
    if (puzzlesLeft <= 0) {
      level++
      session.levelReached = level
      puzzlesLeft = rules.puzzlesPerLevel
    }
    renderHud()
    window.setTimeout(nextPuzzle, 900)
  }

  function gameOver() {
    endSession()
    board.innerHTML = ''
    message.textContent = ''
    const o = el('div', 'overlay')
    o.append(el('h2', '', "Time's up"))
    o.append(el('p', '', `Reached level ${level}. ${session.puzzlesSolved} puzzles, ${session.correct} right, ${session.wrong} wrong.`))
    const choices = el('div', 'choices')
    const again = el('button', 'btn', 'Try again?') as HTMLButtonElement
    again.onclick = () => start(mode)
    const home = el('button', 'btn secondary', 'Games') as HTMLButtonElement
    home.onclick = ctx.exit
    choices.append(again, home)
    o.append(choices)
    board.append(o)
  }

  function endSession() {
    stopTimer()
    if (sessionRecorded || session.correct + session.wrong === 0) return
    sessionRecorded = true
    ctx.stats.recordSession({
      gameId: 'kakooma',
      variant: describeRules(rules),
      mode,
      startedAt: session.startedAt,
      durationMs: Date.now() - session.startedAt,
      levelReached: session.levelReached,
      puzzlesSolved: session.puzzlesSolved,
      correct: session.correct,
      wrong: session.wrong,
    })
  }

  return {
    destroy() {
      endSession()
      container.innerHTML = ''
    },
  }
}

function span(label: string, value: string): HTMLElement {
  const s = el('span', '', label)
  s.append(el('b', '', value))
  return s
}
