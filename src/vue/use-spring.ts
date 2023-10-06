import {
  MaybeRefOrGetter,
  Ref,
  computed,
  readonly,
  ref,
  toValue,
  watch,
} from 'vue'
import { AnimateContext, AnimateOptions, AnimateValues, animate } from '../main'
import { mapValues } from '../utils'

type RefOrGetter<T> = Ref<T> | (() => T)

export type SpringValues = number | Record<string, number>

interface UseSpringOptions<T> extends AnimateOptions<T> {
  disabled?: boolean
}

function raf(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

export function useSpringStyle<T extends SpringValues>(
  values: RefOrGetter<T>,
  styleMapper: (values: AnimateValues<T>) => Record<string, string>,
  options?: MaybeRefOrGetter<UseSpringOptions<T>>,
): Readonly<Ref<Record<string, string>>> {
  const current = computed(() => toValue(values))
  const optionsRef = computed(() => toValue(options) ?? {})

  const style = ref<Record<string, string>>(
    styleMapper(valueToStyle(current.value)),
  )

  let ctx: AnimateContext<T> | null = null

  function valueToStyle(value: T): AnimateValues<T> {
    return (
      typeof value === 'number'
        ? `${value}px`
        : mapValues(value, (v) => `${v}px`)
    ) as AnimateValues<T>
  }

  watch(current, async (next, prev) => {
    if (optionsRef.value.disabled) {
      style.value = styleMapper(valueToStyle(next))
      return
    }

    let velocity =
      typeof next === 'number'
        ? optionsRef.value.velocity ?? 0
        : mapValues(next, (_, key) => {
            const velocity =
              typeof optionsRef.value.velocity === 'number'
                ? optionsRef.value.velocity
                : optionsRef.value.velocity?.[key] ?? 0
            return velocity
          })

    if (ctx && !ctx.completed) {
      prev = ctx.current as any

      if (typeof velocity === 'number') {
        velocity += ctx.velocity as number
      } else {
        velocity = mapValues(
          ctx.velocity as { [K in keyof T]: number },
          (v, k) => {
            const originalVelocity =
              typeof velocity === 'number' ? velocity : velocity[k] ?? 0
            return originalVelocity + v
          },
        )
      }

      ctx.stop()
      await raf()
    }

    const fromTo =
      typeof next === 'number' && typeof prev === 'number'
        ? ([prev, next] as [number, number])
        : typeof next === 'object' && typeof prev === 'object'
        ? mapValues(prev, (prevV, key) => {
            return [prevV, next[key]] as [number, number]
          })
        : null
    if (!fromTo) {
      return
    }

    ctx = animate(
      fromTo,
      (values, additionalStyle) => {
        style.value = {
          ...styleMapper(values as AnimateValues<T>),
          ...additionalStyle,
        }
      },
      {
        ...optionsRef.value,
        velocity,
      },
    ) as AnimateContext<T>
  })

  return readonly(style)
}
