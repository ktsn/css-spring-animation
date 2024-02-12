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

  bounce: (data: {
    from: number
    to: number
    initialVelocity: number
  }) => Expression

  decay: (data: {
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
  const wrap = (exp: string) => `calc(${exp})`
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

export function springBounceValue(
  spring: Spring,
  data: { time: number; from: number; to: number; initialVelocity: number },
): number {
  const variables = {
    [t]: data.time,
  }
  return calculate(spring.bounce(data), variables)
}

export function springDecayValue(
  spring: Spring,
  data: { time: number; from: number; to: number; initialVelocity: number },
): number {
  const variables = {
    [t]: data.time,
  }
  return calculate(spring.decay(data), variables)
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
    return 3.8 * (2 - Math.sqrt(-bounce))
  }
  if (bounce > 0) {
    return 10 * (1 - Math.sqrt(bounce))
  }
  return 8
}

function volume(from: number, to: number): number {
  // use non-zero very small value when from and to are same to avoid division by zero
  return from - to === 0 ? 0.000001 : from - to
}

/**
 * Convert velocity (px / s) to normalized velocity (ratio / duration)
 */
function normalizeVelocity(
  velocity: number,
  { from, to, duration }: { from: number; to: number; duration: number },
): number {
  return (velocity / volume(from, to)) * (1000 / duration)
}

/**
 * Convert normalized velocity (ratio / duration) to velocity (px / s)
 */
function denormalizeVelocity(
  v: number,
  { from, to, duration }: { from: number; to: number; duration: number },
): number {
  return v * volume(from, to) * (duration / 1000)
}

function isNotAnimating(data: {
  from: number
  to: number
  initialVelocity: number
}): boolean {
  return data.from === data.to && data.initialVelocity === 0
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
  const a = 0.00001
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
  const spring: Spring = {
    // A * cos(a * t + b) * e ^ (-c * t)
    expression: (data) => {
      if (isNotAnimating(data)) {
        return v(data.to)
      }

      const curve = mul(spring.bounce(data), spring.decay(data))
      return add(mul(v(volume(data.from, data.to)), curve), v(data.to))
    },

    bounce: (data) => {
      const { A, a, b } = bouncySpringConstants({
        ...data,
        bounce,
        duration,
      })

      return mul(v(A), cos(add(mul(v(a), var_(t)), v(b))))
    },

    decay: (data) => {
      const { c } = bouncySpringConstants({
        ...data,
        bounce,
        duration,
      })

      return exp(mul(v(-c), var_(t)))
    },

    velocity: (data) => {
      if (isNotAnimating(data)) {
        return 0
      }

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

  return spring
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
  const spring: Spring = {
    // (A * t + B) * e ^ (-c * t)
    expression: (data) => {
      if (isNotAnimating(data)) {
        return v(data.to)
      }

      const curve = mul(spring.bounce(data), spring.decay(data))
      return add(mul(v(volume(data.from, data.to)), curve), v(data.to))
    },

    bounce: (data) => {
      const { A, B } = smoothSpringConstants({
        ...data,
        bounce,
        duration,
      })

      return add(mul(v(A), var_(t)), v(B))
    },

    decay: (data) => {
      const { c } = smoothSpringConstants({
        ...data,
        bounce,
        duration,
      })

      return exp(mul(v(-c), var_(t)))
    },

    velocity: (data) => {
      if (isNotAnimating(data)) {
        return 0
      }

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

  return spring
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
  const spring: Spring = {
    // (A * e ^ (a * t) + B * e ^ (-a * t)) * e ^ (-c * t)
    expression: (data) => {
      if (isNotAnimating(data)) {
        return v(data.to)
      }

      const curve = mul(spring.bounce(data), spring.decay(data))
      return add(mul(v(volume(data.from, data.to)), curve), v(data.to))
    },

    bounce: (data) => {
      const { A, B, a } = flattenedSpringConstants({
        ...data,
        bounce,
        duration,
      })

      const pullPart = mul(v(A), exp(mul(v(a), var_(t))))
      const pushPart = mul(v(B), exp(mul(v(-a), var_(t))))

      return add(pullPart, pushPart)
    },

    decay: (data) => {
      const { c } = flattenedSpringConstants({
        ...data,
        bounce,
        duration,
      })

      return exp(mul(v(-c), var_(t)))
    },

    velocity: (data) => {
      if (isNotAnimating(data)) {
        return 0
      }

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

  return spring
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
 *
 * The return value may not be actual settling time because we do not consider the bounce part and initial velocity.
 */
function settlingDuration(data: {
  from: number
  to: number
  bounce: number
  duration: number
}): number {
  const c = constant(data.bounce)
  const distance = Math.abs(volume(data.from, data.to))
  const settlingThreshold = 0.0001
  return Math.max(
    data.duration,
    (Math.log(distance / settlingThreshold) * data.duration) / c,
  )
}
