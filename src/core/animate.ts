import {
  generateSpringExpressionStyle,
  createSpring,
  springSettlingDuration,
  springEasingFn,
  Spring,
} from './spring'
import {
  SpringComputed,
  SpringStyleValue,
  attachSpringValue,
  liftToSpringStyle,
  snapshotSpringStyle,
} from './spring-value'
import {
  ParsedStyleValue,
  completeParsedStyleUnit,
  interpolateParsedStyle,
  parseStyleValue,
} from './style'
import { registerPropertyIfNeeded, t, wait } from './time'
import {
  clearStyle,
  isCssLinearTimingFunctionSupported,
  isCssMathAnimationSupported,
  isWebAnimationsApiSupported,
  mapValues,
  readStyle,
  writeStyle,
  zip,
} from './utils'

export type AnimationTarget = HTMLElement | SVGElement

export type AnimateValue = number | string | SpringStyleValue

export interface SpringOptions {
  duration?: number
  bounce?: number
}

export interface AnimateContext {
  finished: boolean
  settled: boolean

  finishingPromise: Promise<void>
  settlingPromise: Promise<void>

  stop: () => void
  stoppedDuration: number | undefined
}

export function animate<
  From extends Record<string, AnimateValue | null | undefined>,
  To extends Record<string, AnimateValue | null | undefined>,
>(target: AnimationTarget, fromTo: [To] | [From, To], options: SpringOptions = {}): AnimateContext {
  const [rawFrom, rawTo] = fromTo.length === 1 ? [{} as From, fromTo[0]] : fromTo
  const { fromInput, toInput } = resolveMissingEntries(target, rawFrom, rawTo)

  // Each slot — whether the user passed a SpringValue or a plain number —
  // is routed through a `SpringComputed`. Numeric slots get a fresh wrapper
  // so the rest of the evaluation pipeline is uniform.
  const slots: Record<string, SpringComputed[]> = {}

  // Mirror of `slots` for the `from` side. When the user passes a
  // SpringValue to `from`, this lets us attach it to the same Attachment
  // as the `to` slot so both follow the same animation.
  const fromSlots: Record<string, SpringComputed[]> = {}

  const slotVelocities: Record<string, number[]> = {}

  const parsedFromTo = mapValues(toInput, (to, key) => {
    const from = fromInput[key]!
    const fromIsUserSpring = typeof from === 'object'
    const toIsUserSpring = typeof to === 'object'

    const liftedFrom: SpringStyleValue = fromIsUserSpring
      ? from
      : liftToSpringStyle(parseStyleValue(String(from)))
    const liftedTo: SpringStyleValue = toIsUserSpring
      ? to
      : liftToSpringStyle(parseStyleValue(String(to)))

    slots[key] = liftedTo.values
    fromSlots[key] = liftedFrom.values

    // Choose initial velocity prioritized by follows:
    // 1. user-provided `from` SpringValue's velocity
    // 2. user-provided `to` SpringValue's velocity
    slotVelocities[key] = liftedTo.values.map((toSlot, i) => {
      const fromSlot = liftedFrom.values[i]
      if (fromIsUserSpring && fromSlot) return fromSlot.velocity()
      if (toIsUserSpring) return toSlot.velocity()
      return 0
    })

    return [snapshotSpringStyle(liftedFrom), snapshotSpringStyle(liftedTo)] as [
      ParsedStyleValue,
      ParsedStyleValue,
    ]
  })

  const resolvedFromTo = resolveUnitMismatches(target, parsedFromTo)

  const duration = options.duration ?? 1000
  const bounce = options.bounce ?? 0

  const spring = createSpring({
    bounce,
    duration,
  })

  const inputValues = groupInputValues(resolvedFromTo, slotVelocities)

  const settlingDurationList = Object.values(inputValues).flatMap((values) => {
    return values.map(({ from, to, velocity }) => {
      return springSettlingDuration(spring, {
        from,
        to,
        initialVelocity: velocity,
      })
    })
  })

  const settlingDuration = Math.max(...settlingDurationList)

  const startTime = performance.now()

  const animations: Animation[] = []

  const ctx = createContext({
    target,
    slots,
    fromTo: resolvedFromTo,
    startTime,
    duration,
    settlingDuration,
    animations,
  })

  // Attach animation info to every slot's SpringComputed.
  for (const key in slots) {
    const [from, to] = resolvedFromTo[key]!
    // The unit each slot is actually rendered in.
    // so a captured live value can be tagged with its resolved unit.
    const renderUnits = completeParsedStyleUnit(to, from).units

    slots[key]!.forEach((slot, slotIndex) => {
      const v = inputValues[key]?.[slotIndex]
      if (!v) return
      const attachment = {
        spring,
        from: v.from,
        to: v.to,
        initialVelocity: v.velocity,
        startTime,
        duration,
        ctx,
        unit: renderUnits[slotIndex] ?? '',
      }
      attachSpringValue(slot, attachment)
      const fromSlot = fromSlots[key]?.[slotIndex]
      if (fromSlot && fromSlot !== slot) {
        attachSpringValue(fromSlot, attachment)
      }
    })
  }

  const waapi = isWebAnimationsApiSupported()

  if (
    waapi &&
    isCssLinearTimingFunctionSupported() &&
    canUseLinearTimingFunction(resolvedFromTo, slotVelocities)
  ) {
    animations.push(
      ...animateWithPerPropertyEasing({
        target,
        spring,
        fromTo: resolvedFromTo,
        inputValues,
        settlingDuration,
      }),
    )
  } else if (waapi && isCssMathAnimationSupported()) {
    animations.push(
      ...animateWithProxyTimeVariable({
        target,
        spring,
        fromTo: resolvedFromTo,
        inputValues,
        duration,
        settlingDuration,
      }),
    )
  } else {
    // Graceful degradation for environments without WAAPI / linear() / CSS math.
    animateWithRaf({
      target,
      fromTo: resolvedFromTo,
      slots,
      ctx,
    })
  }

  return ctx
}

