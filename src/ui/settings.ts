import { describeRules, loadRules, saveRules, type BondRules, type Field, type RulesSpec } from '../engine/rules'

/** Renders a parent-facing settings form for any game that declares a RulesSpec. */
export function renderSettings<R extends BondRules>(
  container: HTMLElement,
  gameId: string,
  title: string,
  spec: RulesSpec<R>,
  onDone: () => void,
) {
  let rules = loadRules(gameId, spec)
  container.innerHTML = ''

  const top = el('div', 'topbar')
  const back = el('button', 'back', '← Back') as HTMLButtonElement
  back.onclick = onDone
  top.append(back, el('h1', '', `${title}: rules`))
  container.append(top)

  const presetWrap = el('div', 'presets')
  const form = el('form', 'form') as HTMLFormElement
  const notice = el('div', 'notice')
  notice.hidden = true
  const summary = el('p', 'rules')

  function renderPresets() {
    presetWrap.innerHTML = ''
    for (const p of spec.presets) {
      const b = el('button', '', p.name) as HTMLButtonElement
      b.type = 'button'
      if (JSON.stringify(p.rules) === JSON.stringify(rules)) b.classList.add('active')
      b.onclick = () => {
        rules = { ...p.rules }
        renderForm()
        renderPresets()
      }
      presetWrap.append(b)
    }
  }

  function renderForm() {
    form.innerHTML = ''
    for (const f of spec.fields) form.append(fieldEl(f, rules as unknown as Record<string, unknown>))
    const actions = el('div', 'actions')
    const save = el('button', 'btn', 'Save') as HTMLButtonElement
    save.type = 'submit'
    actions.append(save)
    form.append(actions)
    summary.textContent = describeRules(rules)
  }

  form.onsubmit = (e) => {
    e.preventDefault()
    const next = { ...rules }
    for (const f of spec.fields) {
      const input = form.elements.namedItem(f.key) as HTMLInputElement | HTMLSelectElement
      const raw = f.type === 'boolean' ? (input as HTMLInputElement).checked : input.value
      ;(next as Record<string, unknown>)[f.key] = coerce(f, raw, (spec.defaults as Record<string, unknown>)[f.key])
    }
    const before = JSON.stringify(next)
    const problem = spec.validate(next)
    if (problem) {
      notice.textContent = problem
      notice.className = 'notice error'
      notice.hidden = false
      return
    }
    rules = next
    saveRules(gameId, rules)
    if (JSON.stringify(next) !== before) {
      notice.textContent = 'Saved, with one setting adjusted so puzzles can be generated.'
      notice.className = 'notice'
      notice.hidden = false
      renderForm()
      renderPresets()
      return
    }
    onDone()
  }

  renderPresets()
  renderForm()
  container.append(presetWrap, form, notice, summary)
}

function coerce(f: Field, raw: unknown, fallback: unknown): unknown {
  if (f.type === 'boolean') return Boolean(raw)
  if (f.type === 'number') {
    const n = Number(raw)
    return Number.isFinite(n) ? Math.min(f.max, Math.max(f.min, n)) : fallback
  }
  const opt = f.options.find((o) => String(o.value) === String(raw))
  return opt ? opt.value : fallback
}

function fieldEl(f: Field, values: Record<string, unknown>): HTMLElement {
  const wrap = el('div', 'field')
  const label = el('label', '', f.label) as HTMLLabelElement
  label.htmlFor = `f-${f.key}`
  wrap.append(label)
  if (f.type === 'select') {
    const s = document.createElement('select')
    s.id = `f-${f.key}`
    s.name = f.key
    for (const o of f.options) {
      const opt = document.createElement('option')
      opt.value = String(o.value)
      opt.textContent = o.label
      opt.selected = String(values[f.key]) === String(o.value)
      s.append(opt)
    }
    wrap.append(s)
  } else {
    const i = document.createElement('input')
    i.id = `f-${f.key}`
    i.name = f.key
    if (f.type === 'number') {
      i.type = 'number'
      i.inputMode = 'numeric'
      i.min = String(f.min)
      i.max = String(f.max)
      i.value = String(values[f.key] ?? '')
    } else {
      i.type = 'checkbox'
      i.checked = Boolean(values[f.key])
    }
    wrap.append(i)
  }
  if (f.help) wrap.append(el('div', 'help', f.help))
  return wrap
}

export function el(tag: string, className = '', text = ''): HTMLElement {
  const e = document.createElement(tag)
  if (className) e.className = className
  if (text) e.textContent = text
  return e
}
