import { registerPropertyIfNeeded, t, wait } from './time'
import {
  springValue,
  springStyle,
  springVelocity,
  createSpring,
} from './spring'
import { mapValues } from './utils'

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
  completed: boolean
  promise: Promise<void>
  stop: () => void
}

export function animate<FromTo extends AnimateFromTo>(
  fromTo: FromTo,
  set: (
    values: AnimateValues<FromTo>,
    additionalStyle: Record<string, string>,
  ) => void,
  options: AnimateOptions<FromTo>,
): AnimateContext<FromTo> {
  registerPropertyIfNeeded()

  const duration = options?.duration ?? 1000
  const bounce = options?.bounce ?? 0

  const spring = createSpring({
    bounce,
    duration,
  })

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
    transition: `${t} ${duration}ms linear`,
    [t]: '1',
  })

  const startTime = performance.now()

  const ctx: AnimateContext<FromTo> = {
    promise: wait(duration).then(onEnd),
    completed: false,
    stop,

    get current() {
      if (Array.isArray(fromTo)) {
        const time = (performance.now() - startTime) / duration
        const [from, to] = fromTo
        const initialVelocity =
          typeof options.velocity === 'number' ? options.velocity : 0
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
          typeof options.velocity === 'number'
            ? options.velocity
            : (options.velocity as Record<string, number> | undefined)?.[key] ??
              0
        const fromToValue = fromTo[key]
        if (!fromToValue) {
          continue
        }

        const [from, to] = fromToValue

        Object.defineProperty(result, key, {
          configurable: true,
          enumerable: true,
          get() {
            const time = (performance.now() - startTime) / duration
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
        const time = (performance.now() - startTime) / duration
        const [from, to] = fromTo
        const initialVelocity =
          typeof options.velocity === 'number' ? options.velocity : 0

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
          typeof options.velocity === 'number'
            ? options.velocity
            : (options.velocity as Record<string, number> | undefined)?.[key] ??
              0
        const fromToValue = fromTo[key]
        if (!fromToValue) {
          continue
        }

        const [from, to] = fromToValue

        Object.defineProperty(result, key, {
          configurable: true,
          enumerable: true,
          get() {
            const time = (performance.now() - startTime) / duration
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

  function stop(): void {
    if (ctx.completed) {
      return
    }
    ctx.completed = true

    const values = (
      typeof ctx.current === 'number'
        ? `${ctx.current}px`
        : mapValues(ctx.current, (v) => `${v}px`)
    ) as AnimateValues<FromTo>

    set(values, {
      transition: '',
      [t]: '',
    })
  }

  function onEnd(): void {
    if (ctx.completed) {
      return
    }
    ctx.completed = true

    const toValues = mapFromTo(fromTo, undefined, ([_, to]) => `${to}px`)
    set(toValues, {
      transition: '',
      [t]: '',
    })
  }

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

function forceReflow(): void {
  document.body.offsetHeight
}
