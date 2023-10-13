import { describe, expectTypeOf, test } from 'vitest'
import { useSpring, useSpringStyle } from '../../src/vue/use-spring'
import { s } from '../../src/core'

describe('useSpring type', () => {
  test('number value', () => {
    const { realValue, realVelocity } = useSpring(
      () => {
        return { width: 10 }
      },
      {
        velocity: {
          width: [10],
        },
      },
    )

    expectTypeOf(realValue.value.width).toEqualTypeOf<readonly number[]>()
    expectTypeOf(realVelocity.value.width).toEqualTypeOf<readonly number[]>()
  })

  test('spring style value', () => {
    const { realValue, realVelocity } = useSpring(
      () => ({
        width: s`${10}px`,
      }),
      {
        velocity: {
          width: [10],
        },
      },
    )

    expectTypeOf(realValue.value.width).toEqualTypeOf<readonly number[]>()
    expectTypeOf(realVelocity.value.width).toEqualTypeOf<readonly number[]>()
  })
})

describe('useSpringStyle type', () => {
  test('number value', () => {
    useSpringStyle(
      () => ({
        width: 10,
      }),
      {
        velocity: {
          width: [10],
        },
      },
    )
  })

  test('spring style value', () => {
    useSpringStyle(
      () => ({
        width: s`${10}px`,
      }),
      {
        velocity: {
          width: [10],
        },
      },
    )
  })
})
