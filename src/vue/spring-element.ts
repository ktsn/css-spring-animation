import { PropType, defineComponent, h, ref } from 'vue'

import { AnimateValue } from '../core'
import { SpringStyleValue } from '../core/spring-value'
import { useSpring } from './use-spring'

const createSpringElement = (tagName: string) => {
  return defineComponent({
    name: 'SpringElement',

    props: {
      tag: {
        type: String,
        default: tagName,
      },
      springStyle: {
        type: Object as PropType<Record<string, AnimateValue | SpringStyleValue>>,
        required: true,
      },
      bounce: Number,
      duration: Number,
      disabled: Boolean,
    },

    emits: {
      springFinish: () => true,
      springSettle: () => true,
    },

    setup(props, { emit, slots }) {
      const elRef = ref<HTMLElement | null>(null)

      const { onFinish, onSettle } = useSpring(
        elRef,
        () => props.springStyle,
        () => {
          return {
            bounce: props.bounce,
            duration: props.duration,
            disabled: props.disabled,
          }
        },
      )

      onFinish(({ stopped }) => {
        if (!stopped) {
          emit('springFinish')
        }
      })

      onSettle(({ stopped }) => {
        if (!stopped) {
          emit('springSettle')
        }
      })

      return () => {
        return h(props.tag, { ref: elRef }, slots.default?.())
      }
    },
  })
}

const springElementRecord: Record<string, ReturnType<typeof createSpringElement>> = {}

/**
 * Render native HTML element with spring animation support.
 * Specify target element type as a property access (e.g. `spring.div`)
 */
export const spring = new Proxy(springElementRecord, {
  get: (record, tagName) => {
    const springElement = record[tagName as string]
    if (springElement) {
      return springElement
    }

    const created = createSpringElement(tagName as string)
    record[tagName as string] = created
    return created
  },
})
