import {
  MaybeRefOrGetter,
  Ref,
  computed,
  nextTick,
  readonly,
  ref,
  toValue,
  watch,
} from 'vue'
import { AnimateValue, SpringOptions, createAnimateController } from '../core'
import { isSameStyle } from '../core/controller'
import { interpolateParsedStyle } from '../core/style'

type RefOrGetter<T> = Ref<T> | (() => T)

export interface UseSpringOptions extends SpringOptions {
  disabled?: boolean
  inferVelocity?: boolean
}

type SpringStyleRef = Readonly<Ref<Record<string, string>>>

export interface UseSpringResult {
  style: SpringStyleRef
  onFinish: (fn: (data: { stopped: boolean }) => void) => void
  onSettle: (fn: (data: { stopped: boolean }) => void) => void
  onFinishCurrent: (fn: (data: { stopped: boolean }) => void) => void
  onSettleCurrent: (fn: (data: { stopped: boolean }) => void) => void
}

export function useSpring<Style extends Record<string, AnimateValue>>(
  styleMapper: RefOrGetter<Style>,
  options?: MaybeRefOrGetter<UseSpringOptions>,
): UseSpringResult {
  const input = computed(() => toValue(styleMapper))

  // Reactive snapshot — reads every `SpringComputed.target` so Vue reruns
  // this whenever any target changes. Used as the comparison source in the
  // `watch` below so target writes trigger setStyle, even though the input
  // ParsedStyleValue reference itself doesn't change.
  const inputSnapshot = computed((): Record<keyof Style, string | number> => {
    const raw = input.value

    let hasSpringValue = false
    const resolved: Record<string, string | number> = {}

    for (const key in raw) {
      const v = raw[key]!
      if (typeof v === 'object') {
        resolved[key] = interpolateParsedStyle(
          v,
          v.values.map((s) => s.target),
        )
        hasSpringValue = true
      } else {
        resolved[key] = v
      }
    }

    return (hasSpringValue ? resolved : raw) as Record<
      keyof Style,
      string | number
    >
  })

  const optionsRef = computed(() => toValue(options) ?? {})

  const disabled = computed(() => optionsRef.value.disabled ?? false)

  const inferVelocity = computed(() => optionsRef.value.inferVelocity ?? true)

  const style = ref<Record<string, string>>({})

  const controller = createAnimateController<Record<keyof Style, AnimateValue>>(
    (_style) => {
      style.value = _style
    },
  )
  controller.setStyle(input.value)
  controller.setOptions(optionsRef.value)

  function onFinishCurrent(fn: (data: { stopped: boolean }) => void): void {
    // Wait for the next tick to ensure that input changes in the same tick
    // triggers a new animation that is a case like:
    //
    // springStyle.value = { width: '100px' }
    // onFinishCurrent(() => {
    //   ...
    // })
    nextTick().then(() => {
      controller.onFinishCurrent(fn)
    })
  }

  function onSettleCurrent(fn: (data: { stopped: boolean }) => void): void {
    // Wait for the next tick to ensure that input changes in the same tick
    // triggers a new animation that is a case like:
    //
    // springStyle.value = { width: '100px' }
    // onSettleCurrent(() => {
    //   ...
    // })
    nextTick().then(() => {
      controller.onSettleCurrent(fn)
    })
  }

  const finishListeners = new Set<(data: { stopped: boolean }) => void>()
  const settleListeners = new Set<(data: { stopped: boolean }) => void>()

  function onFinish(fn: (data: { stopped: boolean }) => void): void {
    finishListeners.add(fn)
  }

  function onSettle(fn: (data: { stopped: boolean }) => void): void {
    settleListeners.add(fn)
  }

  watch(
    [
      disabled,
      () => ({ ...inputSnapshot.value }),
      () => ({ ...optionsRef.value }),
    ],
    ([disabled, snapshot, options], [prevDisabled, prevSnapshot]) => {
      if (disabled && !prevDisabled) {
        controller.stop({
          keepVelocity: !inferVelocity.value,
        })
      }

      controller.setOptions(options)

      if (!isSameStyle(snapshot, prevSnapshot)) {
        controller.setStyle(input.value, { animate: !disabled })

        if (!disabled) {
          controller.onFinishCurrent((data) => {
            finishListeners.forEach((fn) => fn(data))
          })
          controller.onSettleCurrent((data) => {
            settleListeners.forEach((fn) => fn(data))
          })
        }
      }
    },
  )

  return {
    style: readonly(style),
    onFinish,
    onSettle,
    onFinishCurrent,
    onSettleCurrent,
  }
}
