import {
  AnimateContext,
  AnimateValue,
  AnimationTarget,
  SpringOptions,
  animate,
} from './animate'
import { writeStyle } from './utils'
import {
  ParsedStyleValue,
  StyleValue,
  interpolateParsedStyle,
  parseStyleValue,
} from './style'
import {
  SpringComputed,
  SpringStyleValue,
  liftToSpringStyle,
  snapshotSpringStyle,
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
  setStyle: (
    style: Style,
    options?: SetStyleOptions<keyof Style>,
  ) => AnimateContext

  setOptions: (options: SpringOptions) => void

  stop: (options?: StopOptions) => void

  onFinishCurrent: (fn: (data: { stopped: boolean }) => void) => void
  onSettleCurrent: (fn: (data: { stopped: boolean }) => void) => void

  dispose: () => void
}

interface ValueHistoryItem<Key extends PropertyKey> {
  value: Record<Key, number[]>
  timestamp: number
}

export function createAnimateController<
  Style extends Record<string, AnimateValue>,
>(target: AnimationTarget): AnimationController<Style> {
  /** Holding the snapshotted form of the most recently committed style */
  let style: Record<keyof Style, ParsedStyleValue> | undefined

  /** Per-slot SpringComputed for the most recently committed style */
  let liveSlots: Record<keyof Style, SpringComputed[]> | undefined

  let options: SpringOptions = {}

  let keptVelocity: Record<keyof Style, number[]> | undefined
  let valueHistory: ValueHistoryItem<keyof Style>[] = []

  // Pseudo context for initial state (before triggering animation)
  let ctx: AnimateContext | undefined

  function liveRealValue(
    slots: Record<keyof Style, SpringComputed[]>,
  ): Record<keyof Style, number[]> {
    return mapValues(slots, (s) => s.map((v) => v.current()))
  }

  function liveRealVelocity(
    slots: Record<keyof Style, SpringComputed[]>,
  ): Record<keyof Style, number[]> {
    return mapValues(slots, (s) => s.map((v) => v.velocity()))
  }

  function getRealVelocity(
    next: Record<keyof Style, StyleValue<unknown>>,
  ): Record<keyof Style, number[]> {
    if (keptVelocity) {
      return keptVelocity
    }

    const velocity = velocityFromHistory(valueHistory, performance.now())
    if (velocity) {
      return velocity
    }

    if (liveSlots) {
      const slotsRef = liveSlots
      return mapValues(next, (value, key) => {
        const keySlots = slotsRef[key]
        return value.values.map((_, i) => keySlots?.[i]?.velocity() ?? 0)
      })
    }

    return mapValues(next, (value) => new Array(value.values.length).fill(0))
  }

  function commitStaticStyle(
    parsed: Record<keyof Style, ParsedStyleValue>,
  ): void {
    for (const key in parsed) {
      writeStyle(
        target,
        key,
        interpolateParsedStyle(parsed[key], parsed[key].values),
      )
    }
    target.style.removeProperty(t)
  }

  function stop({ keepVelocity }: StopOptions = {}): void {
    keptVelocity =
      keepVelocity && liveSlots ? liveRealVelocity(liveSlots) : undefined

    if (ctx && !ctx.settled) {
      ctx.stop()
    }

    if (style) {
      style = liveSlots ? updateValues(style, liveRealValue(liveSlots)) : style
      ctx = createPseudoContext()
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
          : liftToSpringStyle(parseStyleValue(String(value))),
    )

    const parsedStyleSnap = mapValues(wrappedParsedStyle, snapshotSpringStyle)

    if (style && isSameStyle(style, parsedStyleSnap)) {
      return ctx ?? createPseudoContext()
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
      ctx = createPseudoContext()
      commitStaticStyle(style)

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
      prev = updateValues(prev, liveRealValue(liveSlots))
    }

    liveSlots = newSlots

    // Pass `prev` as interpolated strings rather than lifted
    // SpringStyleValues so animate() can tell that the `from` side is
    // controller-internal (not a user-provided SpringValue) and won't
    // pull velocity from its fresh wrappers.
    const fromStyle = mapValues(prev, (prevValue) => {
      return interpolateParsedStyle(prevValue, prevValue.values)
    })

    if (ctx && !ctx.settled) {
      ctx.stop()
    }

    ctx = animate(target, [fromStyle, wrappedParsedStyle], options)
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

  function dispose(): void {
    if (ctx && !ctx.settled) {
      ctx.stop()
    }
    ctx = undefined
    style = undefined
    liveSlots = undefined
    keptVelocity = undefined
    valueHistory = []
  }

  return {
    stop,
    setStyle,
    setOptions,
    onFinishCurrent,
    onSettleCurrent,
    dispose,
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

/**
 * Create a pseudo context for the state when no animation is running.
 */
function createPseudoContext(): AnimateContext {
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
  Style extends Record<string, number | string | StyleValue<unknown>>,
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
