import { describe, expectTypeOf, test } from 'vitest'
import { useSpring } from '../../src/vue/use-spring'

describe('useSpring type', () => {
  test('number value', () => {
    const { realValue, realVelocity } = useSpring(() => {
      return { width: 10 }
    })

    expectTypeOf(realValue.value.width).toEqualTypeOf<readonly number[]>()
    expectTypeOf(realVelocity.value.width).toEqualTypeOf<readonly number[]>()
  })

  test('string value', () => {
    const { realValue, realVelocity } = useSpring(() => ({
      width: `10px`,
    }))

    expectTypeOf(realValue.value.width).toEqualTypeOf<readonly number[]>()
    expectTypeOf(realVelocity.value.width).toEqualTypeOf<readonly number[]>()
  })
})