interface InputValueGroup {
  from: number
  to: number
  velocity: number
}

function groupInputValues<FromTo extends Record<string, [ParsedStyleValue, ParsedStyleValue]>>(
  fromTo: FromTo,
  velocity: Record<keyof FromTo, number[]>,
): Record<keyof FromTo, InputValueGroup[]> {
  return mapValues(fromTo, ([from, to], key) => {
    return zip(from.values, to.values).map(([from, to], i) => {
      return {
        from,
        to,
        velocity: velocity[key]?.[i] ?? 0,
      }
    })
  })
}

/**
 * Check if the animation can be done with linear() timing function.
 * The animation can be done with linear() timing function if:
 * - All the velocities in the same property are zero or
 * - Only one value will be animated in the same property.
 */
function canUseLinearTimingFunction(
  fromTo: Record<string, [ParsedStyleValue, ParsedStyleValue]>,
  velocity: Record<string, number[]>,
): boolean {
  return Object.keys(fromTo).every((key) => {
    const [from, to] = fromTo[key]!
    const velocities = velocity[key]

    if (!velocities || velocities.every((v) => v === 0)) {
      return true
    }

    const animatedValues = zip(from.values, to.values).filter(([from, to]) => {
      return from !== to
    })
    if (animatedValues.length <= 1) {
      return true
    }

    return false
  })
}

function animateWithPerPropertyEasing({
  target,
  spring,
  fromTo,
  inputValues,
  settlingDuration,
}: {
  target: AnimationTarget
  spring: Spring
  fromTo: Record<string, [ParsedStyleValue, ParsedStyleValue]>
  inputValues: Record<string, InputValueGroup[]>
  settlingDuration: number
}): Animation[] {
  const animations: Animation[] = []

  for (const key of Object.keys(fromTo)) {
    const [from, to] = fromTo[key]!

    if (from.values.length !== to.values.length) {
      // Skip animation if the value is not consistent
      writeStyle(target, key, interpolateParsedStyle(to, to.values))
      continue
    }

    const completedTo = completeParsedStyleUnit(to, from)
    const fromStr = interpolateParsedStyle(from, from.values)
    const toStr = interpolateParsedStyle(completedTo, completedTo.values)

    const values = inputValues[key]!
    const normalizedVelocity = values.reduce<number | undefined>((acc, { from, to, velocity }) => {
      if (acc !== undefined) {
        return acc
      }

      if (from === to) {
        return undefined
      }

      return velocity / (to - from)
    }, undefined)

    const easing = springEasingFn({
      spring,
      settlingDuration,
      normalizedVelocity: normalizedVelocity ?? 0,
    })

    const a = target.animate([keyframeFor(key, fromStr), keyframeFor(key, toStr)], {
      duration: settlingDuration,
      easing,
      fill: 'forwards',
    })
    animations.push(a)
  }

  return animations
}

