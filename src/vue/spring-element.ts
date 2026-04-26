import { PropType, defineComponent, h, watch } from 'vue'
import { AnimateValue } from '../core'
import { isSameStyle } from '../core/controller'
import { useSpring } from './use-spring'

const createSpringElement = (tagName: string) => {
  return defineComponent({
    props: {
      springStyle: {
        type: Object as PropType<Record<string, AnimateValue>>,
        required: true,
      },
      bounce: Number,
      duration: Number,
      disabled: Boolean,
      relocating: Boolean,
    },

    emits: {
      springFinish: () => true,
      springSettle: () => true,
    },

    setup(props, { emit, slots }) {
      const { style, onFinishCurrent, onSettleCurrent } = useSpring(
        () => props.springStyle,
        () => {
          return {
            bounce: props.bounce,
            duration: props.duration,
            disabled: props.disabled,
            relocating: props.relocating,
          }
        },
      )

      watch(
        () => ({ ...props.springStyle }),
        (input, prevInput) => {
          if (
            props.disabled ||
            props.relocating ||
            isSameStyle(input, prevInput)
          ) {
            return
          }

          onFinishCurrent(({ stopped }) => {
            if (!stopped) {
              emit('springFinish')
            }
          })

          onSettleCurrent(({ stopped }) => {
            if (!stopped) {
              emit('springSettle')
            }
          })
        },
      )

      return () => {
        return h(tagName, { style: style.value }, slots.default?.())
      }
    },
  })
}

const springElementRecord: Record<
  string,
  ReturnType<typeof createSpringElement>
> = {}

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
