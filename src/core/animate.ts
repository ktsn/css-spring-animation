import { registerPropertyIfNeeded, t, wait } from './time'
import {
  springValue,
  springStyle,
  springVelocity,
  createSpring,
  springSettlingDuration,
  Spring,
} from './spring'
import {
  isCssLinearTimingFunctionSupported,
  isCssMathAnimationSupported,
  mapValues,
  range,
  zip,
} from './utils'
import {
  ParsedStyleValue,
  completeParsedStyleUnit,
  interpolateParsedStyle,
  parseStyleValue,
} from './style'

export type AnimateValue = number | string | ParsedStyleValue

export interface SpringOptions {
  duration?: number
  bounce?: number
}

export interface AnimateOptions<Velocity extends Record<string, number[]>>
  extends SpringOptions {
  velocity?: Partial<Velocity>
}

export interface AnimateContext<Values extends Record<string, number[]>> {
  realValue: Values
  realVelocity: Values

  finished: boolean
  settled: boolean

  finishingPromise: Promise<void>
  settlingPromise: Promise<void>

  stop: () => void
  stoppedDuration: number | undefined
}

export function animate<T extends Record<string, [AnimateValue, AnimateValue]>>(
  fromTo: T,
  set: (style: Record<string, string>) => void,
  options: AnimateOptions<Record<keyof T, number[]>> = {},
): AnimateContext<Record<keyof T, number[]>> {
  const parsedFromTo = mapValues(fromTo, ([from, to]) => {
    const parsedFrom =
      typeof from === 'object' ? from : parseStyleValue(String(from))
    const parsedTo = typeof to === 'object' ? to : parseStyleValue(String(to))

    return [parsedFrom, parsedTo] as [ParsedStyleValue, ParsedStyleValue]
  })

  const duration = options.duration ?? 1000
  const bounce = options.bounce ?? 0

  const spring = createSpring({
    bounce,
    duration,
  })

  const settlingDurationList = Object.entries(parsedFromTo).flatMap(
    ([key, value]) => {
      const [from, to] = value
      const initialVelocity = options.velocity?.[key] ?? []

      return zip(from.values, to.values).map(([from, to], i) => {
        const velocity = initialVelocity[i] ?? 0
        return springSettlingDuration(spring, {
          from,
          to,
          initialVelocity: velocity,
        })
      })
    },
  )

  const settlingDuration = Math.max(...settlingDurationList)

  const startTime = performance.now()

  const ctx = createContext({
    spring,
    fromTo: parsedFromTo,
    velocity: options.velocity,
    startTime,
    duration,
    settlingDuration,
    set,
  })

  if (
    isCssLinearTimingFunctionSupported() &&
    canUseLinearTimingFunction(parsedFromTo, options.velocity)
  ) {
    animateWithLinearTimingFunction({
      spring,
      fromTo: parsedFromTo,
      velocity: options.velocity,
      duration,
      settlingDuration,
      set,
    })
  } else if (isCssMathAnimationSupported()) {
    animateWithCssCustomPropertyMath({
      spring,
      fromTo: parsedFromTo,
      velocity: options.velocity,
      duration,
      settlingDuration,
      set,
    })
  } else {
    // Graceful degradation
    animateWithRaf({
      fromTo: parsedFromTo,
      context: ctx,
      set,
    })
  }

  return ctx
}

/**
 * Check if the animation can be done with linear() timing function.
 * The animation can be done with linear() timing function if:
 * - All the velocities in the same property are zero or
 * - Only one value will be animated in the same property.
 */
function canUseLinearTimingFunction(
  fromTo: Record<string, [ParsedStyleValue, ParsedStyleValue]>,
  velocity: Partial<Record<string, number[]>> | undefined,
): boolean {
  if (!velocity) {
    return true
  }

  return Object.keys(fromTo).every((key) => {
    const [from, to] = fromTo[key]!
    const velocities = velocity[key]

    if (!velocities || velocities.every((v) => v === 0)) {
      return true
    }

    const animatedValues = zip(from.values, to.values).filter(([from, to]) => {
      return from !== to
    })
    if (animatedValues.length <= 1) {
      return true
    }

    return false
  })
}

function animateWithLinearTimingFunction({
  spring,
  fromTo,
  velocity,
  duration,
  settlingDuration,
  set,
}: {
  spring: Spring
  fromTo: Record<string, [ParsedStyleValue, ParsedStyleValue]>
  velocity: Partial<Record<string, number[]>> | undefined
  duration: number
  settlingDuration: number
  set: (style: Record<string, string>) => void
}): void {
  const fromStyle = mapValues(fromTo, ([from, to]) => {
    // Skip animation if the value is not consistent
    if (from.values.length !== to.values.length) {
      return interpolateParsedStyle(to, to.values)
    }

    return interpolateParsedStyle(from, from.values)
  })

  set({
    ...fromStyle,
    transition: 'none',
  })

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const toStyle = mapValues(fromTo, ([_from, to]) => {
        return interpolateParsedStyle(to, to.values)
      })

      // 60fps
      const steps = Math.ceil(settlingDuration / (1000 / 60))

      const easingValues = mapValues(fromTo, ([from, to], key) => {
        const initialVelocity = zip(from.values, to.values).reduce<
          number | undefined
        >((acc, [from, to], i) => {
          if (acc !== undefined) {
            return acc
          }

          if (from === to) {
            return undefined
          }

          return (velocity?.[key]?.[i] ?? 0) / (to - from)
        }, undefined)

        return range(0, steps + 1).map((i) => {
          const t = (i / steps) * (settlingDuration / duration)
          const value = springValue(spring, {
            time: t,
            from: 0,
            to: 1,
            initialVelocity: initialVelocity ?? 0,
          })
          return value
        })
      })

      const transition = Object.entries(easingValues)
        .map(([key, value]) => {
          if (value) {
            return `${key} ${settlingDuration}ms linear(${value.join(',')})`
          } else {
            return `${key} 0s`
          }
        })
        .join(',')

      set({
        ...toStyle,
        transition,
      })
    })
  })
}

