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

interface Spring {
  expressions: (data: {
    from: number
    to: number
    initialVelocity: number
  }) => {
    complete: Expression
    decay: Expression
  }

  velocity: (data: {
    time: number
    from: number
    to: number
    initialVelocity: number
  }) => number
}

export function springStyle(
  spring: Spring,
  data: { from: number; to: number; initialVelocity: number },
): string {
  const wrap = (exp: string) => `calc(1px * ${exp})`
  return wrap(generateCSSValue(spring.expressions(data).complete))
}

export function springValue(
  spring: Spring,
  data: { time: number; from: number; to: number; initialVelocity: number },
): number {
  const variables = {
    [t]: data.time,
  }
  return calculate(spring.expressions(data).complete, variables)
}

export function springVelocity(
  spring: Spring,
  data: { time: number; from: number; to: number; initialVelocity: number },
): number {
  return spring.velocity(data)
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
    expressions: (data) => {
      const { A, a, b, c } = bouncySpringConstants({
        ...data,
        bounce,
        duration,
      })

      const bouncePart = cos(add(mul(v(a), var_(t)), v(b)))
      const decayPart = exp(mul(v(-c), var_(t)))
      const easing = mul(v(A), mul(bouncePart, decayPart))

      return {
        complete: add(mul(v(data.from - data.to), easing), v(data.to)),
        decay: decayPart,
      }
    },

    velocity: (data) => {
      return bouncySpringVelocity({
        ...data,
        bounce,
        duration,
      })
    },
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
    expressions: (data) => {
      const { A, B, c } = smoothSpringConstants({
        ...data,
        bounce,
        duration,
      })

      const bouncePart = add(mul(v(A), var_(t)), v(B))
      const decayPart = exp(mul(v(-c), var_(t)))
      const easing = mul(bouncePart, decayPart)

      return {
        complete: add(mul(v(data.from - data.to), easing), v(data.to)),
        decay: decayPart,
      }
    },

    velocity: (data) => {
      return smoothSpringVelocity({
        ...data,
        bounce,
        duration,
      })
    },
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
    expressions: (data) => {
      const { A, B, a, c } = flattenedSpringConstants({
        ...data,
        bounce,
        duration,
      })

      // (A * e ^ (a * t) + B * e ^ (-a * t)) * e ^ (-c * t)
      const pullPart = mul(v(A), exp(mul(v(a), var_(t))))
      const pushPart = mul(v(B), exp(mul(v(-a), var_(t))))
      const decayPart = exp(mul(v(-c), var_(t)))
      const easing = mul(add(pullPart, pushPart), decayPart)

      return {
        complete: add(mul(v(data.from - data.to), easing), v(data.to)),
        decay: decayPart,
      }
    },

    velocity: (data) => {
      return flattenedSpringVelocity({
        ...data,
        bounce,
        duration,
      })
    },
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
