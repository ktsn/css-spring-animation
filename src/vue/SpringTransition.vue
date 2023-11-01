<script setup lang="ts">
import { computed } from 'vue'
import {
  AnimateValue,
  AnimationController,
  createAnimateController,
  forceReflow,
} from '../core'

export interface SpringTransitionProps {
  springStyle: Record<string, AnimateValue>
  enterFrom?: Record<string, AnimateValue>
  leaveTo?: Record<string, AnimateValue>
  bounce?: number
  duration?: number
}

const props = withDefaults(defineProps<SpringTransitionProps>(), {
  duration: 1000,
})

const emit = defineEmits<{
  beforeEnter: [el: Element]
  afterEnter: [el: Element]
  enterCancelled: [el: Element]
  beforeLeave: [el: Element]
  afterLeave: [el: Element]
  leaveCancelled: [el: Element]
}>()

interface HTMLElementWithController extends HTMLElement {
  __springController?: AnimationController<Record<string, AnimateValue>>
}

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

async function onEnter(_el: Element, done: () => void): Promise<void> {
  const el = _el as HTMLElementWithController
  if (!el.__springController) {
    el.__springController = createAnimateController(createStyleSetter(el))

    el.__springController.setStyle(
      {
        ...props.springStyle,
        ...props.enterFrom,
      },
      false,
    )

    forceReflow()
  }
  const controller = el.__springController

  controller.setOptions({
    bounce: bounce.value?.enter,
    duration: duration.value.enter,
  })

  controller.setStyle(props.springStyle)
  setTimeout(done, duration.value.enter)
}

function onLeave(_el: Element, done: () => void): void {
  const el = _el as HTMLElementWithController
  if (!el.__springController) {
    el.__springController = createAnimateController(createStyleSetter(el))
    el.__springController.setStyle(props.springStyle, false)

    forceReflow
  }
  const controller = el.__springController

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

function createStyleSetter(
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

function onBeforeLeave(el: Element): void {
  emit('beforeLeave', el)
}

function onAfterLeave(_el: Element): void {
  const el = _el as HTMLElementWithController
  el.__springController?.setStyle(
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
</script>

<template>
  <Transition
    :css="false"
    @before-enter="onBeforeEnter"
    @enter="onEnter"
    @after-enter="onAfterEnter"
    @enter-cancelled="onEnterCancelled"
    @before-leave="onBeforeLeave"
    @leave="onLeave"
    @after-leave="onAfterLeave"
    @leave-cancelled="onLeaveCancelled"
  >
    <slot></slot>
  </Transition>
</template>
