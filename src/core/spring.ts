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
import { range } from './utils'

export interface Spring {
  duration: number

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
}

export function generateSpringExpressionStyle(
  spring: Spring,
  data: { from: number; to: number; initialVelocity: number },
): string {
  const wrap = (exp: string) => `calc(${exp})`
  return wrap(generateCSSValue(springExpression(spring, data)))
}

export function evaluateSpring(
  spring: Spring,
  data: { time: number; from: number; to: number; initialVelocity: number },
): number {
  const variables = {
    [t]: data.time,
  }
  return calculate(springExpression(spring, data), variables)
}

function springExpression(
  spring: Spring,
  data: { from: number; to: number; initialVelocity: number },
): Expression {
  if (isNotAnimating(data)) {
    return v(data.to)
  }

  const curve = mul(spring.bounce(data), spring.decay(data))
  return add(mul(v(volume(data.from, data.to)), curve), v(data.to))
}

export function evaluateSpringBounce(
  spring: Spring,
  data: { time: number; from: number; to: number; initialVelocity: number },
): number {
  const variables = {
    [t]: data.time,
  }
  return calculate(spring.bounce(data), variables)
}

export function evaluateSpringDecay(
  spring: Spring,
  data: { time: number; from: number; to: number; initialVelocity: number },
): number {
  const variables = {
    [t]: data.time,
  }
  return calculate(spring.decay(data), variables)
}

export function evaluateSpringVelocity(
  spring: Spring,
  data: { time: number; from: number; to: number; initialVelocity: number },
): number {
  return spring.velocity(data)
}

/**
 * Because duration in this spring animation library is not real CSS transition duration,
 * we need to find settling duration that the time when the animation looks making no visual difference.
 *
 * We check both the distance to 'to' value, and the velocity to calculate it.
 */
export function springSettlingDuration(
  spring: Spring,
  data: {
    from: number
    to: number
    initialVelocity: number
  },
): number {
  const volume = Math.abs(data.from - data.to)

  // Set max duration to make sure the animation eventually ends.
  const maxDuration = 60_000

  // Decide the threshold distance and velocity where we can consider the animation is settled.
  // We use smaller threshold when the volume is small because the property might be sensitive.
  // For example, 'scale' property usually takes smaller distance of value on animation.
  // With scaling animation, the user would find the animation is jagged unless we set the thresholds smaller.
  const sensitive = volume < 5
  const settleDistance = sensitive ? 0.001 : 1
  const settleVelocity = sensitive ? 0.0005 : 0.01

  const step = Math.min(50, Math.ceil(spring.duration / 30))

  let currentDuration = spring.duration

  // Iterate the position and velocity for each step of timing in the spring animation.
  // When both the position and velocity are in the threshold, we consider the animation is settled then.
  while (currentDuration < maxDuration) {
    const time = currentDuration / spring.duration

    const position = evaluateSpring(spring, {
      ...data,
      time,
    })

    const velocity = evaluateSpringVelocity(spring, {
      ...data,
      time,
    })

    const distanceInThreshold = Math.abs(position - data.to) <= settleDistance
    const velocityInThreshold = Math.abs(velocity) <= settleVelocity

    if (distanceInThreshold && velocityInThreshold) {
      return currentDuration
    }

    currentDuration += step
  }

  return maxDuration
}

/**
 * Generate CSS transition string from spring parameters.
 * The result can be passed to where transition style value is expected.
 *
 * @example
 * ```js
 * // For all CSS properties
 * el.style.transition = springCSS(400, 0.1)
 *
 * // Specify animating property
 * el.style.transition = `transform ${springCSS(400, 0.1)}`
 * ```
 */
export function springCSS(duration: number, bounce: number = 0): string {
  const spring = createSpring({
    bounce,
    duration,
  })

  const settlingDuration = springSettlingDuration(spring, {
    from: 0,
    to: 1,
    initialVelocity: 0,
  })

  return springCSSInternal({
    spring,
    settlingDuration,
    normalizedVelocity: 0,
  })
}

/**
 * @private
 *
 * Generate CSS transition string from animation-related values.
 * Only used internally.
 * @param params.normalizedVelocity initial velocity rebased to 0-1 range
 */
export function springCSSInternal(params: {
  spring: Spring
  settlingDuration: number
  normalizedVelocity: number
}): string {
  const { spring, settlingDuration, normalizedVelocity } = params

  // 60fps
  const steps = Math.ceil(settlingDuration / (1000 / 60))

  const easingValues = range(0, steps + 1).map((i) => {
    const t = (i / steps) * (settlingDuration / spring.duration)
    const value = evaluateSpring(spring, {
      time: t,
      from: 0,
      to: 1,
      initialVelocity: normalizedVelocity,
    })
    return value
  })

  return `${settlingDuration}ms linear(${easingValues.join(',')})`
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
  return (velocity / volume(from, to)) * (duration / 1000)
}

/**
 * Convert normalized velocity (ratio / duration) to velocity (px / s)
 */
function denormalizeVelocity(
  v: number,
  { from, to, duration }: { from: number; to: number; duration: number },
): number {
  return v * volume(from, to) * (1000 / duration)
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
  // A * cos(a * t + b) * e ^ (-c * t)
  const spring: Spring = {
    duration,

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

      const { A, a, b, c } = bouncySpringConstants({
        ...data,
        bounce,
        duration,
      })

      const time = data.time

      // Derivative of bouncy spring expression
      const v =
        -A *
        Math.exp(-c * time) *
        (c * Math.cos(a * time + b) + a * Math.sin(a * time + b))

      return denormalizeVelocity(v, {
        ...data,
        duration,
      })
    },
  }

  return spring
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
  // (A * t + B) * e ^ (-c * t)
  const spring: Spring = {
    duration,

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

      const { A, B, c } = smoothSpringConstants({
        ...data,
        bounce,
        duration,
      })

      const time = data.time

      // Derivative of smooth spring expression
      const v = Math.exp(-c * time) * (A * -c * time + A - B * c)

      return denormalizeVelocity(v, {
        ...data,
        duration,
      })
    },
  }

  return spring
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
  // (A * e ^ (a * t) + B * e ^ (-a * t)) * e ^ (-c * t)
  const spring: Spring = {
    duration,

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

      const { A, B, a, c } = flattenedSpringConstants({
        ...data,
        bounce,
        duration,
      })

      const time = data.time

      // Derivative of flattened spring expression
      const v =
        Math.exp(-c * time) *
          (a * A * Math.exp(a * time) - a * B * Math.exp(-a * time)) -
        c *
          Math.exp(-c * time) *
          (A * Math.exp(a * time) + B * Math.exp(-a * time))

      return denormalizeVelocity(v, {
        ...data,
        duration,
      })
    },
  }

  return spring
}
