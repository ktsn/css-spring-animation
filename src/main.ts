/**
 * https://developer.apple.com/videos/play/wwdc2023/10158/Z
 */
export function animate(
  el: HTMLElement,
  animation: { from: number; to: number; velocity?: number },
  options?: {
    duration?: number
    bounce?: number
  },
): Promise<void> {
  registerProperty()

  const duration = options?.duration ?? 1000
  const bounce = options?.bounce ?? 0.5
  const velocity = animation.velocity ?? 0

  el.style.transition = `--t ${duration}ms linear`

  const P = animation.from - animation.to
  const Q = animation.to

  const a = 2 * Math.PI
  const c = 10
  const b = Math.atan2(-c + velocity, a)
  const A = 1 / Math.cos(b)

  el.style.translate = `calc(${P}px * ${A} * cos(${a}rad * var(--t) + ${b}rad) * exp(-${c} * var(--t)) + ${Q}px)`

  forceReflow()

  el.style.setProperty('--t', '1')

  return new Promise((resolve) => {
    el.addEventListener(
      'transitionend',
      () => {
        el.style.transition = ''
        el.style.translate = ''
        el.style.setProperty('--t', null)
        resolve()
      },
      { once: true },
    )
  })
}

let registered = false

function registerProperty() {
  if (registered) {
    return
  }

  CSS.registerProperty({
    name: '--t',
    inherits: false,
    initialValue: '0',
    syntax: '<number>',
  })
  registered = true
}

function forceReflow(): void {
  document.body.offsetHeight
}
