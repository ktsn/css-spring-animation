import { registerPropertyIfNeeded, t, wait } from './time'
import { createSpringStyle } from './spring'

export interface AnimateOptions<Values> {
  velocity?: Partial<AnimateVelocities<Values>>
  duration?: number
  bounce?: number
}

export type AnimateFromTo = [string, string] | Record<string, [string, string]>

export type AnimateVelocities<Values = unknown> =
  | number
  | { [K in keyof Values]: number }

export type AnimateValues<Values = unknown> = Values extends Record<
  string,
  unknown
>
  ? { [K in keyof Values]: string }
  : string

export async function animate<FromTo extends AnimateFromTo>(
  fromTo: FromTo,
  set: (
    values: AnimateValues<FromTo>,
    additionalStyle: Record<string, string>,
  ) => void,
  options: AnimateOptions<FromTo>,
): Promise<void> {
  registerPropertyIfNeeded()

  const duration = options?.duration ?? 1000
  const bounce = options?.bounce ?? 0

  const values = mapFromTo(fromTo, options.velocity, ([from, to], velocity) => {
    return createSpringStyle(from, to, bounce, velocity)
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

  await wait(duration)

  const toValues = mapFromTo(fromTo, undefined, ([_, to]) => to)
  set(toValues, {
    transition: '',
    [t]: '',
  })
}

function mapFromTo<FromTo extends AnimateFromTo>(
  fromTo: FromTo,
  velocities: Partial<AnimateVelocities<FromTo>> | undefined,
  fn: (value: [string, string], velocity: number) => string,
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
