import { describe, expectTypeOf, test } from 'vitest'
import { animate } from '../../src/core/animate'

describe('animate type', () => {
  test('number value', () => {
    const ctx = animate(
      { scale: [0, 1] },
      (value) => {
        expectTypeOf(value).toEqualTypeOf<Record<string, string>>()
      },
      {
        velocity: { scale: [10] },
      },
    )

    expectTypeOf(ctx.realValue).toEqualTypeOf<{ scale: number[] }>()
    expectTypeOf(ctx.realVelocity).toEqualTypeOf<{ scale: number[] }>()
  })

  test('string values', () => {
    const ctx = animate(
      {
        width: [`0px`, `100px`],
      },
      (values) => {
        expectTypeOf(values).toEqualTypeOf<Record<string, string>>()
      },
      {
        velocity: {
          width: [10],
        },
      },
    )

    expectTypeOf(ctx.realValue).toEqualTypeOf<{ width: number[] }>()
    expectTypeOf(ctx.realVelocity).toEqualTypeOf<{ width: number[] }>()
  })

  test('disallow extra velocity property', () => {
    animate(
      {
        x: [0, 100],
        y: [0, 100],
      },
      () => {},
      {
        velocity: {
          x: [10],
          y: [10],
          // @ts-expect-error Type '{ x: number[]; y: number[]; z: number[]; }' is not assignable to type 'Partial<Record<"x" | "y", number[]>>'.
          z: [10],
        },
      },
    )
  })

  test('velocity properties are optional', () => {
    animate(
      {
        x: [0, 100],
        y: [0, 100],
      },
      () => {},
      {
        velocity: {
          x: [],
        },
      },
    )
  })
})
