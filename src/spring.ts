import { t } from './time'
import {
  Expression,
  add,
  cos,
  exp,
  generateCSSValue,
  mul,
  v,
  var_,
} from './math'

/**
 * https://developer.apple.com/videos/play/wwdc2023/10158/
 */
export function createSpringStyle(
  from: number,
  to: number,
  bounce: number,
  velocity: number,
): string {
  if (bounce > 0) {
    return createStyle(
      from,
      to,
      generateCSSValue(bouncySpring(bounce, velocity)),
    )
  } else if (bounce < 0) {
    return createStyle(
      from,
      to,
      generateCSSValue(flattenedSpring(bounce, velocity)),
    )
  } else {
    return createStyle(
      from,
      to,
      generateCSSValue(smoothSpring(bounce, velocity)),
    )
  }
}

export function springVelocity(
  t: number,
  bounce: number,
  initialVelocity: number,
): number {
  if (bounce > 0) {
    return bouncySpringVelocity(t, bounce, initialVelocity)
  } else if (bounce < 0) {
    return flattenedSpringVelocity(t, bounce, initialVelocity)
  } else {
    return smoothSpringVelocity(t, bounce, initialVelocity)
  }
}

function createStyle(from: number, to: number, spring: string): string {
  const P = `(${from}px - ${to}px)`
  const Q = `${to}px`
  return `calc(${P} * ${spring} + ${Q})`
}

function constant(bounce: number): number {
  return 10 * (1 - bounce)
}

function bouncySpringConstants(bounce: number, velocity: number) {
  const c = constant(bounce)
  const a = 2 * Math.PI
  const b = Math.atan2(-c + velocity, a)
  const A = 1 / Math.cos(b)

  return {
    A,
    a,
    b,
    c,
  }
}

function smoothSpringConstants(bounce: number, velocity: number) {
  const c = constant(bounce)
  const B = 1
  const A = -velocity + B * c

  return {
    A,
    B,
    c,
  }
}

function flattenedSpringConstants(bounce: number, velocity: number) {
  const c = constant(bounce)
  const a = 1 - bounce
  const A = 1 / 2 - velocity / (2 * (a - c))
  const B = 1 / 2 + velocity / (2 * (a - c))

  return {
    A,
    B,
    a,
    c,
  }
}

/**
 * Spring expression when bounce > 0
 */
function bouncySpring(bounce: number, velocity: number): Expression {
  const { A, a, b, c } = bouncySpringConstants(bounce, velocity)

  // A * cos(a * t + b) * e ^ (-c * t)
  const cosPart = cos(add(mul(v(a), var_(t)), v(b)))
  const expPart = exp(mul(v(-c), var_(t)))
  return mul(v(A), mul(cosPart, expPart))
}

function bouncySpringVelocity(
  t: number,
  bounce: number,
  initialVelocity: number,
): number {
  const { A, a, b, c } = bouncySpringConstants(bounce, initialVelocity)

  // Derivative of bouncy spring expression
  return (
    -A *
    Math.E ** (-c * t) *
    (c * Math.cos(a * t + b) + a * Math.sin(a * t + b))
  )
}

/**
 * Spring expression when bounce = 0
 */
function smoothSpring(bounce: number, velocity: number): Expression {
  const { A, B, c } = smoothSpringConstants(bounce, velocity)

  // (A * t + B) * e ^ (-c * t)
  const linearPart = add(mul(v(A), var_(t)), v(B))
  const expPart = exp(mul(v(-c), var_(t)))
  return mul(linearPart, expPart)
}

function smoothSpringVelocity(
  t: number,
  bounce: number,
  initialVelocity: number,
): number {
  const { A, B, c } = smoothSpringConstants(bounce, initialVelocity)

  // Derivative of smooth spring expression
  return Math.E ** (-c * t) * (A * -c * t + A - B * c)
}

/**
 * Spring expression when bounce < 0
 */
function flattenedSpring(bounce: number, velocity: number): Expression {
  const { A, B, a, c } = flattenedSpringConstants(bounce, velocity)

  // (A * e ^ (a * t) + B * e ^ (-a * t)) * e ^ (-c * t)
  const pullPart = mul(v(A), exp(mul(v(a), var_(t))))
  const pushPart = mul(v(B), exp(mul(v(-a), var_(t))))
  const expPart = exp(mul(v(-c), var_(t)))
  return mul(add(pullPart, pushPart), expPart)
}

function flattenedSpringVelocity(
  t: number,
  bounce: number,
  initialVelocity: number,
): number {
  const { A, B, a, c } = flattenedSpringConstants(bounce, initialVelocity)

  // Derivative of flattened spring expression
  return (
    Math.E ** (-c * t) *
      (a * A * Math.E ** (a * t) - a * B * Math.E ** (-a * t)) -
    c * Math.E ** (-c * t) * (A * Math.E ** (a * t) + B * Math.E ** (-a * t))
  )
}
