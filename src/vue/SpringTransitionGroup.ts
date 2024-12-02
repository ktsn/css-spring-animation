import {
  ComponentOptions,
  PropType,
  TransitionGroup,
  TransitionGroupProps,
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

interface SpringTransitionGroupProps
  extends Omit<SpringTransitionProps, 'mode'> {
  tag?: string
  bounce?: number | { move?: number; enter?: number; leave?: number }
  duration?: number | { move?: number; enter?: number; leave?: number }
}

function omit<T extends Record<string, unknown>, K extends string>(
  object: T,
  omitKey: K,
): { [Key in Exclude<keyof T, K>]: T[Key] } {
  const { [omitKey]: _, ...rest } = object
  return rest
}

const springTransitionGroupProps = {
  ...omit(springTransitionProps, 'mode'),

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
    const attrs: TransitionGroupProps = ctx.attrs

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
        ...attrs,
        tag: props.tag,
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
          controller.stop({
            keepVelocity: true,
          })

          controller.setStyle(
            {
              ...props.springStyle,
              transform: '',
            },
            {
              animate: false,
            },
          )

          // Clean up enter classes that <TransitionGroup> set.
          cleanUpEnterClass(el)
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
          { animate: false },
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

    function cleanUpEnterClass(el: Element): void {
      const name = attrs.name ?? 'v'
      const enterFromClass = attrs.enterFromClass ?? `${name}-enter-from`
      const enterActiveClass = attrs.enterActiveClass ?? `${name}-enter-active`
      const enterToClass = attrs.enterToClass ?? `${name}-enter-to`

      el.classList.remove(enterFromClass)
      el.classList.remove(enterActiveClass)
      el.classList.remove(enterToClass)
    }

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
