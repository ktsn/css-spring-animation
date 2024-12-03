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

  test('update style value immediately when relocating', async () => {
    const value = ref(10)

    const { style } = useSpring(
      () => {
        return {
          width: value.value,
        }
      },
      () => {
        return {
          relocating: true,
        }
      },
    )

    expect(style.value.width).toBe('10')
    value.value = 20
    await nextTick()
    expect(style.value.width).toBe('20')
  })

  test('return real values', async () => {
    const value = ref(10)

    const { realValue: realValues1 } = useSpring(
      () => ({
        width: value.value,
      }),
      {
        duration: 10,
      },
    )
    expect(realValues1.value.width).toEqual([10])

    value.value = 20
    expect(realValues1.value.width).toEqual([10])
    await nextTick()
    expect(realValues1.value.width).not.toEqual([10])
    expect(realValues1.value.width).not.toEqual([20])
  })

  test('return input value as real value when disabled', async () => {
    const value = ref(10)

    const { realValue } = useSpring(
      () => ({
        width: value.value,
      }),
      {
        disabled: true,
      },
    )

    expect(realValue.value.width).toEqual([10])
    value.value = 20
    await nextTick()
    expect(realValue.value.width).toEqual([20])
  })

  test('return input value as real value when relocating', async () => {
    const value = ref(10)

    const { realValue } = useSpring(
      () => ({
        width: value.value,
      }),
      () => {
        return {
          relocating: true,
        }
      },
    )

    expect(realValue.value.width).toEqual([10])
    value.value = 20
    await nextTick()
    expect(realValue.value.width).toEqual([20])
  })

  test('return real value after stopped', async () => {
    const value = ref(10)
    const disabled = ref(false)

    const { realValue } = useSpring(
      () => ({
        width: value.value,
      }),
      () => {
        return {
          disabled: disabled.value,
        }
      },
    )

    expect(realValue.value.width).toEqual([10])
    value.value = 20
    await nextTick()
    disabled.value = true
    await nextTick()
    expect(realValue.value.width).not.toEqual([10])
    expect(realValue.value.width).not.toEqual([20])
  })

  test('return real velocity on animation', async () => {
    const value = ref(10)

    const { realVelocity: velocity1 } = useSpring(
      () => ({
        width: value.value,
      }),
      {
        duration: 10,
      },
    )
    expect(velocity1.value.width).toEqual([0])

    value.value = 20
    expect(velocity1.value.width).toEqual([0])
    await nextTick()
    expect(velocity1.value.width).not.toEqual([0])
  })

  test('return real velocity when disabled', async () => {
    const value = ref(10)

    const { realVelocity } = useSpring(
      () => ({
        width: value.value,
      }),
      {
        duration: 10,
        disabled: true,
      },
    )
    expect(realVelocity.value.width).toEqual([0])

    value.value = 20
    expect(realVelocity.value.width).toEqual([0])
    await nextTick()
    expect(realVelocity.value.width).not.toEqual([0])
  })

  test('keep last real velocity when relocating', async () => {
    const value = ref(10)
    const relocating = ref(false)

    const { realVelocity } = useSpring(
      () => ({
        width: value.value,
      }),
      () => ({
        duration: 10,
        relocating: relocating.value,
      }),
    )
    expect(realVelocity.value.width).toEqual([0])

    // Animate to negative direction
    value.value = 0
    await nextTick()

    // Relocating to positive direction
    relocating.value = true
    value.value = 30
    await nextTick()

    // Velocity should be kept as negative
    expect(realVelocity.value.width[0]).toBeLessThan(0)
  })

  test('return 0 as real velocity after stopped', async () => {
    const value = ref(10)
    const disabled = ref(false)

    const { realVelocity } = useSpring(
      () => ({
        width: value.value,
      }),
      () => {
        return {
          disabled: disabled.value,
        }
      },
    )

    expect(realVelocity.value.width).toEqual([0])
    value.value = 20
    await nextTick()
    disabled.value = true
    await nextTick()
    expect(realVelocity.value.width).toEqual([0])
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

  test('stopped == true when animation is stopped', () => {
    const value = ref(10)
    const disabled = ref(false)

    const { style, realValue, onFinishCurrent } = useSpring(
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
        expect(style.value.width).toBe(realValue.value.width[0] + 'px')
        resolve()
      })
    })
  })
})
