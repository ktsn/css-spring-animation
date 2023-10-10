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
> extends AnimateOptions<Velocity> {
  disabled?: boolean
}

function raf(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

export function useSpringStyle(
  value: RefOrGetter<number>,
  styleMapper: (value: string) => Record<string, string>,
  options?: MaybeRefOrGetter<UseSpringOptions<number>>,
): Readonly<Ref<Record<string, string>>>

export function useSpringStyle<T extends Record<string, number>>(
  value: RefOrGetter<T>,
  styleMapper: (value: Record<keyof T, string>) => Record<string, string>,
  options?: MaybeRefOrGetter<UseSpringOptions<Partial<T>>>,
): Readonly<Ref<Record<string, string>>>

export function useSpringStyle(
  values: RefOrGetter<MaybeRecord<string, number>>,
  styleMapper: (values: any) => Record<string, string>,
  options?: MaybeRefOrGetter<
    UseSpringOptions<Partial<MaybeRecord<string, number>>>
  >,
): Readonly<Ref<Record<string, string>>> {
  const current = computed(() => toValue(values))
  const optionsRef = computed(() => toValue(options) ?? {})

  const style = ref<Record<string, string>>(
    styleMapper(valueToStyle(current.value)),
  )

  let ctx: AnimateContext<MaybeRecord<string, number>> | null = null

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

    if (ctx && !ctx.settled && typeof ctx.velocity === 'number') {
      velocity += ctx.velocity
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
      style.value = styleMapper(valueToStyle(next))
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

  return readonly(style)
}
