import { registerPropertyIfNeeded, t, wait } from './time'
import {
  generateSpringExpressionStyle,
  createSpring,
  springSettlingDuration,
  Spring,
  springCSSInternal,
} from './spring'
import {
  isCssLinearTimingFunctionSupported,
  isCssMathAnimationSupported,
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

export function animate<T extends Record<string, [AnimateValue, AnimateValue]>>(
  fromTo: T,
  set: (style: Record<string, string>) => void,
  options: SpringOptions = {},
): AnimateContext {
  // Each slot — whether the user passed a SpringValue or a plain number —
  // is routed through a `SpringComputed`. Numeric slots get a fresh wrapper
  // so the rest of the evaluation pipeline is uniform.
  const slots: Record<keyof T, SpringComputed[]> = {} as Record<
    keyof T,
    SpringComputed[]
  >

  // Mirror of `slots` for the `from` side. When the user passes a
  // SpringValue to `from`, this lets us attach it to the same Attachment
  // as the `to` slot so both follow the same animation.
  const fromSlots: Record<keyof T, SpringComputed[]> = {} as Record<
    keyof T,
    SpringComputed[]
  >

  const slotVelocities: Record<keyof T, number[]> = {} as Record<
    keyof T,
    number[]
  >

  const parsedFromTo = mapValues(fromTo, ([from, to], key) => {
    const fromIsUserSpring = typeof from === 'object'
    const toIsUserSpring = typeof to === 'object'

    const liftedFrom: SpringStyleValue = fromIsUserSpring
      ? from
      : liftToSpringStyle(parseStyleValue(String(from)))
    const liftedTo: SpringStyleValue = toIsUserSpring
      ? to
      : liftToSpringStyle(parseStyleValue(String(to)))

    slots[key as keyof T] = liftedTo.values
    fromSlots[key as keyof T] = liftedFrom.values

    // Choose initial velocity prioritized by follows:
    // 1. user-provided `from` SpringValue's velocity
    // 2. user-provided `to` SpringValue's velocity
    slotVelocities[key as keyof T] = liftedTo.values.map((toSlot, i) => {
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

  const ctx = createContext({
    slots,
    fromTo: parsedFromTo,
    startTime,
    duration,
    settlingDuration,
    set,
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

  if (
    isCssLinearTimingFunctionSupported() &&
    canUseLinearTimingFunction(parsedFromTo, slotVelocities)
  ) {
    animateWithLinearTimingFunction({
      spring,
      fromTo: parsedFromTo,
      inputValues,
      settlingDuration,
      set,
    })
  } else if (isCssMathAnimationSupported()) {
    animateWithCssCustomPropertyMath({
      spring,
      fromTo: parsedFromTo,
      inputValues,
      duration,
      settlingDuration,
      set,
    })
  } else {
    // Graceful degradation
    animateWithRaf({
      fromTo: parsedFromTo,
      slots,
      context: ctx,
      set,
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

function animateWithLinearTimingFunction({
  spring,
  fromTo,
  inputValues,
  settlingDuration,
  set,
}: {
  spring: Spring
  fromTo: Record<string, [ParsedStyleValue, ParsedStyleValue]>
  inputValues: Record<string, InputValueGroup[]>
  settlingDuration: number
  set: (style: Record<string, string>) => void
}): void {
  const fromStyle = mapValues(fromTo, ([from, to]) => {
    // Skip animation if the value is not consistent
    if (from.values.length !== to.values.length) {
      return interpolateParsedStyle(to, to.values)
    }

    return interpolateParsedStyle(from, from.values)
  })

  set({
    ...fromStyle,
    transition: 'none',
  })

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const toStyle = mapValues(fromTo, ([from, to]) => {
        const completedTo = completeParsedStyleUnit(to, from)
        return interpolateParsedStyle(completedTo, completedTo.values)
      })

      const transitionValues = mapValues(inputValues, (values) => {
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

        return springCSSInternal({
          spring,
          settlingDuration,
          normalizedVelocity: normalizedVelocity ?? 0,
        })
      })

      const transition = Object.entries(transitionValues)
        .map(([key, transitionValue]) => {
          return `${key} ${transitionValue}`
        })
        .join(',')

      set({
        ...toStyle,
        transition,
      })
    })
  })
}

function animateWithCssCustomPropertyMath({
  spring,
  fromTo,
  inputValues,
  duration,
  settlingDuration,
  set,
}: {
  spring: Spring
  fromTo: Record<string, [ParsedStyleValue, ParsedStyleValue]>
  inputValues: Record<string, InputValueGroup[]>
  duration: number
  settlingDuration: number
  set: (style: Record<string, string>) => void
}): void {
  registerPropertyIfNeeded()

  const style = mapValues(fromTo, ([from, to], key) => {
    // Skip animation if the value is not consistent
    if (from.values.length !== to.values.length) {
      return interpolateParsedStyle(to, to.values)
    }

    const values = inputValues[key]!

    const style = values.map(({ from, to, velocity }) => {
      return generateSpringExpressionStyle(spring, {
        from,
        to,
        initialVelocity: velocity,
      })
    })

    const completedTo = completeParsedStyleUnit(to, from)
    return interpolateParsedStyle(completedTo, style)
  })

  set({
    ...style,
    transition: 'none',
    [t]: '0',
  })

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      set({
        ...style,
        transition: `${t} ${settlingDuration}ms linear`,
        [t]: String(settlingDuration / duration),
      })
    })
  })
}

function animateWithRaf({
  fromTo,
  slots,
  context,
  set,
}: {
  fromTo: Record<string, [ParsedStyleValue, ParsedStyleValue]>
  slots: Record<string, SpringComputed[]>
  context: AnimateContext
  set: (style: Record<string, string>) => void
}): void {
  function render(): void {
    if (context.settled) {
      return
    }

    const style = mapValues(fromTo, ([from, to], key) => {
      // Skip animation if the value is not consistent
      if (from.values.length !== to.values.length) {
        return interpolateParsedStyle(to, to.values)
      }

      const keySlots = slots[key]
      if (!keySlots) {
        return ''
      }

      const realValue = keySlots.map((s) => s.current())
      const completedTo = completeParsedStyleUnit(to, from)
      return interpolateParsedStyle(completedTo, realValue)
    })

    set({
      ...style,
      transition: 'none',
    })

    requestAnimationFrame(render)
  }

  render()
}

function createContext<
  FromTo extends Record<string, [ParsedStyleValue, ParsedStyleValue]>,
>({
  slots,
  fromTo,
  startTime,
  duration,
  settlingDuration,
  set,
}: {
  slots: Record<keyof FromTo, SpringComputed[]>
  fromTo: FromTo
  startTime: number
  duration: number
  settlingDuration: number
  set: (style: Record<string, string>) => void
}): AnimateContext {
  const forceResolve: { fn: (() => void)[] } = { fn: [] }

  function stop() {
    if (ctx.settled) {
      return
    }
    ctx.finished = ctx.settled = true
    ctx.stoppedDuration = performance.now() - startTime
    setRealStyle()
    forceResolve.fn.forEach((fn) => fn())
  }

  function setRealStyle() {
    const style = mapValues(fromTo, ([from, to], key) => {
      const keySlots = slots[key]
      if (!keySlots) {
        return ''
      }

      const completedTo = completeParsedStyleUnit(to, from)
      const realValue = keySlots.map((s) => s.current())
      return interpolateParsedStyle(completedTo, realValue)
    })

    set({
      ...style,
      transition: '',
      [t]: '',
    })
  }

  const ctx: AnimateContext = {
    finishingPromise: wait(duration + 1, forceResolve).then(() => {
      ctx.finished = true
    }),

    settlingPromise: wait(settlingDuration + 1, forceResolve).then(() => {
      ctx.finished = ctx.settled = true

      if (ctx.stoppedDuration === undefined) {
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
