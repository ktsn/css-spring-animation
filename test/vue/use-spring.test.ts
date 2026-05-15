import { describe, expect, test } from 'vitest'
import { useSpring } from '../../src/vue/use-spring'
import { nextTick, ref } from 'vue'

describe('useSpring', () => {
  test('apply initial style on the element synchronously', () => {
    const el = document.createElement('div')
    useSpring(el, () => {
      return {
        width: `10px`,
      }
    })

    expect(el.style.width).toBe('10px')
  })

  test('update style value immediately when disabled', async () => {
    const el = document.createElement('div')
    const value = ref(10)

    useSpring(
      el,
      () => {
        return {
          width: `${value.value}px`,
        }
      },
      {
        disabled: true,
      },
    )

    expect(el.style.width).toBe('10px')
    value.value = 20
    await nextTick()
    expect(el.style.width).toBe('20px')
  })

  test('register finish listener for the current animation', () => {
    const el = document.createElement('div')
    const value = ref(10)

    const { onFinishCurrent } = useSpring(
      el,
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
        resolve()
      })
    })
  })

  test('register settle listener for the current animation', () => {
    const el = document.createElement('div')
    const value = ref(10)

    const { onSettleCurrent } = useSpring(
      el,
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
        expect(el.style.width).toBe('20px')
        resolve()
      })
    })
  })

  test('stopped == true in onFinishCurrent when animation is stopped', () => {
    const el = document.createElement('div')
    const value = ref(10)
    const disabled = ref(false)

    const { onFinishCurrent } = useSpring(
      el,
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
    const el = document.createElement('div')
    const value = ref(10)
    const disabled = ref(false)

    const { onSettleCurrent } = useSpring(
      el,
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
