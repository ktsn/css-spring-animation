import {
  MaybeRefOrGetter,
  Ref,
  computed,
  readonly,
  ref,
  toValue,
  watch,
} from 'vue'
import {
  AnimateContext,
  AnimateOptions,
  AnimateValues,
  AnimateVelocities,
  animate,
} from '../main'

type RefOrGetter<T> = Ref<T> | (() => T)

export type SpringValues = number | Record<string, number>

function raf(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

export function useSpringStyle<T extends SpringValues>(
  values: RefOrGetter<T>,
  styleMapper: (values: AnimateValues<T>) => Record<string, string>,
  options?: MaybeRefOrGetter<AnimateOptions<T>>,
): Readonly<Ref<Record<string, string>>> {
  const current = computed(() => toValue(values))
  const optionsRef = computed(() => toValue(options) ?? {})

  const style = ref<Record<string, string>>({})

  let ctx: AnimateContext<T> | null = null

  watch(current, async (next, prev) => {
    let velocity =
      typeof next === 'number'
        ? optionsRef.value.velocity ?? 0
        : Object.fromEntries(
            Object.keys(next).map((key) => {
              const velocity =
                typeof optionsRef.value.velocity === 'number'
                  ? optionsRef.value.velocity
                  : (
                      optionsRef.value.velocity as
                        | Record<string, number>
                        | undefined
                    )?.[key] ?? 0
              return [key, velocity]
            }),
          )

    if (ctx && !ctx.completed) {
      prev = ctx.current as any

      if (typeof velocity === 'number') {
        velocity += ctx.velocity as number
      } else {
        velocity = Object.fromEntries(
          Object.entries(ctx.velocity).map(([k, v]: [string, number]) => [
            k,
            v + ((velocity as Record<string, number>)[k] ?? 0),
          ]),
        ) as AnimateVelocities<T>
      }

      ctx.stop()
      await raf()
    }

    const fromTo =
      typeof next === 'number' && typeof prev === 'number'
        ? ([prev, next] as [number, number])
        : typeof next === 'object' && typeof prev === 'object'
        ? Object.fromEntries(
            Object.entries(prev).flatMap(([k, v]) => {
              const nextV = (next as Record<string, number>)[k]
              if (nextV === undefined) {
                return []
              }
              return [[k, [v, nextV] as [number, number]]]
            }),
          )
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
