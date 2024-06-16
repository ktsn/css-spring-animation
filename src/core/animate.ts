import { registerPropertyIfNeeded, t, wait } from './time'
import {
  springValue,
  springStyle,
  springVelocity,
  createSpring,
  springSettlingDuration,
  Spring,
} from './spring'
import { isBrowserSupported, mapValues, zip } from './utils'
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

  const fromToValueList = Object.values(parsedFromTo).flatMap((value) => {
    const [from, to] = value
    return zip(from.values, to.values)
  })

  const settlingDuration = Math.max(
    ...fromToValueList.map(([from, to]) =>
      springSettlingDuration(spring, { from, to }),
    ),
  )

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

  if (isBrowserSupported()) {
    animateWithCssTransition({
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

function animateWithCssTransition({
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

  requestAnimationFrame(render)
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
            const elapsed = ctx.stoppedDuration ?? performance.now() - startTime
            if (elapsed >= settlingDuration) {
              return to.values
            }

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
