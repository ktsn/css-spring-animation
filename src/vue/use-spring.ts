import {
  MaybeRefOrGetter,
  Ref,
  computed,
  readonly,
  ref,
  toRef,
  toValue,
  watch,
} from 'vue'
import { AnimateContext, AnimateOptions, MaybeRecord, animate } from '../core'
import { mapValues } from '../core/utils'

type RefOrGetter<T> = Ref<T> | (() => T)

export type SpringValues = number | Record<string, number>

export interface UseSpringOptions<
  Velocity extends Partial<MaybeRecord<string, number>>,
> extends AnimateOptions<Velocity> {
  disabled?: boolean
}

type SpringStyle = Readonly<Ref<Record<string, string>>>

export interface UseSpringResult<Values extends MaybeRecord<string, number>> {
  style: SpringStyle
  realValue: Readonly<Ref<Values>>
  realVelocity: Readonly<Ref<Values>>
}

function raf(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

export function useSpringStyle(
  value: RefOrGetter<number>,
  styleMapper: (value: string) => Record<string, string>,
  options?: MaybeRefOrGetter<UseSpringOptions<number>>,
): SpringStyle

export function useSpringStyle<T extends Record<string, number>>(
  value: RefOrGetter<T>,
  styleMapper: (value: Record<keyof T, string>) => Record<string, string>,
  options?: MaybeRefOrGetter<UseSpringOptions<Partial<T>>>,
): SpringStyle

export function useSpringStyle(
  values: RefOrGetter<MaybeRecord<string, number>>,
  styleMapper: (values: any) => Record<string, string>,
  options?: MaybeRefOrGetter<
    UseSpringOptions<Partial<MaybeRecord<string, number>>>
  >,
): SpringStyle {
  return useSpring(values as any, styleMapper, options as any).style
}

export function useSpring(
  value: RefOrGetter<number>,
  styleMapper: (value: string) => Record<string, string>,
  options?: MaybeRefOrGetter<UseSpringOptions<number>>,
): UseSpringResult<number>

export function useSpring<T extends Record<string, number>>(
  value: RefOrGetter<T>,
  styleMapper: (value: Record<keyof T, string>) => Record<string, string>,
  options?: MaybeRefOrGetter<UseSpringOptions<Partial<T>>>,
): UseSpringResult<T>

export function useSpring(
  values: RefOrGetter<MaybeRecord<string, number>>,
  styleMapper: (values: any) => Record<string, string>,
  options?: MaybeRefOrGetter<
    UseSpringOptions<Partial<MaybeRecord<string, number>>>
  >,
): UseSpringResult<MaybeRecord<string, number>> {
  const currentValue = computed(() => toValue(values))
  const optionsRef = computed(() => toValue(options) ?? {})

  const disabled = computed(() => optionsRef.value.disabled ?? false)

  const style = ref<Record<string, string>>(
    styleMapper(valueToStyle(currentValue.value)),
  )

  const realValue = toRef(() => ctx.realValue)
  const realVelocity = toRef(() => ctx.realVelocity)

  // Pseudo context for intiial state (before triggering animation)
  let ctx = createContext(currentValue.value)

  function valueToStyle(
    value: MaybeRecord<string, number>,
  ): MaybeRecord<string, string> {
    if (typeof value === 'number') {
      return String(value)
    } else {
      return mapValues(value, (v) => String(v))
    }
  }

  function calculateCurrentSingleValues(
    next: number,
    prev: number,
  ): { fromTo: [number, number]; velocity: number } {
    const velocityOption = optionsRef.value.velocity
    let velocity = typeof velocityOption === 'number' ? velocityOption : 0

    if (ctx && !ctx.settled && typeof ctx.realVelocity === 'number') {
      velocity += ctx.realVelocity
    }

    return {
      fromTo: [prev, next],
      velocity,
    }
  }

  function calculateCurrentMultipleValues(
    next: Record<string, number>,
    prev: Record<string, number>,
  ): {
    fromTo: Record<string, [number, number]>
    velocity: Record<string, number>
  } {
    const velocityOption = optionsRef.value.velocity

    let velocity = mapValues(next, (_, key) => {
      return typeof velocityOption === 'number'
        ? velocityOption
        : velocityOption?.[key] ?? 0
    })

    if (ctx && !ctx.settled) {
      const ctxVelocity = ctx.realVelocity
      velocity = mapValues(velocity, (value, key) => {
        const v =
          typeof ctxVelocity === 'number' ? ctxVelocity : ctxVelocity[key] ?? 0
        return v + value
      })
    }

    const fromTo = mapValues(prev, (prevV, key) => {
      return [prevV, next[key]] as [number, number]
    })

    return {
      fromTo,
      velocity,
    }
  }

  watch(disabled, (disabled) => {
    if (!disabled) {
      return
    }

    if (!ctx.settled) {
      ctx.stop()
    }
    ctx = createContext(ctx.realValue)
  })

  watch(currentValue, async (next, prev) => {
    if (disabled.value) {
      ctx = createContext(next)
      style.value = styleMapper(valueToStyle(next))
      return
    }

    const stop = () => {
      if (!ctx || ctx.settled) {
        return
      }
      ctx.stop()
      return raf()
    }

    if (ctx && !ctx.settled) {
      prev = ctx.realValue
    }

    const mapper = <T>(
      values: T,
      additionalStyle: Record<string, string>,
    ): void => {
      style.value = {
        ...styleMapper(values),
        ...additionalStyle,
      }
    }

    if (typeof next === 'number' && typeof prev === 'number') {
      const { fromTo, velocity } = calculateCurrentSingleValues(next, prev)

      await stop()

      ctx = animate(fromTo, mapper, {
        ...optionsRef.value,
        velocity,
      })
      return
    }

    if (typeof next === 'object' && typeof prev === 'object') {
      const { fromTo, velocity } = calculateCurrentMultipleValues(next, prev)

      await stop()

      ctx = animate(fromTo, mapper, {
        ...optionsRef.value,
        velocity,
      })
      return
    }
  })

  return {
    style: readonly(style),
    realValue: readonly(realValue),
    realVelocity: readonly(realVelocity),
  }
}

/**
 * Create a pseudo context for the state when no animation is triggered.
 * It is used for initial state and disabled state.
 */
function createContext(
  value: MaybeRecord<string, number>,
): AnimateContext<MaybeRecord<string, number>> {
  return {
    realValue: value,
    realVelocity: typeof value === 'number' ? 0 : mapValues(value, () => 0),
    finished: true,
    settled: true,
    finishingPromise: Promise.resolve(),
    settlingPromise: Promise.resolve(),
    stop: () => {},
    stoppedDuration: 0,
  }
}
