import { describe, expectTypeOf, test } from 'vitest'
import { useSpring } from '../../src/vue/use-spring'
import { s } from '../../src/core'

describe('useSpring type', () => {
  test('number value', () => {
    const { realValue, realVelocity } = useSpring(() => {
      return { width: 10 }
    })

    expectTypeOf(realValue.value.width).toEqualTypeOf<readonly number[]>()
    expectTypeOf(realVelocity.value.width).toEqualTypeOf<readonly number[]>()
  })

  test('spring style value', () => {
    const { realValue, realVelocity } = useSpring(() => ({
      width: s`${10}px`,
    }))

    expectTypeOf(realValue.value.width).toEqualTypeOf<readonly number[]>()
    expectTypeOf(realVelocity.value.width).toEqualTypeOf<readonly number[]>()
  })
})
