import { t } from './time'

export function createSpringStyle(
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

function createStyle(from: string, to: string, spring: string): string {
  const P = `(${from} - ${to})`
  const Q = to
  return `calc(${P} * ${spring} + ${Q})`
}

function constant(bounce: number): number {
  return 10 * (1 - bounce)
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
