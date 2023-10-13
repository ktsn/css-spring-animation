import { registerPropertyIfNeeded, t, wait } from './time'
import {
  springValue,
  springStyle,
  springVelocity,
  createSpring,
  springSettlingDuration,
  Spring,
} from './spring'
import { forceReflow, isBrowserSupported, mapValues, zip } from './utils'
import { SpringStyle, generateSpringStyle } from './style'

export type SpringStyleValue = number | SpringStyle

export interface AnimateOptions<Velocity extends Record<string, number[]>> {
  velocity?: Partial<Velocity>
  duration?: number
  bounce?: number
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

export function animate<
  T extends Record<string, [SpringStyleValue, SpringStyleValue]>,
>(
  fromTo: T,
  set: (style: Record<string, string>) => void,
  options: AnimateOptions<Record<keyof T, number[]>> = {},
): AnimateContext<Record<keyof T, number[]>> {
  const duration = options.duration ?? 1000
  const bounce = options.bounce ?? 0

  const spring = createSpring({
    bounce,
    duration,
  })

  const fromToValueList = Object.values(fromTo).flatMap((value) => {
    const [from, to] = value
    const fromValues = typeof from === 'number' ? [from] : from.values
    const toValues = typeof to === 'number' ? [to] : to.values
    return zip(fromValues, toValues)
  })

  const settlingDuration = Math.max(
    ...fromToValueList.map(([from, to]) =>
      springSettlingDuration(spring, { from, to }),
    ),
  )

  const startTime = performance.now()

  const ctx = createContext({
    spring,
    fromTo,
    velocity: options.velocity,
    startTime,
    duration,
    settlingDuration,
  })

  if (isBrowserSupported()) {
    animateWithCssTransition({
      spring,
      fromTo,
      velocity: options.velocity,
      duration,
      settlingDuration,
      set,
    })
  } else {
    // Graceful degradation
    animateWithRaf({
      fromTo,
      context: ctx,
      set,
    })
  }

  ctx.settlingPromise.then(() => {
    const style = mapValues(fromTo, ([_, to]) => {
      return typeof to === 'number'
        ? String(to)
        : generateSpringStyle(to, to.values)
    })

    set({
      ...style,
      transition: '',
      [t]: '',
    })
  })

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
  fromTo: Record<string, [SpringStyleValue, SpringStyleValue]>
  velocity: Partial<Record<string, number[]>> | undefined
  duration: number
  settlingDuration: number
  set: (style: Record<string, string>) => void
}): void {
  registerPropertyIfNeeded()

  const style = mapValues(fromTo, ([from, to], key) => {
    const fromValues = typeof from === 'number' ? [from] : from.values
    const toValues = typeof to === 'number' ? [to] : to.values

    const style = zip(fromValues, toValues).map(([from, to], i) => {
      const initialVelocity = velocity?.[key]?.[i] ?? 0
      return springStyle(spring, {
        from,
        to,
        initialVelocity,
      })
    })

    return typeof to === 'number' ? style[0]! : generateSpringStyle(to, style)
  })

  set({
    ...style,
    transition: 'none',
    [t]: '0',
  })

  forceReflow()

  set({
    ...style,
    transition: `${t} ${settlingDuration}ms linear`,
    [t]: String(settlingDuration / duration),
  })
}

function animateWithRaf({
  fromTo,
  context,
  set,
}: {
  fromTo: Record<string, [SpringStyleValue, SpringStyleValue]>
  context: AnimateContext<Record<string, number[]>>
  set: (style: Record<string, string>) => void
}): void {
  function render(): void {
    if (context.settled) {
      return
    }

    const style = mapValues(fromTo, ([_, to]) => {
      return typeof to === 'number'
        ? String(to)
        : generateSpringStyle(to, to.values)
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
  FromTo extends Record<string, [SpringStyleValue, SpringStyleValue]>,
>({
  spring,
  fromTo,
  velocity,
  startTime,
  duration,
  settlingDuration,
}: {
  spring: Spring
  fromTo: FromTo
  velocity: Partial<Record<keyof FromTo, number[]>> | undefined
  startTime: number
  duration: number
  settlingDuration: number
}): AnimateContext<Record<keyof FromTo, number[]>> {
  const forceResolve: { fn: (() => void)[] } = { fn: [] }

  function stop() {
    if (ctx.settled) {
      return
    }
    ctx.finished = ctx.settled = true
    ctx.stoppedDuration = performance.now() - startTime
    forceResolve.fn.forEach((fn) => fn())
  }

  const ctx: AnimateContext<Record<keyof FromTo, number[]>> = {
    finishingPromise: wait(duration + 1, forceResolve).then(() => {
      ctx.finished = true
    }),

    settlingPromise: wait(settlingDuration + 1, forceResolve).then(() => {
      ctx.finished = ctx.settled = true
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
            const toValues = typeof to === 'number' ? [to] : to.values
            const elapsed = ctx.stoppedDuration ?? performance.now() - startTime
            if (elapsed >= settlingDuration) {
              return toValues
            }

            const time = elapsed / duration
            const fromValues = typeof from === 'number' ? [from] : from.values

            return zip(fromValues, toValues).map(([from, to], i) => {
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
            const toValues = typeof to === 'number' ? [to] : to.values
            if (ctx.settled) {
              return new Array(toValues.length).fill(0)
            }

            const fromValues = typeof from === 'number' ? [from] : from.values
            const time = performance.now() - startTime / duration

            return zip(fromValues, toValues).map(([from, to], i) => {
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

export function unit(value: string, unit: string): string {
  const trimmed = value.trim()
  return Number.isNaN(Number(trimmed))
    ? `calc(1${unit} * (${trimmed}))`
    : `${trimmed}${unit}`
}
