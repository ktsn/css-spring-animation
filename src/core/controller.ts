import { AnimateContext, animate, AnimateValue, SpringOptions } from './animate'
import {
  ParsedStyleValue,
  interpolateParsedStyle,
  parseStyleValue,
} from './style'
import { mapValues, raf } from './utils'

export interface AnimationController<
  Style extends Record<string, AnimateValue>,
> {
  realValue: Record<keyof Style, number[]>
  realVelocity: Record<keyof Style, number[]>

  setStyle: (style: Style, animate?: boolean) => void
  setOptions: (options: SpringOptions) => void
  stop: () => void
}

interface ValueHistoryItem<Key extends keyof any> {
  value: Record<Key, number[]>
  timestamp: number
}

export function createAnimateController<
  Style extends Record<string, AnimateValue>,
>(set: (style: Record<string, string>) => void): AnimationController<Style> {
  let style: Record<keyof Style, ParsedStyleValue> | undefined
  let options: SpringOptions = {}

  let valueHistory: ValueHistoryItem<keyof Style>[] = []

  // Pseudo context for intiial state (before triggering animation)
  let ctx: AnimateContext<Record<keyof Style, number[]>> | undefined

  function calculateCurrentValues(
    next: Record<keyof Style, ParsedStyleValue>,
    prev: Record<keyof Style, ParsedStyleValue>,
  ): {
    fromTo: Record<keyof Style, [ParsedStyleValue, ParsedStyleValue]>
    velocity: Record<keyof Style, number[]>
  } {
    let velocity =
      velocityFromHistory(valueHistory, performance.now()) ??
      mapValues(next, (value) => new Array(value.values.length).fill(0))

    if (ctx && !ctx.settled) {
      const realVelocity = ctx.realVelocity
      velocity = mapValues(velocity, (value, key) => {
        return value.map((v, i) => v + (realVelocity[key]?.[i] ?? 0))
      })
    }

    const fromTo = mapValues(prev, (prevV, key) => {
      return [prevV, next[key]] as [ParsedStyleValue, ParsedStyleValue]
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

    valueHistory = []
  }

  async function setStyle(nextStyle: Style, isAnimate = true): Promise<void> {
    const parsedStyle = mapValues(nextStyle, (value) =>
      parseStyleValue(String(value)),
    )

    let prev = style
    style = parsedStyle

    if (!isAnimate || !prev) {
      if (ctx && !ctx.settled) {
        ctx.stop()
      }
      ctx = createContext(style)
      set(stringifyStyle(style))

      valueHistory.push({
        value: mapValues(style, (value) => {
          return typeof value === 'number' ? [value] : value.values
        }),
        timestamp: performance.now(),
      })
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
    valueHistory = []
  }

  function setOptions(nextOptions: SpringOptions): void {
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
      const velocity = velocityFromHistory(valueHistory, performance.now())
      if (velocity) {
        return velocity
      }

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

function velocityFromHistory<Key extends keyof any>(
  history: ValueHistoryItem<Key>[],
  baseTimestamp: number,
): Record<Key, number[]> | undefined {
  const range = history.filter((item) => {
    const from = baseTimestamp - 100
    const to = baseTimestamp
    return from <= item.timestamp && item.timestamp <= to
  })
  const last = range[range.length - 1]
  const first = range[0]
  if (last === first || !last || !first) {
    return undefined
  }

  const diff = last.timestamp - first.timestamp
  const velocity = mapValues(last.value, (value, key) => {
    return value.map((v, i) => {
      const prevValue = first.value[key]?.[i] ?? 0
      return ((v - prevValue) * 1000) / diff
    })
  })

  return velocity
}

function updateValues<Style extends Record<string, ParsedStyleValue>>(
  springValues: Style,
  values: Record<keyof Style, number[]>,
): Style {
  return mapValues(springValues, (value, key): ParsedStyleValue => {
    const newValue = values[key]
    return {
      wraps: value.wraps,
      units: value.units,
      values: newValue ?? new Array(value.values.length).fill(0),
    }
  }) as Style
}

function stringifyStyle<Style extends Record<string, ParsedStyleValue>>(
  style: Style,
): Record<keyof Style, string> {
  return mapValues(style, (value) =>
    interpolateParsedStyle(value, value.values),
  )
}

/**
 * Create a pseudo context for the state when no animation is triggered.
 * It is used for initial state and disabled state.
 */
function createContext<Style extends Record<string, ParsedStyleValue>>(
  value: Style,
): AnimateContext<Record<keyof Style, number[]>> {
  return {
    realValue: mapValues(value, (v) => v.values),
    realVelocity: mapValues(value, (v) => new Array(v.values.length).fill(0)),
    finished: true,
    settled: true,
    finishingPromise: Promise.resolve(),
    settlingPromise: Promise.resolve(),
    stop: () => {},
    stoppedDuration: 0,
  }
}
