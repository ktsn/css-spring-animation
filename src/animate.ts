import { registerPropertyIfNeeded, t, wait } from './time'
import {
  springValue,
  springStyle,
  springVelocity,
  createSpring,
  springSettlingDuration,
  Spring,
} from './spring'
import { forceReflow, isBrowserSupported, mapValues } from './utils'

export interface AnimateOptions<
  Velocity extends Partial<MaybeRecord<string, number>>,
> {
  velocity?: Velocity
  duration?: number
  bounce?: number
}

export type MaybeRecord<K extends keyof any, V> = V | Record<K, V>

export interface AnimateContext<Values extends MaybeRecord<string, number>> {
  current: Values
  velocity: Values
  finished: boolean
  settled: boolean
  finishingPromise: Promise<void>
  settlingPromise: Promise<void>
  stop: () => void
}

// Animate a single value.
export function animate(
  fromTo: [number, number],
  set: (values: string, additionalStyle: Record<string, string>) => void,
  options?: AnimateOptions<number>,
): AnimateContext<number>

// Animate multiple values in an object.
export function animate<FromTo extends Record<string, [number, number]>>(
  fromTo: FromTo,
  set: (
    values: Record<keyof FromTo, string>,
    additionalStyle: Record<string, string>,
  ) => void,
  options?: AnimateOptions<Partial<Record<keyof FromTo, number>>>,
): AnimateContext<Record<keyof FromTo, number>>

export function animate(
  fromTo: MaybeRecord<string, [number, number]>,
  set: (values: any, additionalStyle: Record<string, string>) => void,
  options: AnimateOptions<any> = {},
): AnimateContext<MaybeRecord<string, number>> {
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
      context: ctx,
      set,
    })
  }

  ctx.settlingPromise.then(() => {
    const values =
      typeof ctx.current === 'number'
        ? `${ctx.current}px`
        : mapValues(ctx.current, (v) => `${v}px`)

    set(values, {
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
  fromTo: MaybeRecord<string, [number, number]>
  velocity: Partial<MaybeRecord<string, number>> | undefined
  duration: number
  settlingDuration: number
  set: (values: any, additionalStyle: Record<string, string>) => void
}): void {
  registerPropertyIfNeeded()

  const values = mapFromTo(fromTo, velocity, ([from, to], velocity) => {
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
}

function animateWithRaf({
  context,
  set,
}: {
  context: AnimateContext<any>
  set: (values: any, additionalStyle: Record<string, string>) => void
}): void {
  function render(): void {
    if (context.settled) {
      return
    }

    const values =
      typeof context.current === 'number'
        ? `${context.current}px`
        : mapValues(context.current, (v) => `${v}px`)

    set(values, {
      transition: 'none',
    })

    requestAnimationFrame(render)
  }

  requestAnimationFrame(render)
}

function createContext({
  spring,
  fromTo,
  velocity,
  startTime,
  duration,
  settlingDuration,
}: {
  spring: Spring
  fromTo: MaybeRecord<string, [number, number]>
  velocity: Partial<MaybeRecord<string, number>> | undefined
  startTime: number
  duration: number
  settlingDuration: number
}): AnimateContext<any> {
  const forceResolve: { fn: (() => void)[] } = { fn: [] }

  function stop() {
    if (ctx.settled) {
      return
    }
    ctx.finished = ctx.settled = true
    forceResolve.fn.forEach((fn) => fn())
  }

  const ctx: AnimateContext<any> = {
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
          return to
        }

        const time = elapsed / duration
        const initialVelocity = typeof velocity === 'number' ? velocity : 0
        return springValue(spring, {
          from,
          to,
          initialVelocity,
          time,
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

      return result
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

      return result
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

function mapFromTo(
  fromTo: MaybeRecord<string, [number, number]>,
  velocities: Partial<MaybeRecord<string, number>> | undefined,
  fn: (value: [number, number], velocity: number) => string,
): MaybeRecord<string, string> {
  if (Array.isArray(fromTo)) {
    const v = typeof velocities === 'number' ? velocities : 0
    return fn(fromTo, v)
  }

  return mapValues(fromTo, (value, key) => {
    const v =
      typeof velocities === 'number' ? velocities : velocities?.[key] ?? 0
    return fn(value as [number, number], v)
  })
}