function animateWithCssCustomPropertyMath({
  spring,
  fromTo,
  velocity,
  duration,
  settlingDuration,
  set,
}: {
  spring: Spring
  fromTo: Record<string, [ParsedStyleValue, ParsedStyleValue]>
  velocity: Partial<Record<string, number[]>> | undefined
  duration: number
  settlingDuration: number
  set: (style: Record<string, string>) => void
}): void {
  registerPropertyIfNeeded()

  const style = mapValues(fromTo, ([from, to], key) => {
    // Skip animation if the value is not consistent
    if (from.values.length !== to.values.length) {
      return interpolateParsedStyle(to, to.values)
    }

    const style = zip(from.values, to.values).map(([from, to], i) => {
      const initialVelocity = velocity?.[key]?.[i] ?? 0
      return springStyle(spring, {
        from,
        to,
        initialVelocity,
      })
    })

    const completedTo = completeParsedStyleUnit(to, from)
    return interpolateParsedStyle(completedTo, style)
  })

  set({
    ...style,
    transition: 'none',
    [t]: '0',
  })

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      set({
        ...style,
        transition: `${t} ${settlingDuration}ms linear`,
        [t]: String(settlingDuration / duration),
      })
    })
  })
}

function animateWithRaf({
  fromTo,
  context,
  set,
}: {
  fromTo: Record<string, [ParsedStyleValue, ParsedStyleValue]>
  context: AnimateContext<Record<string, number[]>>
  set: (style: Record<string, string>) => void
}): void {
  function render(): void {
    if (context.settled) {
      return
    }

    const style = mapValues(fromTo, ([from, to], key) => {
      // Skip animation if the value is not consistent
      if (from.values.length !== to.values.length) {
        return interpolateParsedStyle(to, to.values)
      }

      const realValue = context.realValue[key]
      if (!realValue) {
        return ''
      }

      const completedTo = completeParsedStyleUnit(to, from)
      return interpolateParsedStyle(completedTo, realValue)
    })

    set({
      ...style,
      transition: 'none',
    })

    requestAnimationFrame(render)
  }

  render()
}

function createContext<
  FromTo extends Record<string, [ParsedStyleValue, ParsedStyleValue]>,
>({
  spring,
  fromTo,
  velocity,
  startTime,
  duration,
  settlingDuration,
  set,
}: {
  spring: Spring
  fromTo: FromTo
  velocity: Partial<Record<keyof FromTo, number[]>> | undefined
  startTime: number
  duration: number
  settlingDuration: number
  set: (style: Record<string, string>) => void
}): AnimateContext<Record<keyof FromTo, number[]>> {
  const forceResolve: { fn: (() => void)[] } = { fn: [] }

  function stop() {
    if (ctx.settled) {
      return
    }
    ctx.finished = ctx.settled = true
    ctx.stoppedDuration = performance.now() - startTime
    setRealStyle()
    forceResolve.fn.forEach((fn) => fn())
  }

  function setRealStyle() {
    const style = mapValues(fromTo, ([from, to], key) => {
      const realValue = ctx.realValue[key]
      if (!realValue) {
        return ''
      }

      const completedTo = completeParsedStyleUnit(to, from)
      return interpolateParsedStyle(completedTo, realValue)
    })

    set({
      ...style,
      transition: '',
      [t]: '',
    })
  }

  const ctx: AnimateContext<Record<keyof FromTo, number[]>> = {
    finishingPromise: wait(duration + 1, forceResolve).then(() => {
      ctx.finished = true
    }),

    settlingPromise: wait(settlingDuration + 1, forceResolve).then(() => {
      ctx.finished = ctx.settled = true

      if (ctx.stoppedDuration === undefined) {
        setRealStyle()
      }
    }),

    finished: false,
    settled: false,

    stop,
    stoppedDuration: undefined,

    get realValue() {
      const result: Record<string, number[]> = {}
      for (const key of Object.keys(fromTo)) {
        const [from, to] = fromTo[key]!

        Object.defineProperty(result, key, {
          configurable: true,
          enumerable: true,
          get(): number[] {
            if (ctx.settled && ctx.stoppedDuration === undefined) {
              return to.values
            }

            const elapsed = ctx.stoppedDuration ?? performance.now() - startTime
            const time = elapsed / duration

            return zip(from.values, to.values).map(([from, to], i) => {
              const initialVelocity = velocity?.[key]?.[i] ?? 0
              return springValue(spring, {
                from,
                to,
                initialVelocity,
                time,
              })
            })
          },
        })
      }

      return result as Record<keyof FromTo, number[]>
    },

    get realVelocity() {
      const result: Record<string, number[]> = {}
      for (const key of Object.keys(fromTo)) {
        const [from, to] = fromTo[key]!

        Object.defineProperty(result, key, {
          configurable: true,
          enumerable: true,
          get(): number[] {
            if (ctx.settled) {
              return new Array(to.values.length).fill(0)
            }

            const time = (performance.now() - startTime) / duration

            return zip(from.values, to.values).map(([from, to], i) => {
              const initialVelocity = velocity?.[key]?.[i] ?? 0
              return springVelocity(spring, {
                time,
                from,
                to,
                initialVelocity,
              })
            })
          },
        })
      }

      return result as Record<keyof FromTo, number[]>
    },
  }

  return ctx
}
