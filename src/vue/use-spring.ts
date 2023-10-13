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
import { AnimateOptions, AnimateValue, createAnimateController } from '../core'

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

export function useSpring<Style extends Record<string, AnimateValue>>(
  styleMapper: RefOrGetter<Style>,
  options?: MaybeRefOrGetter<UseSpringOptions<Record<keyof Style, number[]>>>,
): UseSpringResult<Record<keyof Style, number[]>> {
  const input = computed(() => toValue(styleMapper))
  const optionsRef = computed(() => toValue(options) ?? {})
  const disabled = computed(() => optionsRef.value.disabled ?? false)

  const style = ref<Record<string, string>>({})

  const controller = createAnimateController<Style>((_style) => {
    style.value = _style
  })
  controller.setStyle(input.value)
  controller.setOptions(optionsRef.value)

  const realValue = toRef(() => controller.realValue)
  const realVelocity = toRef(() => controller.realVelocity)

  watch(disabled, (disabled) => {
    if (!disabled) {
      return
    }

    controller.stop()
  })

  watch(input, (input) => {
    controller.setStyle(input, !disabled.value)
  })

  watch(optionsRef, (options) => {
    controller.setOptions(options)
  })

  return {
    style: readonly(style),
    realValue: readonly(realValue),
    realVelocity: readonly(realVelocity),
  }
}
