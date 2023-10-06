import { t } from './time'
import {
  Expression,
  add,
  calculate,
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
export function createSpringStyle(data: {
  from: number
  to: number
  bounce: number
  initialVelocity: number
  duration: number
}): string {
  const wrap = (exp: string) => `calc(1px * ${exp})`
  return wrap(generateCSSValue(createSpring(data)))
}

export function calcSpringValue(data: {
  from: number
  to: number
  bounce: number
  initialVelocity: number
  duration: number
  time: number
}): number {
  const variables = {
    [t]: data.time,
  }
  return calculate(createSpring(data), variables)
}

export function createSpring(data: {
  from: number
  to: number
  bounce: number
  initialVelocity: number
  duration: number
}): Expression {
  if (data.bounce > 0) {
    return bouncySpring(data)
  } else if (data.bounce < 0) {
    return flattenedSpring(data)
  } else {
    return smoothSpring(data)
  }
}

export function springVelocity(data: {
  time: number
  from: number
  to: number
  bounce: number
  duration: number
  initialVelocity: number
}): number {
  if (data.bounce > 0) {
    return bouncySpringVelocity(data)
  } else if (data.bounce < 0) {
    return flattenedSpringVelocity(data)
  } else {
    return smoothSpringVelocity(data)
  }
}

function constant(bounce: number): number {
  if (bounce < 0) {
    return 2 * (2 + bounce)
  }
  return 8 * (1 - bounce)
}

/**
 * Convert velocity (px / s) to normalized velocity (ratio / duration)
 */
function normalizeVelocity(
  velocity: number,
  { from, to, duration }: { from: number; to: number; duration: number },
): number {
  return (velocity / (from - to)) * (1000 / duration)
}

/**
 * Convert normalized velocity (ratio / duration) to velocity (px / s)
 */
function denormalizeVelocity(
  v: number,
  { from, to, duration }: { from: number; to: number; duration: number },
): number {
  return v * (from - to) * (duration / 1000)
}

function bouncySpringConstants({
  from,
  to,
  bounce,
  duration,
  initialVelocity,
}: {
  from: number
  to: number
  bounce: number
  duration: number
  initialVelocity: number
}) {
  const v = normalizeVelocity(initialVelocity, { from, to, duration })
  const c = constant(bounce)
  const a = 2 * Math.PI
  const b = Math.atan2(-c - v, a)
  const A = 1 / Math.cos(b)

  return {
    A,
    a,
    b,
    c,
  }
}

function smoothSpringConstants({
  from,
  to,
  bounce,
  duration,
  initialVelocity,
}: {
  from: number
  to: number
  bounce: number
  duration: number
  initialVelocity: number
}) {
  const v = normalizeVelocity(initialVelocity, { from, to, duration })
  const c = constant(bounce)
  const B = 1
  const A = v + B * c

  return {
    A,
    B,
    c,
  }
}

function flattenedSpringConstants({
  from,
  to,
  bounce,
  duration,
  initialVelocity,
}: {
  from: number
  to: number
  bounce: number
  duration: number
  initialVelocity: number
}) {
  const v = normalizeVelocity(initialVelocity, { from, to, duration })
  const c = constant(bounce)
  const a = 1
  const A = 1 / 2 + v / (2 * (a - c))
  const B = 1 / 2 - v / (2 * (a - c))

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
function bouncySpring(data: {
  from: number
  to: number
  bounce: number
  duration: number
  initialVelocity: number
}): Expression {
  const { A, a, b, c } = bouncySpringConstants(data)

  // A * cos(a * t + b) * e ^ (-c * t)
  const cosPart = cos(add(mul(v(a), var_(t)), v(b)))
  const expPart = exp(mul(v(-c), var_(t)))
  const curve = mul(v(A), mul(cosPart, expPart))

  return add(mul(v(data.from - data.to), curve), v(data.to))
}

function bouncySpringVelocity(data: {
  time: number
  from: number
  to: number
  bounce: number
  duration: number
  initialVelocity: number
}): number {
  const t = data.time
  const { A, a, b, c } = bouncySpringConstants(data)

  // Derivative of bouncy spring expression
  const v =
    -A * Math.exp(-c * t) * (c * Math.cos(a * t + b) + a * Math.sin(a * t + b))

  return denormalizeVelocity(v, data)
}

/**
 * Spring expression when bounce = 0
 */
function smoothSpring(data: {
  from: number
  to: number
  bounce: number
  duration: number
  initialVelocity: number
}): Expression {
  const { A, B, c } = smoothSpringConstants(data)

  // (A * t + B) * e ^ (-c * t)
  const linearPart = add(mul(v(A), var_(t)), v(B))
  const expPart = exp(mul(v(-c), var_(t)))
  const curve = mul(linearPart, expPart)

  return add(mul(v(data.from - data.to), curve), v(data.to))
}

function smoothSpringVelocity(data: {
  time: number
  from: number
  to: number
  bounce: number
  duration: number
  initialVelocity: number
}): number {
  const t = data.time
  const { A, B, c } = smoothSpringConstants(data)

  // Derivative of smooth spring expression
  const v = Math.exp(-c * t) * (A * -c * t + A - B * c)

  return denormalizeVelocity(v, data)
}

/**
 * Spring expression when bounce < 0
 */
function flattenedSpring(data: {
  from: number
  to: number
  bounce: number
  duration: number
  initialVelocity: number
}): Expression {
  const { A, B, a, c } = flattenedSpringConstants(data)

  // (A * e ^ (a * t) + B * e ^ (-a * t)) * e ^ (-c * t)
  const pullPart = mul(v(A), exp(mul(v(a), var_(t))))
  const pushPart = mul(v(B), exp(mul(v(-a), var_(t))))
  const expPart = exp(mul(v(-c), var_(t)))
  const curve = mul(add(pullPart, pushPart), expPart)

  return add(mul(v(data.from - data.to), curve), v(data.to))
}

function flattenedSpringVelocity(data: {
  time: number
  from: number
  to: number
  bounce: number
  duration: number
  initialVelocity: number
}): number {
  const t = data.time
  const { A, B, a, c } = flattenedSpringConstants(data)

  // Derivative of flattened spring expression
  const v =
    Math.exp(-c * t) * (a * A * Math.exp(a * t) - a * B * Math.exp(-a * t)) -
    c * Math.exp(-c * t) * (A * Math.exp(a * t) + B * Math.exp(-a * t))

  return denormalizeVelocity(v, data)
}
