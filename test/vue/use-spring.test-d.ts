import { describe, expectTypeOf, test } from 'vitest'
import { useSpring, useSpringStyle } from '../../src/vue/use-spring'

describe('useSpring type', () => {
  test('single value', () => {
    const { realValue, realVelocity } = useSpring(
      () => 10,
      (value) => {
        expectTypeOf(value).toEqualTypeOf<string>()
        return {}
      },
      {
        velocity: 10,
      },
    )

    expectTypeOf(realValue.value).toEqualTypeOf<number>()
    expectTypeOf(realVelocity.value).toEqualTypeOf<number>()
  })

  test('single value does not allow multiple velocity', () => {
    // @ts-expect-error
    useSpring(
      () => 10,
      (value) => {
        expectTypeOf(value).toEqualTypeOf<string>()
        return {}
      },
      {
        velocity: {
          x: 10,
          y: 10,
        },
      },
    )
  })

  test('multiple values', () => {
    const { realValue, realVelocity } = useSpring(
      () => ({
        x: 10,
        y: 20,
      }),
      (values) => {
        expectTypeOf(values).toEqualTypeOf<{ x: string; y: string }>()
        return {}
      },
      {
        velocity: {
          x: 10,
          y: 10,
        },
      },
    )

    expectTypeOf(realValue.value).toEqualTypeOf<{ x: number; y: number }>()
    expectTypeOf(realVelocity.value).toEqualTypeOf<{ x: number; y: number }>()
  })

  test('multiple value does not allow single velocity', () => {
    // @ts-expect-error
    useSpring(
      () => ({
        x: 10,
        y: 20,
      }),
      (values) => {
        expectTypeOf(values).toEqualTypeOf<{ x: string; y: string }>()
        return {}
      },
      {
        velocity: 10,
      },
    )
  })
})

describe('useSpringStyle type', () => {
  test('single value', () => {
    useSpringStyle(
      () => 10,
      (value) => {
        expectTypeOf(value).toEqualTypeOf<string>()
        return {}
      },
      {
        velocity: 10,
      },
    )
  })

  test('single value does not allow multiple velocity', () => {
    // @ts-expect-error
    useSpringStyle(
      () => 10,
      (value) => {
        expectTypeOf(value).toEqualTypeOf<string>()
        return {}
      },
      {
        velocity: {
          x: 10,
          y: 10,
        },
      },
    )
  })

  test('multiple values', () => {
    useSpringStyle(
      () => ({
        x: 10,
        y: 20,
      }),
      (values) => {
        expectTypeOf(values).toEqualTypeOf<{ x: string; y: string }>()
        return {}
      },
      {
        velocity: {
          x: 10,
          y: 10,
        },
      },
    )
  })

  test('multiple value does not allow single velocity', () => {
    // @ts-expect-error
    useSpringStyle(
      () => ({
        x: 10,
        y: 20,
      }),
      (values) => {
        expectTypeOf(values).toEqualTypeOf<{ x: string; y: string }>()
        return {}
      },
      {
        velocity: 10,
      },
    )
  })
})
