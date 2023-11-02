import { PropType, Transition, computed, defineComponent, h } from 'vue'
import {
  AnimateValue,
  AnimationController,
  createAnimateController,
  forceReflow,
} from '../core'

// sc = Spring Controller
export const scKey = Symbol('SpringController')

export function createStyleSetter(
  el: HTMLElement,
): (style: Record<string, string>) => void {
  return (style) => {
    for (const key in style) {
      if (key.startsWith('--')) {
        el.style.setProperty(key, style[key] ?? '')
      } else {
        el.style[key as any] = style[key] ?? ''
      }
    }
  }
}

export function useTransitionHooks(
  props: SpringTransitionProps,
  emit: SpringTransitionEmits,
) {
  const bounce = computed(() => {
    return typeof props.bounce === 'number'
      ? {
          enter: props.bounce,
          leave: props.bounce,
        }
      : props.bounce
  })

  const defaultDuration = 1000

  const duration = computed(() => {
    const value = props.duration ?? defaultDuration

    return typeof value === 'number'
      ? {
          enter: value,
          leave: value,
        }
      : value
  })

  function onBeforeEnter(el: Element): void {
    emit('beforeEnter', el)
  }

  function onAfterEnter(el: Element): void {
    emit('afterEnter', el)
  }

  function onEnterCancelled(el: Element): void {
    emit('enterCancelled', el)
  }

  function onEnter(_el: Element, done: () => void): void {
    const el = _el as HTMLElementWithController
    if (!el[scKey]) {
      el[scKey] = createAnimateController(createStyleSetter(el))

      el[scKey].setStyle(
        {
          ...props.springStyle,
          ...props.enterFrom,
        },
        false,
      )

      forceReflow()
    }
    const controller = el[scKey]

    controller.setOptions({
      bounce: bounce.value?.enter,
      duration: duration.value.enter,
    })

    controller.setStyle(props.springStyle)
    setTimeout(done, duration.value.enter)
  }

  function onLeave(_el: Element, done: () => void): void {
    const el = _el as HTMLElementWithController
    if (!el[scKey]) {
      el[scKey] = createAnimateController(createStyleSetter(el))
      el[scKey].setStyle(props.springStyle, false)

      forceReflow
    }
    const controller = el[scKey]

    controller.setOptions({
      bounce: bounce.value?.leave,
      duration: duration.value.leave,
    })

    controller.setStyle({
      ...props.springStyle,
      ...props.leaveTo,
    })
    setTimeout(done, duration.value.leave)
  }

  function onBeforeLeave(el: Element): void {
    emit('beforeLeave', el)
  }

  function onAfterLeave(_el: Element): void {
    const el = _el as HTMLElementWithController
    el[scKey]?.setStyle(
      {
        ...props.springStyle,
        ...props.enterFrom,
      },
      false,
    )

    emit('afterLeave', _el)
  }

  function onLeaveCancelled(el: Element): void {
    emit('leaveCancelled', el)
  }

  return {
    onBeforeEnter,
    onEnter,
    onAfterEnter,
    onEnterCancelled,
    onBeforeLeave,
    onLeave,
    onAfterLeave,
    onLeaveCancelled,
  }
}

export interface SpringTransitionProps {
  springStyle: Record<string, AnimateValue>
  enterFrom?: Record<string, AnimateValue>
  leaveTo?: Record<string, AnimateValue>
  bounce?: number | { enter: number; leave: number }
  duration?: number | { enter: number; leave: number }
}

export interface SpringTransitionEmits {
  (name: 'beforeEnter', el: Element): void
  (name: 'afterEnter', el: Element): void
  (name: 'enterCancelled', el: Element): void
  (name: 'beforeLeave', el: Element): void
  (name: 'afterLeave', el: Element): void
  (name: 'leaveCancelled', el: Element): void
}

export interface HTMLElementWithController extends HTMLElement {
  [scKey]?: AnimationController<Record<string, AnimateValue>>
}

export const springTransitionProps = {
  springStyle: {
    type: Object as PropType<Record<string, AnimateValue>>,
    required: true,
  },

  enterFrom: Object as PropType<Record<string, AnimateValue>>,

  leaveTo: Object as PropType<Record<string, AnimateValue>>,

  bounce: [Number, Object] as PropType<
    number | { enter: number; leave: number }
  >,

  duration: [Number, Object] as PropType<
    number | { enter: number; leave: number }
  >,
} as const

export default defineComponent({
  props: springTransitionProps,

  setup(props, { emit, slots }) {
    const {
      onBeforeEnter,
      onEnter,
      onAfterEnter,
      onEnterCancelled,
      onBeforeLeave,
      onLeave,
      onAfterLeave,
      onLeaveCancelled,
    } = useTransitionHooks(props, emit)

    return () => {
      return h(
        Transition,
        {
          onBeforeEnter,
          onEnter,
          onAfterEnter,
          onEnterCancelled,
          onBeforeLeave,
          onLeave,
          onAfterLeave,
          onLeaveCancelled,
        },
        slots.default,
      )
    }
  },
})
