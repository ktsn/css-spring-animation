import {
  ComponentOptions,
  PropType,
  TransitionGroup,
  VNode,
  computed,
  defineComponent,
  onUpdated,
  vShow,
} from 'vue'
import {
  HTMLElementWithController,
  SpringTransitionProps,
  createStyleSetter,
  scKey,
  springTransitionProps,
  useTransitionHooks,
} from './SpringTransition.ts'
import { createAnimateController, forceReflow } from './index.ts'

interface SpringTransitionGroupProps extends SpringTransitionProps {
  tag?: string
  bounce?: number | { move?: number; enter?: number; leave?: number }
  duration?: number | { move?: number; enter?: number; leave?: number }
}

const springTransitionGroupProps = {
  ...springTransitionProps,

  tag: String,

  bounce: [Number, Object] as PropType<
    number | { move?: number; enter?: number; leave?: number }
  >,

  duration: [Number, Object] as PropType<
    number | { move?: number; enter?: number; leave?: number }
  >,
}

interface Position {
  left: number
  top: number
}

const positionMap = new WeakMap<VNode, Position>()
const newPositionMap = new WeakMap<VNode, Position>()

const SpringTransitionGroup = defineComponent({
  name: 'SpringTransitionGroup',
  inheritAttrs: false,
  props: springTransitionGroupProps,

  setup(props, ctx) {
    const { emit } = ctx

    let prevChildren: VNode[] = []
    let children: VNode[] = []

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

    const baseRender = (TransitionGroup as unknown as ComponentOptions).setup!(
      {
        tag: props.tag,
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
      ctx,
    )

    const moveBounce = computed(() => {
      return typeof props.bounce === 'number'
        ? props.bounce
        : props.bounce?.move
    })

    const movedDuration = computed(() => {
      return typeof props.duration === 'number'
        ? props.duration
        : props.duration?.move
    })

    onUpdated(() => {
      if (prevChildren.length === 0) {
        return
      }

      const appearedKeys = new Set(
        children
          .filter((child) => {
            const vShowDir = child.dirs?.find((dir) => dir.dir === vShow)
            return !vShowDir || vShowDir.value
          })
          .map((child) => child.key),
      )

      const existingChildren = prevChildren.filter((child) => {
        return appearedKeys.has(child.key)
      })

      existingChildren.forEach((child) => {
        const el = child.el as HTMLElementWithController
        const controller = el[scKey]
        if (controller) {
          // Do not call setStyle here as it records wrong velocity.
          controller.stop()

          createStyleSetter(el)({
            ...props.springStyle,
            transform: '',
          })
        }
      })

      existingChildren.forEach((child) => {
        const el = child.el as Element
        newPositionMap.set(child, el.getBoundingClientRect())
      })

      const moved = existingChildren.filter((child) => {
        const oldPos = positionMap.get(child)!
        const newPos = newPositionMap.get(child)!

        const dx = oldPos.left - newPos.left
        const dy = oldPos.top - newPos.top
        if (dx === 0 && dy === 0) {
          return false
        }

        const el = child.el as HTMLElementWithController
        if (!el[scKey]) {
          el[scKey] = createAnimateController(createStyleSetter(el))
        }
        const controller = el[scKey]

        controller.setOptions({
          bounce: moveBounce.value,
          duration: movedDuration.value,
        })
        controller.setStyle(
          {
            ...props.springStyle,
            transform: `translate(${dx}px, ${dy}px)`,
          },
          false,
        )

        return true
      })

      forceReflow()

      moved.forEach((child) => {
        const el = child.el as HTMLElementWithController
        const controller = el[scKey]!
        controller.setStyle({
          ...props.springStyle,
          transform: 'translate(0px, 0px)',
        })
      })
    })

    return () => {
      prevChildren = children
      const vnode = baseRender()
      children = vnode.children

      prevChildren.forEach((child) => {
        const el = child.el as Element
        positionMap.set(child, el.getBoundingClientRect())
      })

      return vnode
    }
  },
})

export default SpringTransitionGroup as unknown as {
  new (): {
    $props: SpringTransitionGroupProps
  }
}
