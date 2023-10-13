import {
  DeepReadonly,
  MaybeRefOrGetter,
  Ref,
  computed,
  readonly,
  ref,
  toRef,
  toValue,
  watch,
} from 'vue'
import {
  AnimateContext,
  AnimateOptions,
  animate,
  SpringValue,
  generateSpringStyle,
} from '../core'
import { mapValues } from '../core/utils'

type RefOrGetter<T> = Ref<T> | (() => T)

export interface UseSpringOptions<Velocity extends Record<string, number[]>>
  extends AnimateOptions<Velocity> {
  disabled?: boolean
}

type SpringStyleRef = Readonly<Ref<Record<string, string>>>

export interface UseSpringResult<Values extends Record<string, number[]>> {
  style: SpringStyleRef
  realValue: DeepReadonly<Ref<Values>>
  realVelocity: DeepReadonly<Ref<Values>>
}

function raf(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

export function useSpringStyle<Style extends Record<string, SpringValue>>(
  styleMapper: RefOrGetter<Style>,
  options?: MaybeRefOrGetter<UseSpringOptions<Record<keyof Style, number[]>>>,
): SpringStyleRef {
  return useSpring(styleMapper, options).style
}

export function useSpring<Style extends Record<string, SpringValue>>(
  styleMapper: RefOrGetter<Style>,
  options?: MaybeRefOrGetter<UseSpringOptions<Record<keyof Style, number[]>>>,
): UseSpringResult<Record<keyof Style, number[]>> {
  const input = computed(
    (): Record<string, SpringValue> => toValue(styleMapper),
  )
  const optionsRef = computed(() => toValue(options) ?? {})

  const disabled = computed(() => optionsRef.value.disabled ?? false)

  const style = ref<Record<string, string>>(
    mapValues(input.value, (value) => {
      if (typeof value === 'number') {
        return String(value)
      }
      return generateSpringStyle(value, value.values)
    }),
  )

  const realValue = toRef(() => ctx.realValue as Record<keyof Style, number[]>)
  const realVelocity = toRef(
    () => ctx.realVelocity as Record<keyof Style, number[]>,
  )

  // Pseudo context for intiial state (before triggering animation)
  let ctx = createContext(input.value)

  function calculateCurrentMultipleValues(
    next: Record<string, SpringValue>,
    prev: Record<string, SpringValue>,
  ): {
    fromTo: Record<string, [SpringValue, SpringValue]>
    velocity: Record<string, number[]>
  } {
    const velocityOption = optionsRef.value.velocity

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
      return [prevV, next[key]] as [SpringValue, SpringValue]
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
    ctx = createContext(updateValues(input.value, ctx.realValue))
  })

  watch(input, async (next, prev) => {
    if (disabled.value) {
      if (!ctx.settled) {
        ctx.stop()
      }
      ctx = createContext(next)
      style.value = mapValues(next, (value) => {
        return typeof value === 'number'
          ? String(value)
          : generateSpringStyle(value, value.values)
      })
      return
    }

    if (ctx && !ctx.settled) {
      prev = updateValues(prev, ctx.realValue)
    }

    const { fromTo, velocity } = calculateCurrentMultipleValues(next, prev)

    if (ctx && !ctx.settled) {
      ctx.stop()
      await raf()
    }

    ctx = animate(
      fromTo,
      (_style) => {
        style.value = _style
      },
      {
        ...optionsRef.value,
        velocity,
      },
    )
  })

  return {
    style: readonly(style),
    realValue: readonly(realValue),
    realVelocity: readonly(realVelocity),
  }
}

function updateValues(
  springValues: Record<string, SpringValue>,
  values: Record<string, number[]>,
): Record<string, SpringValue> {
  return mapValues(springValues, (value, key): SpringValue => {
    const newValue = values[key]
    if (typeof value === 'number') {
      return newValue?.[0] ?? 0
    }

    return {
      strings: value.strings,
      units: value.units,
      values: newValue ?? value.values.fill(0),
    }
  })
}

/**
 * Create a pseudo context for the state when no animation is triggered.
 * It is used for initial state and disabled state.
 */
function createContext(
  value: Record<string, SpringValue>,
): AnimateContext<Record<string, number[]>> {
  return {
    realValue: mapValues(value, (v) => {
      return typeof v === 'number' ? [v] : v.values
    }),
    realVelocity: mapValues(value, (_, key) => {
      const property = value[key] ?? 0
      const values = typeof property === 'number' ? [property] : property.values
      return values.fill(0)
    }),
    finished: true,
    settled: true,
    finishingPromise: Promise.resolve(),
    settlingPromise: Promise.resolve(),
    stop: () => {},
    stoppedDuration: 0,
  }
}
