import { AnimateContext, animate, AnimateValue, SpringOptions } from './animate'
import {
  ParsedStyleValue,
  interpolateParsedStyle,
  parseStyleValue,
} from './style'
import {
  SpringComputed,
  SpringStyleValue,
  liftToSpring,
  snapshotParsed,
} from './spring-value'
import { t } from './time'
import { mapValues } from './utils'

export interface SetStyleOptions<StyleKey extends keyof any> {
  animate?: boolean
  velocity?: Record<StyleKey, number[]>
}

export interface StopOptions {
  keepVelocity?: boolean
}

export interface AnimationController<
  Style extends Record<string, AnimateValue>,
> {
  realValue: Record<keyof Style, number[]>
  realVelocity: Record<keyof Style, number[]>

  setStyle: (
    style: Style,
    options?: SetStyleOptions<keyof Style>,
  ) => AnimateContext

  setOptions: (options: SpringOptions) => void

  stop: (options?: StopOptions) => void

  onFinishCurrent: (fn: (data: { stopped: boolean }) => void) => void
  onSettleCurrent: (fn: (data: { stopped: boolean }) => void) => void
}

interface ValueHistoryItem<Key extends PropertyKey> {
  value: Record<Key, number[]>
  timestamp: number
}

export function createAnimateController<
  Style extends Record<string, AnimateValue>,
