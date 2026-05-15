import {
  MaybeRefOrGetter,
  Ref,
  computed,
  nextTick,
  onScopeDispose,
  toValue,
  watch,
} from 'vue'
import {
  AnimateValue,
  AnimationController,
  AnimationTarget,
  SpringOptions,
  createAnimateController,
} from '../core'
import { isSameStyle } from '../core/controller'
import { interpolateParsedStyle } from '../core/style'

type RefOrGetter<T> = Ref<T> | (() => T)

export interface UseSpringOptions extends SpringOptions {
  disabled?: boolean
  inferVelocity?: boolean
}

export interface UseSpringResult {
  onFinish: (fn: (data: { stopped: boolean }) => void) => void
  onSettle: (fn: (data: { stopped: boolean }) => void) => void
  onFinishCurrent: (fn: (data: { stopped: boolean }) => void) => void
  onSettleCurrent: (fn: (data: { stopped: boolean }) => void) => void
}

export function useSpring<Style extends Record<string, AnimateValue>>(
  element: MaybeRefOrGetter<AnimationTarget | null | undefined>,
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

  let controller:
    | AnimationController<Record<keyof Style, AnimateValue>>
    | undefined

  function attachController(target: AnimationTarget): void {
    controller = createAnimateController(target)
    controller.setStyle(input.value, { animate: false })
    controller.setOptions(optionsRef.value)
  }

  const initialEl = toValue(element)
  if (initialEl) {
    attachController(initialEl)
  }

  // Track element ref changes (ref flipping null → element on mount, etc.).
  // `flush: 'sync'` so the controller is created and the initial style is
  // applied to the element in the same tick the template ref is populated,
  // so callers can observe `el.style` synchronously after mount.
  watch(
    () => toValue(element),
    (el, prevEl) => {
      if (el === prevEl) return
      if (controller) {
        controller.dispose()
        controller = undefined
      }
      if (el) {
        attachController(el)
      }
    },
    { flush: 'sync' },
  )

  function onFinishCurrent(fn: (data: { stopped: boolean }) => void): void {
    // Wait for the next tick to ensure that input changes in the same tick
    // triggers a new animation that is a case like:
    //
    // springStyle.value = { width: '100px' }
    // onFinishCurrent(() => {
    //   ...
    // })
    nextTick().then(() => {
      if (controller) {
        controller.onFinishCurrent(fn)
      } else {
        fn({ stopped: false })
      }
    })
  }

  function onSettleCurrent(fn: (data: { stopped: boolean }) => void): void {
    nextTick().then(() => {
      if (controller) {
        controller.onSettleCurrent(fn)
      } else {
        fn({ stopped: false })
      }
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
      if (!controller) return

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

  onScopeDispose(() => {
    if (controller) {
      controller.dispose()
      controller = undefined
    }
  })

  return {
    onFinish,
    onSettle,
    onFinishCurrent,
    onSettleCurrent,
  }
}
