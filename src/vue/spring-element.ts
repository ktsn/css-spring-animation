import { PropType, defineComponent, h, watch } from 'vue'
import { AnimateValue } from '../core'
import { isSameStyle } from '../core/controller'
import { useSpring } from './use-spring'
import { SpringStyleValue, resolveSpringStyle } from './spring-value'

const createSpringElement = (tagName: string) => {
  return defineComponent({
    props: {
      springStyle: {
        type: Object as PropType<
          Record<string, AnimateValue | SpringStyleValue>
        >,
        required: true,
      },
      bounce: Number,
      duration: Number,
      disabled: Boolean,
      inferVelocity: { type: Boolean, default: true },
      /** @deprecated Use `disabled` with `:infer-velocity="false"` instead. */
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
            inferVelocity: props.inferVelocity,
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
            isSameStyle(
              resolveSpringStyle(input),
              resolveSpringStyle(prevInput),
            )
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
