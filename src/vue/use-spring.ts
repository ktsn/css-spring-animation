import {
  DeepReadonly,
  MaybeRefOrGetter,
  Ref,
  computed,
  nextTick,
  onScopeDispose,
  readonly,
  ref,
  toRef,
  toValue,
  watch,
  watchEffect,
} from 'vue'
import { AnimateValue, SpringOptions, createAnimateController } from '../core'
import { isSameStyle } from '../core/controller'
import { resolveSpringStyle } from '../core/spring-value'

type RefOrGetter<T> = Ref<T> | (() => T)

export interface UseSpringOptions extends SpringOptions {
  disabled?: boolean
  inferVelocity?: boolean
  /** @deprecated Use `disabled: true` with `inferVelocity: false` instead. */
  relocating?: boolean
}

type SpringStyleRef = Readonly<Ref<Record<string, string>>>

export interface UseSpringResult<Values extends Record<string, number[]>> {
  style: SpringStyleRef
  realValue: DeepReadonly<Ref<Values>>
  realVelocity: DeepReadonly<Ref<Values>>
  onFinishCurrent: (fn: (data: { stopped: boolean }) => void) => void
  onSettleCurrent: (fn: (data: { stopped: boolean }) => void) => void
}

export function useSpring<Style extends Record<string, AnimateValue>>(
  styleMapper: RefOrGetter<Style>,
  options?: MaybeRefOrGetter<UseSpringOptions>,
): UseSpringResult<Record<keyof Style, number[]>> {
  const input = computed(() => toValue(styleMapper))

  // Reactive snapshot — reads every `SpringComputed.target` (via
  // `resolveSpringStyle`) so Vue reruns this whenever any target changes.
  // Used as the comparison source in the `watch` below so target writes
  // trigger setStyle, even though the input ParsedStyleValue reference
  // itself doesn't change.
  const inputSnapshot = computed(() => resolveSpringStyle(input.value))

  const optionsRef = computed(() => toValue(options) ?? {})

  const disabled = computed(
    () =>
      (optionsRef.value.disabled ?? false) ||
      (optionsRef.value.relocating ?? false),
  )

  const inferVelocity = computed(() => {
    if (optionsRef.value.relocating) {
      return false
    }
    return optionsRef.value.inferVelocity ?? true
  })

  let warnedRelocating = false
  watchEffect(() => {
    if (optionsRef.value.relocating && !warnedRelocating) {
      warnedRelocating = true
      console.warn(
        '[css-spring-animation] `relocating` is deprecated. Use `disabled: true` with `inferVelocity: false` instead.',
      )
    }
  })

  const style = ref<Record<string, string>>({})

  const controller = createAnimateController<Record<keyof Style, AnimateValue>>(
    (_style) => {
      style.value = _style
    },
  )
  controller.setStyle(input.value)
  controller.setOptions(optionsRef.value)

  const realValue = toRef(() => controller.realValue)
  const realVelocity = toRef(() => controller.realVelocity)

  onScopeDispose(() => {
    controller.stop()
  })

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
      }
    },
  )

  return {
    style: readonly(style),
    realValue: readonly(realValue),
    realVelocity: readonly(realVelocity),
    onFinishCurrent,
    onSettleCurrent,
  }
}
