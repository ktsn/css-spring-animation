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

    expect(style.value.width).toBe('10')
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

    expect(style.value.width).toBe('10')
    value.value = 20
    await nextTick()
    expect(style.value.width).toBe('20')
  })
})
