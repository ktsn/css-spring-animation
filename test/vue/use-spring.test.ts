import { describe, expect, test } from 'vitest'
import { useSpringStyle } from '../../src/vue/use-spring'
import { nextTick, ref } from 'vue'

describe('useSpringStyle', () => {
  test('return style value', () => {
    const style = useSpringStyle(
      () => 10,
      (width) => {
        return {
          width,
        }
      },
    )

    expect(style.value.width).toBe('10px')
  })

  test('specify unit', () => {
    const style = useSpringStyle(
      () => 10,
      (width) => {
        return {
          width,
        }
      },
      {
        unit: '%',
      },
    )

    expect(style.value.width).toBe('10%')
  })

  test('specify different units for multiple values', () => {
    const style = useSpringStyle(
      () => {
        return {
          width: 10,
          height: 10,
          top: 10,
        }
      },
      (value) => {
        return {
          width: value.width,
          height: value.height,
          top: value.top,
        }
      },
      {
        unit: {
          width: '%',
          height: 'em',
        },
      },
    )

    expect(style.value.width).toBe('10%')
    expect(style.value.height).toBe('10em')
    expect(style.value.top).toBe('10px')
  })

  test('update style value immediately when disabled', async () => {
    const value = ref(10)

    const style = useSpringStyle(
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

    expect(style.value.width).toBe('10px')
    value.value = 20
    await nextTick()
    expect(style.value.width).toBe('20px')
  })
})
