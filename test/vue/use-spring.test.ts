import { describe, expect, test } from 'vitest'
import { useSpring } from '../../src/vue/use-spring'
import { nextTick, ref } from 'vue'

describe('useSpring', () => {
  test('return style value', () => {
    const { style } = useSpring(() => {
      return {
        width: 10,
      }
    })

    expect(style.value.width).toBe('10')
  })

  test('update style value immediately when disabled', async () => {
    const value = ref(10)

    const { style } = useSpring(
      () => {
        return {
          width: value.value,
        }
      },
      {
        disabled: true,
      },
    )

    expect(style.value.width).toBe('10')
    value.value = 20
    await nextTick()
    expect(style.value.width).toBe('20')
  })

  test('register finish listener for the current animation', () => {
    const value = ref(10)

    const { style, onFinishCurrent } = useSpring(
      () => ({
        width: `${value.value}px`,
      }),
      {
        duration: 100,
      },
    )

    return new Promise<void>((resolve) => {
      value.value = 20
      onFinishCurrent(({ stopped }) => {
        expect(stopped).toBe(false)
        expect(style.value.width).not.toBe('10px')
        resolve()
      })
    })
  })

  test('register settle listener for the current animation', () => {
    const value = ref(10)

    const { style, onSettleCurrent } = useSpring(
      () => ({
        width: `${value.value}px`,
      }),
      {
        duration: 100,
      },
    )

    return new Promise<void>((resolve) => {
      value.value = 20
      onSettleCurrent(({ stopped }) => {
        expect(stopped).toBe(false)
        expect(style.value.width).toBe('20px')
        resolve()
      })
    })
  })

  test('stopped == true in onFinishCurrent when animation is stopped', () => {
    const value = ref(10)
    const disabled = ref(false)

    const { onFinishCurrent } = useSpring(
      () => ({
        width: `${value.value}px`,
      }),
      () => ({
        duration: 100,
        disabled: disabled.value,
      }),
    )

    value.value = 20

    return new Promise<void>((resolve) => {
      disabled.value = true
      onFinishCurrent(({ stopped }) => {
        expect(stopped).toBe(true)
        resolve()
      })
    })
  })

  test('stopped == true in onSettleCurrent when animation is stopped', () => {
    const value = ref(10)
    const disabled = ref(false)

    const { onSettleCurrent } = useSpring(
      () => ({
        width: `${value.value}px`,
      }),
      () => ({
        duration: 100,
        disabled: disabled.value,
      }),
    )

    value.value = 20

    return new Promise<void>((resolve) => {
      disabled.value = true
      onSettleCurrent(({ stopped }) => {
        expect(stopped).toBe(true)
        resolve()
      })
    })
  })
})
