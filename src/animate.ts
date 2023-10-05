import { registerPropertyIfNeeded, t, wait } from './time'
import { calcSpringValue, createSpringStyle, springVelocity } from './spring'

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

interface AnimateContextInner<FromTo> extends AnimateContext<FromTo> {
  __onEnd: () => void
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

  const values = mapFromTo(fromTo, options.velocity, ([from, to], velocity) => {
    return createSpringStyle({
      from,
      to,
      bounce,
      duration,
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

  const ctx: AnimateContextInner<FromTo> = {
    __onEnd: onEnd,
    promise: wait(duration).then(onEnd),
    completed: false,
    stop,

    get current() {
      if (Array.isArray(fromTo)) {
        const time = (performance.now() - startTime) / duration
        const [from, to] = fromTo
        const initialVelocity =
          typeof options.velocity === 'number' ? options.velocity : 0
        return calcSpringValue({
          from,
          to,
          bounce,
          initialVelocity,
          duration,
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
            return calcSpringValue({
              from,
              to,
              bounce,
              initialVelocity,
              duration,
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

        return springVelocity({
          time,
          from,
          to,
          bounce,
          duration,
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
            return springVelocity({
              time,
              from,
              to,
              bounce,
              duration,
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
        : Object.fromEntries(
            Object.entries(ctx.current).map(([k, v]) => [k, `${v}px`]),
          )
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

  return Object.fromEntries(
    Object.entries(fromTo).map(([key, value]) => {
      const k = key as keyof FromTo
      const v =
        typeof velocities === 'number' ? velocities : velocities?.[k] ?? 0
      return [key, fn(value, v)]
    }),
  ) as AnimateValues<FromTo>
}

function forceReflow(): void {
  document.body.offsetHeight
}
