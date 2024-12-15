import {
  DeepReadonly,
  MaybeRefOrGetter,
  Ref,
  computed,
  nextTick,
  readonly,
  ref,
  toRef,
  toValue,
  watch,
} from 'vue'
import { AnimateValue, SpringOptions, createAnimateController } from '../core'
import { isSameStyle } from '../core/controller'

type RefOrGetter<T> = Ref<T> | (() => T)

export interface UseSpringOptions extends SpringOptions {
  disabled?: boolean
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
  const optionsRef = computed(() => toValue(options) ?? {})
  const disabled = computed(() => optionsRef.value.disabled ?? false)
  const relocating = computed(() => optionsRef.value.relocating ?? false)

  const stopped = computed((): boolean => disabled.value || relocating.value)

  const style = ref<Record<string, string>>({})

  const controller = createAnimateController<Style>((_style) => {
    style.value = _style
  })
  controller.setStyle(input.value)
  controller.setOptions(optionsRef.value)

  const realValue = toRef(() => controller.realValue)
  const realVelocity = toRef(() => controller.realVelocity)

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
    [stopped, () => ({ ...input.value }), () => ({ ...optionsRef.value })],
    ([stopped, input, options], [prevStopped, prevInput]) => {
      if (stopped && !prevStopped) {
        controller.stop({
          keepVelocity: relocating.value,
        })
      }

      controller.setOptions(options)

      if (!isSameStyle(input, prevInput)) {
        controller.setStyle(input, { animate: !stopped })
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