>(set: (style: Record<string, string>) => void): AnimationController<Style> {
  /** Holding the snapshotted form of the most recently committed style */
  let style: Record<keyof Style, ParsedStyleValue> | undefined

  /** Per-slot SpringComputed for the most recently committed style */
  let liveSlots: Record<keyof Style, SpringComputed[]> | undefined

  let options: SpringOptions = {}

  let keptVelocity: Record<keyof Style, number[]> | undefined
  let valueHistory: ValueHistoryItem<keyof Style>[] = []

  // Pseudo context for initial state (before triggering animation)
  let ctx: AnimateContext | undefined

  function liveRealValue(): Record<keyof Style, number[]> {
    if (!liveSlots) {
      throw new Error('style is not set yet. Call setStyle() first.')
    }
    return mapValues(liveSlots, (slots) => slots.map((s) => s.current()))
  }

  function liveRealVelocity(): Record<keyof Style, number[]> {
    if (!liveSlots) {
      throw new Error('style is not set yet. Call setStyle() first.')
    }
    return mapValues(liveSlots, (slots) => slots.map((s) => s.velocity()))
  }

  function getRealVelocity(
    next: Record<keyof Style, { values: readonly unknown[] }>,
  ): Record<keyof Style, number[]> {
    if (keptVelocity) {
      return keptVelocity
    }

    const velocity = velocityFromHistory(valueHistory, performance.now())
    if (velocity) {
      return velocity
    }

    if (ctx && liveSlots) {
      const slotsRef = liveSlots
      return mapValues(next, (value, key) => {
        const keySlots = slotsRef[key]
        return value.values.map((_, i) => keySlots?.[i]?.velocity() ?? 0)
      })
    }

    return mapValues(next, (value) => new Array(value.values.length).fill(0))
  }

  function stop({ keepVelocity }: StopOptions = {}): void {
    keptVelocity = keepVelocity && liveSlots ? liveRealVelocity() : undefined

    if (ctx && !ctx.settled) {
      ctx.stop()
    }

    if (style) {
      style = liveSlots ? updateValues(style, liveRealValue()) : style
      ctx = createContext()
    }

    valueHistory = []
  }

  function setStyle(
    nextStyle: Style,
    params: SetStyleOptions<keyof Style> = {},
  ): AnimateContext {
    const isAnimate = params.animate ?? true

    const wrappedParsedStyle: Record<keyof Style, SpringStyleValue> = mapValues(
      nextStyle,
      (value): SpringStyleValue =>
        typeof value === 'object'
          ? value
          : liftToSpring(parseStyleValue(String(value))),
    )

    const parsedStyleSnap = mapValues(wrappedParsedStyle, snapshotParsed)

    if (style && isSameStyle(style, parsedStyleSnap)) {
      return ctx ?? createContext()
    }

    const newSlots = mapValues(wrappedParsedStyle, (p) => p.values)

    const inferredVelocity =
      params.velocity ?? getRealVelocity(wrappedParsedStyle)

    // Write inferred velocity onto every new slot
    for (const key in wrappedParsedStyle) {
      const styleKey = key as keyof Style
      wrappedParsedStyle[styleKey].values.forEach((slot, slotIndex) => {
        slot.setVelocity(inferredVelocity[styleKey]?.[slotIndex] ?? 0)
      })
    }

    let prev = style
    style = parsedStyleSnap

    if (!isAnimate || !prev) {
      if (ctx && !ctx.settled) {
        ctx.stop()
      }
      liveSlots = newSlots
      ctx = createContext()
      set({
        ...stringifyStyle(style),
        transition: '',
        [t]: '',
      })

      if (!keptVelocity) {
        valueHistory.push({
          value: mapValues(style, (s) => s.values),
          timestamp: performance.now(),
        })
      }

      return ctx
    }

    // Capture the current animating values from the old slots before we
    // hand off to the new ones — those become the `from` side of the new
    // animation.
    if (ctx && !ctx.settled && liveSlots) {
      prev = updateValues(prev, liveRealValue())
    }

    liveSlots = newSlots

    const fromTo = mapValues(wrappedParsedStyle, (toV, key) => {
      // Pass `prev` as an interpolated string rather than a lifted
      // SpringStyleValue so animate() can tell that the `from` side is
      // controller-internal (not a user-provided SpringValue) and won't
      // pull velocity from its fresh wrappers.
      const prevValue = prev![key]
      return [interpolateParsedStyle(prevValue, prevValue.values), toV] as [
        string,
        SpringStyleValue,
      ]
    })

    if (ctx && !ctx.settled) {
      ctx.stop()
    }

    ctx = animate(fromTo, set, {
      ...options,
      velocity: inferredVelocity,
    })
    keptVelocity = undefined
    valueHistory = []

    return ctx
  }

  function setOptions(nextOptions: SpringOptions): void {
    options = nextOptions
  }

  function onFinishCurrent(fn: (data: { stopped: boolean }) => void): void {
    if (!ctx) {
      fn({ stopped: false })
      return
    }

    // Must store ctx to local variable because ctx in the callback of `then` can be
    // different from when the time onFinishCurrent
    const _ctx = ctx
    _ctx.finishingPromise.then(() => {
      fn({ stopped: _ctx.stoppedDuration !== undefined })
    })
  }

  function onSettleCurrent(fn: (data: { stopped: boolean }) => void): void {
    if (!ctx) {
      fn({ stopped: false })
      return
    }

    // Must store ctx to local variable because ctx in the callback of `then` can be
    // different from when the time onFinishCurrent
    const _ctx = ctx
    _ctx.settlingPromise.then(() => {
      fn({ stopped: _ctx.stoppedDuration !== undefined })
    })
  }

  return {
    get realValue() {
      return liveRealValue()
    },

    get realVelocity() {
      if (!style) {
        throw new Error('style is not set yet. Call setStyle() first.')
      }

      return getRealVelocity(style)
    },

    stop,
    setStyle,
    setOptions,
    onFinishCurrent,
    onSettleCurrent,
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
 * Create a pseudo context for the state when no animation is running.
 */
function createContext(): AnimateContext {
  return {
    finished: true,
    settled: true,
    finishingPromise: Promise.resolve(),
    settlingPromise: Promise.resolve(),
    stop: () => {},
    stoppedDuration: 0,
  }
}

export function isSameStyle<
  Style extends Record<
    string,
    number | string | { values: readonly unknown[] }
  >,
>(a: Style, b: Style): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])

  return Array.from(keys).every((key) => {
    const aValue = a[key]
    const bValue = b[key]

    if (typeof aValue !== 'object' || typeof bValue !== 'object') {
      return aValue === bValue
    }

    const aValues = aValue.values
    const bValues = bValue.values
    return (
      aValues.length === bValues.length &&
      aValues.every((value, i) => value === bValues[i])
    )
  })
}
