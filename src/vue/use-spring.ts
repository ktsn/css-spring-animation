import {
  MaybeRefOrGetter,
  Ref,
  computed,
  readonly,
  ref,
  toValue,
  watch,
} from 'vue'
import { AnimateContext, AnimateOptions, MaybeRecord, animate } from '../main'
import { mapValues } from '../utils'

type RefOrGetter<T> = Ref<T> | (() => T)

export type SpringValues = number | Record<string, number>

interface UseSpringOptions<
  Velocity extends Partial<MaybeRecord<string, number>>,
  Unit extends Partial<MaybeRecord<string, string>>,
> extends AnimateOptions<Velocity, Unit> {
  disabled?: boolean
}

function raf(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

export function useSpringStyle(
  value: RefOrGetter<number>,
  styleMapper: (value: string) => Record<string, string>,
  options?: MaybeRefOrGetter<UseSpringOptions<number, string>>,
): Readonly<Ref<Record<string, string>>>

export function useSpringStyle<T extends Record<string, number>>(
  value: RefOrGetter<T>,
  styleMapper: (value: Record<keyof T, string>) => Record<string, string>,
  options?: MaybeRefOrGetter<
    UseSpringOptions<Partial<T>, Partial<Record<keyof T, string>>>
  >,
): Readonly<Ref<Record<string, string>>>

export function useSpringStyle(
  values: RefOrGetter<MaybeRecord<string, number>>,
  styleMapper: (values: any) => Record<string, string>,
  options?: MaybeRefOrGetter<
    UseSpringOptions<
      Partial<MaybeRecord<string, number>>,
      Partial<MaybeRecord<string, string>>
    >
  >,
): Readonly<Ref<Record<string, string>>> {
  const current = computed(() => toValue(values))
  const optionsRef = computed(() => toValue(options) ?? {})

  const style = ref<Record<string, string>>(
    styleMapper(valueToStyle(current.value, optionsRef.value.unit)),
  )

  let ctx: AnimateContext<MaybeRecord<string, number>> | null = null

  function valueToStyle(
    value: MaybeRecord<string, number>,
    unit: Partial<MaybeRecord<string, string>> | undefined,
  ): MaybeRecord<string, string> {
    const defaultUnit = 'px'

    if (typeof value === 'number') {
      const u = typeof unit === 'string' ? unit : defaultUnit
      return `${value}${u}`
    } else {
      return mapValues(value, (v, key) => {
        const u =
          typeof unit === 'object' ? unit[key] ?? defaultUnit : defaultUnit
        return `${v}${u}`
      })
    }
  }

  function calculateCurrentSingleValues(
    next: number,
    prev: number,
  ): { fromTo: [number, number]; velocity: number; unit: string | undefined } {
    const velocityOption = optionsRef.value.velocity
    let velocity = typeof velocityOption === 'number' ? velocityOption : 0

    if (ctx && !ctx.settled && typeof ctx.velocity === 'number') {
      velocity += ctx.velocity
    }

    return {
      fromTo: [prev, next],
      velocity,
      unit:
        typeof optionsRef.value.unit === 'number'
          ? optionsRef.value.unit
          : undefined,
    }
  }

  function calculateCurrentMultipleValues(
    next: Record<string, number>,
    prev: Record<string, number>,
  ): {
    fromTo: Record<string, [number, number]>
    velocity: Record<string, number>
    unit: Partial<Record<string, string>> | undefined
  } {
    const velocityOption = optionsRef.value.velocity

    let velocity = mapValues(next, (_, key) => {
      return typeof velocityOption === 'number'
        ? velocityOption
        : velocityOption?.[key] ?? 0
    })

    if (ctx && !ctx.settled) {
      const ctxVelocity = ctx.velocity
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
      unit:
        typeof optionsRef.value.unit === 'object'
          ? optionsRef.value.unit
          : undefined,
    }
  }

  watch(
    () => optionsRef.value.disabled,
    (disabled) => {
      if (disabled && ctx && !ctx.settled) {
        ctx.stop()
      }
    },
  )

  watch(current, async (next, prev) => {
    if (optionsRef.value.disabled) {
      style.value = styleMapper(valueToStyle(next, optionsRef.value.unit))
      return
    }

    const stop = () => {
      ctx?.stop()
      return raf()
    }

    if (ctx && !ctx.settled) {
      prev = ctx.current
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
      const { fromTo, velocity, unit } = calculateCurrentSingleValues(
        next,
        prev,
      )

      await stop()

      ctx = animate(fromTo, mapper, {
        ...optionsRef.value,
        velocity,
        unit,
      })
      return
    }

    if (typeof next === 'object' && typeof prev === 'object') {
      const { fromTo, velocity, unit } = calculateCurrentMultipleValues(
        next,
        prev,
      )

      await stop()

      ctx = animate(fromTo, mapper, {
        ...optionsRef.value,
        velocity,
        unit,
      })
      return
    }
  })

  return readonly(style)
}
