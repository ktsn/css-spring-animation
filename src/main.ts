/**
 * https://developer.apple.com/videos/play/wwdc2023/10158/
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
  const bounce = options?.bounce ?? 0
  const velocity = animation.velocity ?? 0

  el.style.transition = `--t ${duration}ms linear`

  const from = `${animation.from}px`
  const to = `${animation.to}px`

  if (bounce > 0) {
    el.style.translate = createStyle(from, to, bouncySpring(bounce, velocity))
  } else if (bounce < 0) {
    el.style.translate = createStyle(
      from,
      to,
      flattenedSpring(bounce, velocity),
    )
  } else {
    el.style.translate = createStyle(from, to, smoothSpring(bounce, velocity))
  }

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

function constant(bounce: number): number {
  return 10 * (1 - bounce)
}

function createStyle(from: string, to: string, spring: string): string {
  const P = `(${from} - ${to})`
  const Q = to
  return `calc(${P} * ${spring} + ${Q})`
}

/**
 * Spring expression when bounce > 0
 */
function bouncySpring(bounce: number, velocity: number): string {
  const c = constant(bounce)
  const a = 2 * Math.PI
  const b = Math.atan2(-c + velocity, a)
  const A = 1 / Math.cos(b)

  // A * cos(a * t + b) * e ^ (-c * t)
  return `${A} * cos(${a}rad * var(--t) + ${b}rad) * exp(-${c} * var(--t))`
}

/**
 * Spring expression when bounce = 0
 */
function smoothSpring(bounce: number, velocity: number): string {
  const c = constant(bounce)
  const B = 1
  const A = -velocity + B * c

  // (A * t + B) * e ^ (-c * t)
  return `(${A} * var(--t) + ${B}) * exp(-${c} * var(--t))`
}

/**
 * Spring expression when bounce < 0
 */
function flattenedSpring(bounce: number, velocity: number): string {
  const c = constant(bounce)
  const a = 1 - bounce
  const A = 1 / 2 - velocity / (2 * (a - c))
  const B = 1 / 2 + velocity / (2 * (a - c))

  // (A * e ^ (a * t) + B * e ^ (-a * t)) * e ^ (-c * t)
  return `(${A} * exp(${a} * var(--t)) + ${B} * exp(-${a} * var(--t))) * exp(-${c} * var(--t))`
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
