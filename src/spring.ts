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

export interface Spring {
  expression: (data: {
    from: number
    to: number
    initialVelocity: number
  }) => Expression

  velocity: (data: {
    time: number
    from: number
    to: number
    initialVelocity: number
  }) => number

  settlingDuration: (data: { from: number; to: number }) => number
}

export function springStyle(
  spring: Spring,
  data: { from: number; to: number; initialVelocity: number },
): string {
  const wrap = (exp: string) => `calc(1px * ${exp})`
  return wrap(generateCSSValue(spring.expression(data)))
}

export function springValue(
  spring: Spring,
  data: { time: number; from: number; to: number; initialVelocity: number },
): number {
  const variables = {
    [t]: data.time,
  }
  return calculate(spring.expression(data), variables)
}

export function springVelocity(
  spring: Spring,
  data: { time: number; from: number; to: number; initialVelocity: number },
): number {
  return spring.velocity(data)
}

export function springSettlingDuration(
  spring: Spring,
  data: {
    from: number
    to: number
  },
): number {
  return spring.settlingDuration(data)
}

/**
 * https://developer.apple.com/videos/play/wwdc2023/10158/
 */
export function createSpring(data: {
  bounce: number
  duration: number
}): Spring {
  if (data.bounce > 0) {
    return bouncySpring(data)
  } else if (data.bounce < 0) {
    return flattenedSpring(data)
  } else {
    return smoothSpring(data)
  }
}

function constant(bounce: number): number {
  if (bounce < 0) {
    return 4 * (2 + bounce)
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
  // use non-zero very small value when from and to are same to avoid division by zero
  const volume = from - to === 0 ? 0.0001 : from - to
  return (velocity / volume) * (1000 / duration)
}

/**
 * Convert normalized velocity (ratio / duration) to velocity (px / s)
 */
function denormalizeVelocity(
  v: number,
  { from, to, duration }: { from: number; to: number; duration: number },
): number {
  // use non-zero very small value when from and to are same to avoid velocity lost
  const volume = from - to === 0 ? 0.0001 : from - to
  return v * volume * (duration / 1000)
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
  const a = 1.7 * Math.PI
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
  const a = 1.5
  const A = (a + c + v) / (2 * a)
  const B = (a - c - v) / (2 * a)

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
function bouncySpring({
  bounce,
  duration,
}: {
  bounce: number
  duration: number
}): Spring {
  return {
    // A * cos(a * t + b) * e ^ (-c * t)
    expression: (data) => {
      const { A, a, b, c } = bouncySpringConstants({
        ...data,
        bounce,
        duration,
      })

      const bouncePart = cos(add(mul(v(a), var_(t)), v(b)))
      const decayPart = exp(mul(v(-c), var_(t)))
      const easing = mul(v(A), mul(bouncePart, decayPart))

      return add(mul(v(data.from - data.to), easing), v(data.to))
    },

    velocity: (data) => {
      return bouncySpringVelocity({
        ...data,
        bounce,
        duration,
      })
    },

    settlingDuration: (data) =>
      settlingDuration({
        ...data,
        bounce,
        duration,
      }),
  }
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
function smoothSpring({
  bounce,
  duration,
}: {
  bounce: number
  duration: number
}): Spring {
  return {
    // (A * t + B) * e ^ (-c * t)
    expression: (data) => {
      const { A, B, c } = smoothSpringConstants({
        ...data,
        bounce,
        duration,
      })

      const bouncePart = add(mul(v(A), var_(t)), v(B))
      const decayPart = exp(mul(v(-c), var_(t)))
      const easing = mul(bouncePart, decayPart)

      return add(mul(v(data.from - data.to), easing), v(data.to))
    },

    velocity: (data) => {
      return smoothSpringVelocity({
        ...data,
        bounce,
        duration,
      })
    },

    settlingDuration: (data) =>
      settlingDuration({
        ...data,
        bounce,
        duration,
      }),
  }
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
function flattenedSpring({
  bounce,
  duration,
}: {
  bounce: number
  duration: number
}): Spring {
  return {
    // (A * e ^ (a * t) + B * e ^ (-a * t)) * e ^ (-c * t)
    expression: (data) => {
      const { A, B, a, c } = flattenedSpringConstants({
        ...data,
        bounce,
        duration,
      })

      const pullPart = mul(v(A), exp(mul(v(a), var_(t))))
      const pushPart = mul(v(B), exp(mul(v(-a), var_(t))))
      const decayPart = exp(mul(v(-c), var_(t)))
      const easing = mul(add(pullPart, pushPart), decayPart)

      return add(mul(v(data.from - data.to), easing), v(data.to))
    },

    velocity: (data) => {
      return flattenedSpringVelocity({
        ...data,
        bounce,
        duration,
      })
    },

    settlingDuration: (data) =>
      settlingDuration({
        ...data,
        bounce,
        duration,
      }),
  }
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

/**
 * Naive implementation to find the settling duration.
 * Check what time value makes the decay part of the spring expression under settlingThreshold.
 * Solving this equation for t:
 *
 * position = distance * e ^ (-c * t) (= settlingThreshold)
 * t = log(distance / settlingThreshold) / c
 *
 * Since t is normalized time with duration, we have to multiply it by actual duration.
 */
function settlingDuration(data: {
  from: number
  to: number
  bounce: number
  duration: number
}): number {
  const c = constant(data.bounce)
  const distance = Math.abs(data.to - data.from)
  const settlingThreshold = 0.0001
  return (Math.log(distance / settlingThreshold) * data.duration) / c
}
