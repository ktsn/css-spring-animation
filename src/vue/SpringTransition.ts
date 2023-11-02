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
  emit: (name: string, el: Element) => void,
) {
  const bounce = computed(() => {
    return typeof props.bounce === 'number'
      ? {
          enter: props.bounce,
          leave: props.bounce,
        }
      : props.bounce
  })

  const duration = computed(() => {
    return typeof props.duration === 'number'
      ? {
          enter: props.duration,
          leave: props.duration,
        }
      : props.duration
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
      duration: duration.value?.enter,
    })

    const ctx = controller.setStyle(props.springStyle)
    ctx.finishingPromise.then(() => {
      if (ctx.stoppedDuration === undefined) {
        done()
      }
    })
  }

  function onLeave(_el: Element, done: () => void): void {
    const el = _el as HTMLElementWithController
    if (!el[scKey]) {
      el[scKey] = createAnimateController(createStyleSetter(el))
      el[scKey].setStyle(props.springStyle, false)

      forceReflow()
    }
    const controller = el[scKey]

    controller.setOptions({
      bounce: bounce.value?.leave,
      duration: duration.value?.leave,
    })

    const ctx = controller.setStyle({
      ...props.springStyle,
      ...props.leaveTo,
    })
    ctx.finishingPromise.then(() => {
      if (ctx.stoppedDuration === undefined) {
        done()
      }
    })
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
  bounce?: number | { enter?: number; leave?: number }
  duration?: number | { enter?: number; leave?: number }

  // Hooks
  onBeforeEnter?: (el: Element) => void
  onAfterEnter?: (el: Element) => void
  onEnterCancelled?: (el: Element) => void
  onBeforeLeave?: (el: Element) => void
  onAfterLeave?: (el: Element) => void
  onLeaveCancelled?: (el: Element) => void
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

const SpringTransition = defineComponent({
  name: 'SpringTransition',
  inheritAttrs: false,
  props: springTransitionProps,

  setup(props, { attrs, emit, slots }) {
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
          ...attrs,
          css: false,
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

export default SpringTransition as unknown as {
  new (): {
    $props: SpringTransitionProps
  }
}
