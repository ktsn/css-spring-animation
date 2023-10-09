import { registerPropertyIfNeeded, t, wait } from './time'
import {
  springValue,
  springStyle,
  springVelocity,
  createSpring,
  springSettlingDuration,
  Spring,
} from './spring'
import { forceReflow, mapValues } from './utils'

export interface AnimateOptions<Values> {
  velocity?: Partial<AnimateVelocities<Values>>
  duration?: number
  bounce?: number
}

export type AnimateFromTo = [number, number] | Record<string, [number, number]>

export type AnimateVelocities<Values = unknown> =
  | number
  | { [K in keyof Values]: number }

export type AnimateValues<Values = unknown, T = string> = Values extends Record<
  string,
  unknown
>
  ? { [K in keyof Values]: T }
  : T

export interface AnimateContext<FromTo> {
  current: AnimateValues<FromTo, number>
  velocity: AnimateVelocities<FromTo>
  finished: boolean
  settled: boolean
  finishingPromise: Promise<void>
  settlingPromise: Promise<void>
  stop: () => void
}

export function animate<FromTo extends AnimateFromTo>(
  fromTo: FromTo,
  set: (
    values: AnimateValues<FromTo>,
    additionalStyle: Record<string, string>,
  ) => void,
  options: AnimateOptions<FromTo> = {},
): AnimateContext<FromTo> {
  registerPropertyIfNeeded()

  const duration = options.duration ?? 1000
  const bounce = options.bounce ?? 0

  const spring = createSpring({
    bounce,
    duration,
  })

  const fromToList = Array.isArray(fromTo)
    ? ([fromTo] as [number, number][])
    : Object.values(fromTo)

  const settlingDuration = Math.max(
    ...fromToList.map(([from, to]) =>
      springSettlingDuration(spring, { from, to }),
    ),
  )

  const values = mapFromTo(fromTo, options.velocity, ([from, to], velocity) => {
    return springStyle(spring, {
      from,
      to,
      initialVelocity: velocity,
    })
  })

  set(values, {
    transition: 'none',
    [t]: '0',
  })

  forceReflow()

  set(values, {
    transition: `${t} ${settlingDuration}ms linear`,
    [t]: String(settlingDuration / duration),
  })

  const startTime = performance.now()

  const ctx = createContext({
    spring,
    fromTo,
    velocity: options.velocity,
    startTime,
    duration,
    settlingDuration,
  })

  ctx.settlingPromise.then(() => {
    const values = (
      typeof ctx.current === 'number'
        ? `${ctx.current}px`
        : mapValues(ctx.current, (v) => `${v}px`)
    ) as AnimateValues<FromTo>

    set(values, {
      transition: '',
      [t]: '',
    })
  })

  return ctx
}

function createContext<FromTo extends AnimateFromTo>({
  spring,
  fromTo,
  velocity,
  startTime,
  duration,
  settlingDuration,
}: {
  spring: Spring
  fromTo: FromTo
  velocity: Partial<AnimateVelocities<FromTo>> | undefined
  startTime: number
  duration: number
  settlingDuration: number
}): AnimateContext<FromTo> {
  const forceResolve: { fn: (() => void)[] } = { fn: [] }

  function stop() {
    if (ctx.settled) {
      return
    }
    ctx.finished = ctx.settled = true
    forceResolve.fn.forEach((fn) => fn())
  }

  const ctx: AnimateContext<FromTo> = {
    finishingPromise: wait(duration + 1, forceResolve),
    settlingPromise: wait(settlingDuration + 1, forceResolve),

    finished: false,
    settled: false,

    stop,

    get current() {
      if (Array.isArray(fromTo)) {
        const elapsed = performance.now() - startTime
        const [from, to] = fromTo
        if (elapsed >= settlingDuration) {
          return to as AnimateValues<FromTo, number>
        }

        const time = elapsed / duration
        const initialVelocity = typeof velocity === 'number' ? velocity : 0
        return springValue(spring, {
          from,
          to,
          initialVelocity,
          time,
        }) as AnimateValues<FromTo, number>
      }

      const result: Record<string, number> = {}
      for (const key of Object.keys(fromTo)) {
        const initialVelocity =
          typeof velocity === 'number'
            ? velocity
            : (velocity as Record<string, number> | undefined)?.[key] ?? 0
        const fromToValue = fromTo[key]
        if (!fromToValue) {
          continue
        }

        const [from, to] = fromToValue

        Object.defineProperty(result, key, {
          configurable: true,
          enumerable: true,
          get(): number {
            const elapsed = performance.now() - startTime
            if (elapsed >= settlingDuration) {
              return to
            }

            const time = elapsed / duration
            return springValue(spring, {
              from,
              to,
              initialVelocity,
              time,
            })
          },
        })
      }

      return result as AnimateValues<FromTo, number>
    },

    get velocity() {
      if (Array.isArray(fromTo)) {
        const elapsed = performance.now() - startTime
        if (elapsed >= settlingDuration) {
          return 0
        }

        const time = elapsed / duration
        const [from, to] = fromTo
        const initialVelocity = typeof velocity === 'number' ? velocity : 0

        return springVelocity(spring, {
          time,
          from,
          to,
          initialVelocity,
        })
      }

      const result: Record<string, number> = {}
      for (const key of Object.keys(fromTo)) {
        const initialVelocity =
          typeof velocity === 'number'
            ? velocity
            : (velocity as Record<string, number> | undefined)?.[key] ?? 0
        const fromToValue = fromTo[key]
        if (!fromToValue) {
          continue
        }

        const [from, to] = fromToValue

        Object.defineProperty(result, key, {
          configurable: true,
          enumerable: true,
          get(): number {
            const elapsed = performance.now() - startTime
            if (elapsed >= settlingDuration) {
              return 0
            }

            const time = elapsed / duration
            return springVelocity(spring, {
              time,
              from,
              to,
              initialVelocity,
            })
          },
        })
      }

      return result as AnimateVelocities<FromTo>
    },
  }

  ctx.finishingPromise.then(() => {
    ctx.finished = true
  })

  ctx.settlingPromise.then(() => {
    ctx.finished = ctx.settled = true
  })

  return ctx
}

function mapFromTo<FromTo extends AnimateFromTo>(
  fromTo: FromTo,
  velocities: Partial<AnimateVelocities<FromTo>> | undefined,
  fn: (value: [number, number], velocity: number) => string,
): AnimateValues<FromTo> {
  if (Array.isArray(fromTo)) {
    const v = typeof velocities === 'number' ? velocities : 0
    return fn(fromTo, v) as AnimateValues<FromTo>
  }

  return mapValues(fromTo, (value, key) => {
    const v =
      typeof velocities === 'number' ? velocities : velocities?.[key] ?? 0
    return fn(value as [number, number], v)
  }) as AnimateValues<FromTo>
}
