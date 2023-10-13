import {
  AnimateContext,
  AnimateOptions,
  animate,
  AnimateValue,
} from './animate'
import { stringifyInterpolatedStyle } from './style'
import { mapValues, raf } from './utils'

export interface AnimationController<
  Style extends Record<string, AnimateValue>,
> {
  realValue: Record<keyof Style, number[]>
  realVelocity: Record<keyof Style, number[]>

  setStyle: (style: Style, animate?: boolean) => void
  setOptions: (options: AnimateOptions<Record<keyof Style, number[]>>) => void
  stop: () => void
}

export function createAnimateController<
  Style extends Record<string, AnimateValue>,
>(set: (style: Record<string, string>) => void): AnimationController<Style> {
  let style: Style | undefined
  let options: AnimateOptions<Record<keyof Style, number[]>> = {}

  // Pseudo context for intiial state (before triggering animation)
  let ctx: AnimateContext<Record<keyof Style, number[]>> | undefined

  function calculateCurrentValues(
    next: Style,
    prev: Style,
  ): {
    fromTo: Record<keyof Style, [AnimateValue, AnimateValue]>
    velocity: Record<keyof Style, number[]>
  } {
    const velocityOption = options?.velocity

    let velocity = mapValues(next, (value, key) => {
      const valueList = typeof value === 'number' ? [value] : value.values
      return valueList.map((_, i) => {
        return velocityOption?.[key]?.[i] ?? 0
      })
    })

    if (ctx && !ctx.settled) {
      const realVelocity = ctx.realVelocity
      velocity = mapValues(velocity, (value, key) => {
        return value.map((v, i) => v + (realVelocity[key]?.[i] ?? 0))
      })
    }

    const fromTo = mapValues(prev, (prevV, key) => {
      return [prevV, next[key]] as [AnimateValue, AnimateValue]
    })

    return {
      fromTo,
      velocity,
    }
  }

  function stop(): void {
    if (ctx && !ctx.settled) {
      ctx.stop()
    }

    if (style) {
      style = ctx ? updateValues(style, ctx.realValue) : style
      ctx = createContext(style)
      set(stringifyStyle(style))
    }
  }

  async function setStyle(nextStyle: Style, isAnimate = true): Promise<void> {
    let prev = style
    style = nextStyle

    if (!isAnimate || !prev) {
      if (ctx && !ctx.settled) {
        ctx.stop()
      }
      ctx = createContext(style)
      set(stringifyStyle(style))
      return
    }

    if (ctx && !ctx.settled) {
      prev = updateValues(prev, ctx.realValue)
    }

    const { fromTo, velocity } = calculateCurrentValues(style, prev)

    if (ctx && !ctx.settled) {
      ctx.stop()
      await raf()
    }

    ctx = animate(fromTo, set, {
      ...options,
      velocity,
    })
  }

  function setOptions(
    nextOptions: AnimateOptions<Record<keyof Style, number[]>>,
  ): void {
    options = nextOptions
  }

  return {
    get realValue() {
      if (ctx) {
        return ctx.realValue
      }

      if (style) {
        return mapValues(style, (value) => {
          return typeof value === 'number' ? [value] : value.values
        })
      }

      throw new Error('style is not set yet. Call setStyle() first.')
    },

    get realVelocity() {
      if (ctx) {
        return ctx.realVelocity
      }

      if (style) {
        return mapValues(style, (value) => {
          const values = typeof value === 'number' ? [value] : value.values
          return [...values].fill(0)
        })
      }

      throw new Error('style is not set yet. Call setStyle() first.')
    },

    stop,
    setStyle,
    setOptions,
  }
}

function updateValues<Style extends Record<string, AnimateValue>>(
  springValues: Style,
  values: Record<keyof Style, number[]>,
): Style {
  return mapValues(springValues, (value, key): AnimateValue => {
    const newValue = values[key]
    if (typeof value === 'number') {
      return newValue?.[0] ?? 0
    }

    return {
      strings: value.strings,
      units: value.units,
      values: newValue ?? [...value.values].fill(0),
    }
  }) as Style
}

function stringifyStyle<Style extends Record<string, AnimateValue>>(
  style: Style,
): Record<keyof Style, string> {
  return mapValues(style, (value) => {
    return typeof value === 'number'
      ? String(value)
      : stringifyInterpolatedStyle(value, value.values)
  })
}

/**
 * Create a pseudo context for the state when no animation is triggered.
 * It is used for initial state and disabled state.
 */
function createContext<Style extends Record<string, AnimateValue>>(
  value: Style,
): AnimateContext<Record<keyof Style, number[]>> {
  return {
    realValue: mapValues(value, (v) => {
      return typeof v === 'number' ? [v] : v.values
    }),
    realVelocity: mapValues(value, (_, key) => {
      const property = value[key] ?? 0
      const values = typeof property === 'number' ? [property] : property.values
      return [...values].fill(0)
    }),
    finished: true,
    settled: true,
    finishingPromise: Promise.resolve(),
    settlingPromise: Promise.resolve(),
    stop: () => {},
    stoppedDuration: 0,
  }
}
