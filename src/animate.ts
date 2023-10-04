import {
  registerPropertyIfNeeded,
  setTimeProperty,
  setTimeTransition,
  waitForTimeTransition,
} from './time'
import { createSpringStyle } from './spring'

export interface AnimateOptions<Values extends AnimateFromTo> {
  velocity?: Partial<AnimateVelocities<Values>>
  duration?: number
  bounce?: number
}

export type AnimateFromTo = [string, string] | Record<string, [string, string]>

export type AnimateVelocities<FromTo extends AnimateFromTo = AnimateFromTo> =
  FromTo extends [string, string] ? number : { [K in keyof FromTo]: number }

export type AnimateValues<FromTo extends AnimateFromTo = AnimateFromTo> =
  FromTo extends [string, string] ? string : { [K in keyof FromTo]: string }

/**
 * https://developer.apple.com/videos/play/wwdc2023/10158/
 */
export function animate<E extends HTMLElement, FromTo extends AnimateFromTo>(
  el: E,
  fromTo: FromTo,
  set: (el: E, values: AnimateValues<FromTo>) => void,
  options: AnimateOptions<FromTo>,
): Promise<void> {
  registerPropertyIfNeeded()

  const duration = options?.duration ?? 1000
  const bounce = options?.bounce ?? 0

  const originalTransition = el.style.transition

  el.style.transition = 'none'
  setTimeProperty(el, 0)

  const values = mapFromTo(fromTo, options.velocity, ([from, to], velocity) => {
    return createSpringStyle(from, to, bounce, velocity)
  })
  set(el, values)

  forceReflow()

  setTimeTransition(el, duration)
  setTimeProperty(el, 1)

  return new Promise((resolve) => {
    waitForTimeTransition(el, () => {
      const values = mapFromTo(fromTo, undefined, ([_, to]) => to)
      set(el, values)

      el.style.transition = originalTransition
      setTimeProperty(el, null)
      resolve()
    })
  })
}

function mapFromTo<FromTo extends AnimateFromTo>(
  fromTo: FromTo,
  velocities: Partial<AnimateVelocities<FromTo>> | undefined,
  fn: (value: [string, string], velocity: number) => string,
): AnimateValues<FromTo> {
  if (Array.isArray(fromTo)) {
    return fn(fromTo, (velocities ?? 0) as number) as AnimateValues<FromTo>
  }

  return Object.fromEntries(
    Object.entries(fromTo).map(([key, value]) => {
      const velocity =
        (velocities as Record<string, number> | undefined)?.[key] ?? 0
      return [key, fn(value, velocity)]
    }),
  ) as AnimateValues<FromTo>
}

function forceReflow(): void {
  document.body.offsetHeight
}
