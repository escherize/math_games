export function el(tag: string, className = '', text = ''): HTMLElement {
  const e = document.createElement(tag)
  if (className) e.className = className
  if (text) e.textContent = text
  return e
}
