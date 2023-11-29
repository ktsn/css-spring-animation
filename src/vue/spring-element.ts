import { PropType, defineComponent, h } from 'vue'
import { AnimateValue } from '../core'
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
    },

    setup(props, { slots }) {
      const { style } = useSpring(
        () => props.springStyle,
        () => {
          return {
            bounce: props.bounce,
            duration: props.duration,
          }
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
