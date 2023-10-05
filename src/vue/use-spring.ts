import {
  MaybeRefOrGetter,
  Ref,
  computed,
  readonly,
  ref,
  toValue,
  watch,
} from 'vue'
import { AnimateOptions, AnimateValues, animate } from '../animate'

type RefOrGetter<T> = Ref<T> | (() => T)

export type SpringValues = string | Record<string, string>

export function useSpringStyle<T extends SpringValues>(
  values: RefOrGetter<T>,
  styleMapper: (values: AnimateValues<T>) => Record<string, string>,
  options?: MaybeRefOrGetter<AnimateOptions<T>>,
): Readonly<Ref<Record<string, string>>> {
  const current = computed(() => toValue(values))
  const optionsRef = computed(() => toValue(options) ?? {})

  const style = ref<Record<string, string>>(styleMapper(current.value as any))

  watch(current, (next, prev) => {
    const fromTo =
      typeof next === 'string' && typeof prev === 'string'
        ? ([prev, next] as [string, string])
        : typeof next === 'object' && typeof prev === 'object'
        ? Object.fromEntries(
            Object.entries(prev).flatMap(([k, v]) => {
              const nextV = next[k]
              if (nextV === undefined) {
                return []
              }
              return [[k, [v, nextV] as [string, string]]]
            }),
          )
        : null
    if (!fromTo) {
      return
    }

    animate(
      fromTo,
      (values, additionalStyle) => {
        style.value = {
          ...styleMapper(values as AnimateValues<T>),
          ...additionalStyle,
        }
      },
      optionsRef.value,
    )
  })

  return readonly(style)
}
