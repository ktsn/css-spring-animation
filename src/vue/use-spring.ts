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
import {
  SpringComputed,
  SpringStyleValue,
  attachSpringValue,
  detachSpringValue,
  isSpringStyleValue,
  isSpringValue,
  resolveSpringStyle,
} from './spring-value'

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

type UseSpringStyleEntry = AnimateValue | SpringStyleValue

interface BindingLocation {
  key: string
  slotIndex: number
}

interface AttachmentRecord {
  attachment: { readValue(): number; readVelocity(): number }
  location: BindingLocation
}

export function useSpring<Style extends Record<string, UseSpringStyleEntry>>(
  styleMapper: RefOrGetter<Style>,
  options?: MaybeRefOrGetter<UseSpringOptions>,
): UseSpringResult<Record<keyof Style, number[]>> {
  const rawInput = computed(() => toValue(styleMapper))

  const input = computed(() => resolveSpringStyle(rawInput.value))

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

  const attachmentRecords = new Map<SpringComputed, AttachmentRecord>()

  watchEffect(() => {
    const raw = rawInput.value
    const next = new Map<SpringComputed, BindingLocation>()
    for (const key in raw) {
      const v = raw[key] as UseSpringStyleEntry
      if (isSpringStyleValue(v)) {
        v.slots.forEach((slot, slotIndex) => {
          if (isSpringValue(slot)) {
            next.set(slot, { key, slotIndex })
          }
        })
      }
    }

    for (const [sv, record] of attachmentRecords) {
      const newLoc = next.get(sv)
      if (
        !newLoc ||
        newLoc.key !== record.location.key ||
        newLoc.slotIndex !== record.location.slotIndex
      ) {
        detachSpringValue(sv, record.attachment)
        attachmentRecords.delete(sv)
      }
    }

    for (const [sv, loc] of next) {
      if (!attachmentRecords.has(sv)) {
        const attachment = {
          readValue: () =>
            controller.realValue[loc.key as keyof Style]?.[loc.slotIndex] ?? 0,
          readVelocity: () =>
            controller.realVelocity[loc.key as keyof Style]?.[loc.slotIndex] ??
            0,
        }
        attachSpringValue(sv, attachment)
        attachmentRecords.set(sv, { attachment, location: loc })
      }
    }
  })

  onScopeDispose(() => {
    for (const [sv, record] of attachmentRecords) {
      detachSpringValue(sv, record.attachment)
    }
    attachmentRecords.clear()
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
    [disabled, () => ({ ...input.value }), () => ({ ...optionsRef.value })],
    ([disabled, input, options], [prevDisabled, prevInput]) => {
      if (disabled && !prevDisabled) {
        controller.stop({
          keepVelocity: !inferVelocity.value,
        })
      }

      controller.setOptions(options)

      if (!isSameStyle(input, prevInput)) {
        controller.setStyle(input, { animate: !disabled })
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
