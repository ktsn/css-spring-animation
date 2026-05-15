import { registerPropertyIfNeeded, t, wait } from './time'
import {
  generateSpringExpressionStyle,
  createSpring,
  springSettlingDuration,
  springEasingFn,
  Spring,
} from './spring'
import {
  isCssLinearTimingFunctionSupported,
  isCssMathAnimationSupported,
  isWebAnimationsApiSupported,
  mapValues,
  zip,
} from './utils'
import {
  ParsedStyleValue,
  completeParsedStyleUnit,
  interpolateParsedStyle,
  parseStyleValue,
} from './style'
import {
  SpringComputed,
  SpringStyleValue,
  attachSpringValue,
  liftToSpringStyle,
  snapshotSpringStyle,
} from './spring-value'

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

export function animate<Style extends Record<string, AnimateValue>>(
  target: AnimationTarget,
  fromTo: [Style, Style],
  options: SpringOptions = {},
): AnimateContext {
  const [fromInput, toInput] = fromTo

  // Each slot — whether the user passed a SpringValue or a plain number —
  // is routed through a `SpringComputed`. Numeric slots get a fresh wrapper
  // so the rest of the evaluation pipeline is uniform.
  const slots = {} as Record<keyof Style, SpringComputed[]>

  // Mirror of `slots` for the `from` side. When the user passes a
  // SpringValue to `from`, this lets us attach it to the same Attachment
  // as the `to` slot so both follow the same animation.
  const fromSlots = {} as Record<keyof Style, SpringComputed[]>

  const slotVelocities = {} as Record<keyof Style, number[]>

  const parsedFromTo = mapValues(toInput, (to, key) => {
    const from = fromInput[key]
    const fromIsUserSpring = typeof from === 'object'
    const toIsUserSpring = typeof to === 'object'

    const liftedFrom: SpringStyleValue = fromIsUserSpring
      ? from
      : liftToSpringStyle(parseStyleValue(String(from)))
    const liftedTo: SpringStyleValue = toIsUserSpring
      ? to
      : liftToSpringStyle(parseStyleValue(String(to)))

    slots[key as keyof Style] = liftedTo.values
    fromSlots[key as keyof Style] = liftedFrom.values

    // Choose initial velocity prioritized by follows:
    // 1. user-provided `from` SpringValue's velocity
    // 2. user-provided `to` SpringValue's velocity
    slotVelocities[key as keyof Style] = liftedTo.values.map((toSlot, i) => {
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

  const duration = options.duration ?? 1000
  const bounce = options.bounce ?? 0

  const spring = createSpring({
    bounce,
    duration,
  })

  const inputValues = groupInputValues(parsedFromTo, slotVelocities)

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
    fromTo: parsedFromTo,
    startTime,
    duration,
    settlingDuration,
    animations,
  })

  // Attach animation info to every slot's SpringComputed.
  for (const key in slots) {
    slots[key].forEach((slot, slotIndex) => {
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
    canUseLinearTimingFunction(parsedFromTo, slotVelocities)
  ) {
    animations.push(
      ...animateWithPerPropertyEasing({
        target,
        spring,
        fromTo: parsedFromTo,
        inputValues,
        settlingDuration,
      }),
    )
  } else if (waapi && isCssMathAnimationSupported()) {
    animations.push(
      ...animateWithProxyTimeVariable({
        target,
        spring,
        fromTo: parsedFromTo,
        inputValues,
        duration,
        settlingDuration,
      }),
    )
  } else {
    // Graceful degradation for environments without WAAPI / linear() / CSS math.
    animateWithRaf({
      target,
      fromTo: parsedFromTo,
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

function groupInputValues<
  FromTo extends Record<string, [ParsedStyleValue, ParsedStyleValue]>,
>(
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
    const normalizedVelocity = values.reduce<number | undefined>(
      (acc, { from, to, velocity }) => {
        if (acc !== undefined) {
          return acc
        }

        if (from === to) {
          return undefined
        }

        return velocity / (to - from)
      },
      undefined,
    )

    const easing = springEasingFn({
      spring,
      settlingDuration,
      normalizedVelocity: normalizedVelocity ?? 0,
    })

    const a = target.animate(
      [keyframeFor(key, fromStr), keyframeFor(key, toStr)],
      { duration: settlingDuration, easing, fill: 'forwards' },
    )
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

  const a = target.animate(
    [{ [t]: '0' }, { [t]: String(settlingDuration / duration) }],
    { duration: settlingDuration, easing: 'linear', fill: 'forwards' },
  )
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

function createContext<
  FromTo extends Record<string, [ParsedStyleValue, ParsedStyleValue]>,
>({
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

export function writeStyle(
  target: AnimationTarget,
  key: string,
  value: string,
): void {
  if (key.startsWith('--')) {
    target.style.setProperty(key, value)
  } else {
    target.style[key as any] = value
  }
}
