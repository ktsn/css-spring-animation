import { describe, expect, test } from 'vitest'
import { useSpring } from '../../src/vue/use-spring'
import { nextTick, ref } from 'vue'

describe('useSpring', () => {
  test('return style value', () => {
    const { style } = useSpring(
      () => 10,
      (width) => {
        return {
          width,
        }
      },
    )

    expect(style.value.width).toBe('10')
  })

  test('update style value immediately when disabled', async () => {
    const value = ref(10)

    const { style } = useSpring(
      value,
      (width) => {
        return {
          width,
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

  test('return real values', async () => {
    const value = ref(10)

    const { realValue: values1 } = useSpring(value, () => ({}), {
      duration: 10,
    })
    expect(values1.value).toBe(10)

    value.value = 20
    expect(values1.value).toBe(10)
    await nextTick()
    expect(values1.value).not.toBe(10)
    expect(values1.value).not.toBe(20)

    const { realValue: values2 } = useSpring(
      () => ({
        width: 10,
        height: 20,
      }),
      () => ({}),
      {
        duration: 10,
      },
    )
    expect(values2.value).toEqual({
      width: 10,
      height: 20,
    })
  })

  test('return input value as real value when disabled', async () => {
    const value = ref(10)

    const { realValue } = useSpring(value, () => ({}), {
      disabled: true,
    })

    expect(realValue.value).toBe(10)
    value.value = 20
    expect(realValue.value).toBe(20)
  })

  test('return real velocity', async () => {
    const value = ref(10)

    const { realVelocity: velocity1 } = useSpring(value, () => ({}), {
      duration: 10,
      velocity: 100,
    })
    expect(velocity1.value).toBe(0)

    value.value = 20
    expect(velocity1.value).toBe(0)
    await nextTick()
    expect(velocity1.value).not.toBe(0)

    const { realVelocity: velocity2 } = useSpring(
      () => ({
        width: 10,
        height: 20,
      }),
      () => ({}),
      {
        duration: 10,
        velocity: {
          width: 100,
          height: 100,
        },
      },
    )
    expect(velocity2.value).toEqual({
      width: 0,
      height: 0,
    })
  })
})