function animateWithProxyTimeVariable({
  target,
  spring,
  fromTo,
  inputValues,
  duration,
  settlingDuration,
}: {
  target: AnimationTarget
  spring: Spring
  fromTo: Record<string, [ParsedStyleValue, ParsedStyleValue]>
  inputValues: Record<string, InputValueGroup[]>
  duration: number
  settlingDuration: number
}): Animation[] {
  registerPropertyIfNeeded()

  for (const key of Object.keys(fromTo)) {
    const [from, to] = fromTo[key]!

    if (from.values.length !== to.values.length) {
      writeStyle(target, key, interpolateParsedStyle(to, to.values))
      continue
    }

    const values = inputValues[key]!
    const exprValues = values.map(({ from, to, velocity }) =>
      generateSpringExpressionStyle(spring, {
        from,
        to,
        initialVelocity: velocity,
      }),
    )
    const completedTo = completeParsedStyleUnit(to, from)
    writeStyle(target, key, interpolateParsedStyle(completedTo, exprValues))
  }

  target.style.setProperty(t, '0')

  const a = target.animate([{ [t]: '0' }, { [t]: String(settlingDuration / duration) }], {
    duration: settlingDuration,
    easing: 'linear',
    fill: 'forwards',
  })
  return [a]
}

function animateWithRaf({
  target,
  fromTo,
  slots,
  ctx,
}: {
  target: AnimationTarget
  fromTo: Record<string, [ParsedStyleValue, ParsedStyleValue]>
  slots: Record<string, SpringComputed[]>
  ctx: AnimateContext
}): void {
  function render(): void {
    if (ctx.settled) {
      return
    }

    for (const key in fromTo) {
      const [from, to] = fromTo[key]!
      const keySlots = slots[key]
      if (!keySlots) continue

      if (from.values.length !== to.values.length) {
        writeStyle(target, key, interpolateParsedStyle(to, to.values))
        continue
      }

      const completedTo = completeParsedStyleUnit(to, from)
      const realValue = keySlots.map((s) => s.current())
      writeStyle(target, key, interpolateParsedStyle(completedTo, realValue))
    }

    requestAnimationFrame(render)
  }

  render()
}

function createContext<FromTo extends Record<string, [ParsedStyleValue, ParsedStyleValue]>>({
  target,
  slots,
  fromTo,
  startTime,
  duration,
  settlingDuration,
  animations,
}: {
  target: AnimationTarget
  slots: Record<keyof FromTo, SpringComputed[]>
  fromTo: FromTo
  startTime: number
  duration: number
  settlingDuration: number
  animations: Animation[]
}): AnimateContext {
  const forceResolve: { fn: (() => void)[] } = { fn: [] }

  function stop() {
    if (ctx.settled) {
      return
    }
    ctx.finished = ctx.settled = true
    ctx.stoppedDuration = performance.now() - startTime
    cancelAnimations()
    setRealStyle()
    forceResolve.fn.forEach((fn) => fn())
  }

  function cancelAnimations() {
    for (const a of animations) {
      try {
        a.cancel()
      } catch {
        // ignore — already cancelled or implementation-specific quirk
      }
    }
  }

  function setRealStyle() {
    for (const key in fromTo) {
      const [from, to] = fromTo[key]!
      const keySlots = slots[key]
      if (!keySlots) continue

      const completedTo = completeParsedStyleUnit(to, from)
      const realValue = keySlots.map((s) => s.current())
      writeStyle(target, key, interpolateParsedStyle(completedTo, realValue))
    }
    target.style.removeProperty(t)
  }

  const ctx: AnimateContext = {
    finishingPromise: wait(duration + 1, forceResolve).then(() => {
      ctx.finished = true
    }),

    settlingPromise: wait(settlingDuration + 1, forceResolve).then(() => {
      ctx.finished = ctx.settled = true

      if (ctx.stoppedDuration === undefined) {
        cancelAnimations()
        setRealStyle()
      }
    }),

    finished: false,
    settled: false,

    stop,
    stoppedDuration: undefined,
  }

  return ctx
}

function keyframeFor(key: string, value: string): Keyframe {
  return { [key]: value } as Keyframe
}

/**
 * Return the keys that exist (non-null) in `a` but are missing (null /
 * undefined / absent) in `b`.
 */
function diffKeys<T>(
  a: Record<string, T | null | undefined>,
  b: Record<string, T | null | undefined>,
): string[] {
  return Object.keys(a).filter((k) => a[k] != null && b[k] == null)
}

/**
 * Temporarily clear the inline styles for `keys` on `target`, run `callback`,
 * then restore the original inline values. The callback receives the live
 * `CSSStyleDeclaration` so it can read computed values that no longer reflect
 * the inline overrides.
 */
function withClearedInlineStyles(
  target: AnimationTarget,
  keys: string[],
  callback: (computed: CSSStyleDeclaration) => void,
): void {
  const savedInline = keys.map((k) => [k, readStyle(target.style, k)] as const)

  for (const key of keys) {
    clearStyle(target, key)
  }

  callback(getComputedStyle(target))

  for (const [key, value] of savedInline) {
    if (value !== '') {
      writeStyle(target, key, value)
    }
  }
}

