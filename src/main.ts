const t = '--css-spring-animation-t'

export interface AnimateOptions<Values extends AnimateFromTo> {
  velocity?: Partial<AnimateVelocities<Values>>
  duration?: number
  bounce?: number
}

export type AnimateFromTo = [string, string] | Record<string, [string, string]>

export type AnimateVelocities<FromTo extends AnimateFromTo> = FromTo extends [
  string,
  string,
]
  ? number
  : { [K in keyof FromTo]: number }

export type AnimateValues<FromTo extends AnimateFromTo> = FromTo extends [
  string,
  string,
]
  ? string
  : { [K in keyof FromTo]: string }

/**
 * https://developer.apple.com/videos/play/wwdc2023/10158/
 */
export function animate<E extends HTMLElement, FromTo extends AnimateFromTo>(
  el: E,
  fromTo: FromTo,
  set: (el: E, values: AnimateValues<FromTo>) => void,
  options: AnimateOptions<FromTo>,
): Promise<void> {
  registerPropertyIfNeeded()

  const duration = options?.duration ?? 1000
  const bounce = options?.bounce ?? 0

  const originalTransition = el.style.transition

  el.style.transition = 'none'
  el.style.setProperty(t, '0')

  if (Array.isArray(fromTo)) {
    const [from, to] = fromTo
    const velocity = (options.velocity as number | undefined) ?? 0
    const spring = createSpringStyle(from, to, bounce, velocity)
    set(el, spring as AnimateValues<FromTo>)
  } else {
    const spring = Object.fromEntries(
      Object.entries(fromTo).map(([property, [from, to]]) => {
        const velocityMap = options.velocity as
          | Record<string, number>
          | undefined
        const v = velocityMap?.[property] ?? 0
        return [property, createSpringStyle(from, to, bounce, v)]
      }),
    )
    set(el, spring as AnimateValues<FromTo>)
  }

  forceReflow()

  el.style.transition = `${t} ${duration}ms linear`
  el.style.setProperty(t, '1')

  return new Promise((resolve) => {
    function onEnd(event: TransitionEvent) {
      if (event.target !== el || event.propertyName !== t) {
        return
      }

      el.removeEventListener('transitionend', onEnd)

      if (Array.isArray(fromTo)) {
        set(el, fromTo[1] as AnimateValues<FromTo>)
      } else {
        set(
          el,
          Object.fromEntries(
            Object.entries(fromTo).map(([property, [_, to]]) => [property, to]),
          ) as AnimateValues<FromTo>,
        )
      }

      el.style.transition = originalTransition
      el.style.setProperty(t, null)
      resolve()
    }

    el.addEventListener('transitionend', onEnd)
  })
}

function createSpringStyle(
  from: string,
  to: string,
  bounce: number,
  velocity: number,
): string {
  if (bounce > 0) {
    return createStyle(from, to, bouncySpring(bounce, velocity))
  } else if (bounce < 0) {
    return createStyle(from, to, flattenedSpring(bounce, velocity))
  } else {
    return createStyle(from, to, smoothSpring(bounce, velocity))
  }
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
  return `${A} * cos(${a}rad * var(${t}) + ${b}rad) * exp(-${c} * var(${t}))`
}

/**
 * Spring expression when bounce = 0
 */
function smoothSpring(bounce: number, velocity: number): string {
  const c = constant(bounce)
  const B = 1
  const A = -velocity + B * c

  // (A * t + B) * e ^ (-c * t)
  return `(${A} * var(${t}) + ${B}) * exp(-${c} * var(${t}))`
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
  return `(${A} * exp(${a} * var(${t})) + ${B} * exp(-${a} * var(${t}))) * exp(-${c} * var(${t}))`
}

let registered = false

function registerPropertyIfNeeded() {
  if (registered) {
    return
  }

  CSS.registerProperty({
    name: t,
    inherits: false,
    initialValue: '0',
    syntax: '<number>',
  })
  registered = true
}

function forceReflow(): void {
  document.body.offsetHeight
}