/**
 * Fill in entries that are missing from one side of `[from, to]` by reading
 * the element's computed style with the inline override for that property
 * temporarily cleared, then restored.
 *
 * A key is treated as "missing" when it is absent from the object OR present
 * with a `null` / `undefined` value. Applies to both directions.
 */
function resolveMissingEntries(
  target: AnimationTarget,
  rawFrom: Record<string, AnimateValue | null | undefined>,
  rawTo: Record<string, AnimateValue | null | undefined>,
): {
  fromInput: Record<string, AnimateValue>
  toInput: Record<string, AnimateValue>
} {
  const fromInput: Record<string, AnimateValue> = {}
  const toInput: Record<string, AnimateValue> = {}
  for (const key in rawFrom) {
    if (rawFrom[key] != null) fromInput[key] = rawFrom[key]!
  }
  for (const key in rawTo) {
    if (rawTo[key] != null) toInput[key] = rawTo[key]!
  }

  const missingFromKeys = diffKeys(rawTo, rawFrom)
  const missingToKeys = diffKeys(rawFrom, rawTo)
  const missingKeys = [...missingFromKeys, ...missingToKeys]
  if (missingKeys.length === 0) {
    return { fromInput, toInput }
  }

  withClearedInlineStyles(target, missingKeys, (computed) => {
    for (const key of missingFromKeys) {
      fromInput[key] = readStyle(computed, key)
    }
    for (const key of missingToKeys) {
      toInput[key] = readStyle(computed, key)
    }
  })

  return { fromInput, toInput }
}

/**
 * For every slot where `from`/`to` mix `px` with another non-empty length unit,
 * resolve the non-px side to a px value by writing a probe with the side's
 * original `<value><unit>` per slot, reading the post-resolution string from
 * `getComputedStyle`, and re-parsing. A slot is left unchanged if the resolved
 * string doesn't share the same `wraps` structure and only `px` / empty units
 * in the expected places — this is what filters out `transform` (matrix
 * expansion), shorthand expansion, keyword residue, `%`-retaining contexts, and
 * custom properties.
 *
 * Returns a new map with the resolved `from`/`to` pairs; the input is left
 * untouched.
 */
function resolveUnitMismatches(
  target: AnimationTarget,
  parsedFromTo: Record<string, [ParsedStyleValue, ParsedStyleValue]>,
): Record<string, [ParsedStyleValue, ParsedStyleValue]> {
  return mapValues(parsedFromTo, ([from, to], key): [ParsedStyleValue, ParsedStyleValue] => {
    if (from.values.length !== to.values.length) return [from, to]

    const fromIndices: number[] = []
    const toIndices: number[] = []

    // Record value indices that needs value completion.
    zip(from.units, to.units).forEach(([fu, tu], i) => {
      if (fu === tu) return

      if (fu === 'px') {
        toIndices.push(i)
      } else if (tu === 'px') {
        fromIndices.push(i)
      }
    })

    if (fromIndices.length === 0 && toIndices.length === 0) return [from, to]

    const resolvedFrom =
      fromIndices.length > 0 ? resolveSide(target, key, from, fromIndices) : undefined
    const resolvedTo = toIndices.length > 0 ? resolveSide(target, key, to, toIndices) : undefined

    return [resolvedFrom ?? from, resolvedTo ?? to]
  })
}

function resolveSide(
  target: AnimationTarget,
  key: string,
  source: ParsedStyleValue,
  indices: number[],
): ParsedStyleValue | undefined {
  const idxSet = new Set(indices)
  const probe = interpolateParsedStyle(source, source.values)

  // Write the probe and read computed style, then write the original style back.
  const savedInline = readStyle(target.style, key)
  writeStyle(target, key, probe)
  const computedStr = readStyle(getComputedStyle(target), key)
  if (savedInline === '') {
    clearStyle(target, key)
  } else {
    writeStyle(target, key, savedInline)
  }

  const resolved = parseStyleValue(computedStr)

  // Compare the structures between resolved and source style value.
  // Do not complete if the structures are mismatched.
  if (resolved.values.length !== source.values.length) return undefined
  if (resolved.wraps.length !== source.wraps.length) return undefined
  const sameWraps = zip(resolved.wraps, source.wraps).every(([rw, sw]) => rw === sw)
  if (!sameWraps) {
    return undefined
  }

  // Check resolved unit. Do not complete if the target slot's units are not px.
  const resolvedAsPx = resolved.units.every((u, i) => !idxSet.has(i) || u == 'px')
  if (!resolvedAsPx) {
    return undefined
  }

  const newValues = source.values.slice()
  const newUnits = source.units.slice()
  for (const i of indices) {
    newValues[i] = resolved.values[i]!
    newUnits[i] = 'px'
  }
  return { wraps: source.wraps, units: newUnits, values: newValues }
}
