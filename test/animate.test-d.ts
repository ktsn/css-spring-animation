import { describe, expectTypeOf, test } from 'vitest'
import { animate } from '../src/animate'

describe('animate type', () => {
  test('single value', () => {
    const ctx = animate(
      [0, 100],
      (value) => {
        expectTypeOf(value).toEqualTypeOf<string>()
      },
      {
        velocity: 10,
      },
    )

    expectTypeOf(ctx.realValue).toEqualTypeOf<number>()
    expectTypeOf(ctx.realVelocity).toEqualTypeOf<number>()
  })

  test('multiple values', () => {
    const ctx = animate(
      {
        x: [0, 100],
        y: [0, 100],
      },
      (values) => {
        expectTypeOf(values).toEqualTypeOf<{ x: string; y: string }>()
      },
      {
        velocity: {
          x: 10,
          y: 10,
        },
      },
    )

    expectTypeOf(ctx.realValue).toEqualTypeOf<{ x: number; y: number }>()
    expectTypeOf(ctx.realVelocity).toEqualTypeOf<{ x: number; y: number }>()
  })

  test('single value: disallow multiple velocity or unit', () => {
    animate(
      [0, 100],
      (value) => {
        expectTypeOf(value).toEqualTypeOf<string>()
      },
      {
        // @ts-expect-error Type '{ x: number; y: number; }' is not assignable to type 'number'.
        velocity: {
          x: 10,
          y: 10,
        },
      },
    )

    animate(
      [0, 100],
      (value) => {
        expectTypeOf(value).toEqualTypeOf<string>()
      },
      {
        // @ts-expect-error Type '{ x: number; y: number; }' is not assignable to type 'string'.
        unit: {
          x: 'em',
          y: 'em',
        },
      },
    )
  })

  test('multiple value: disallow single velocity', () => {
    // @ts-expect-error Type 'number' is not assignable to type 'Record<"x" | "y", number>'
    animate(
      {
        x: [0, 100],
        y: [0, 100],
      },
      (values) => {
        expectTypeOf(values).toEqualTypeOf<{ x: string; y: string }>()
      },
      {
        velocity: 10,
      },
    )
  })

  test('multiple value: disallow extra property', () => {
    // @ts-expect-error Type '{ x: number; y: number; z: number; }' is not assignable to type 'Partial<Record<"x" | "y", number>>'.
    animate(
      {
        x: [0, 100],
        y: [0, 100],
      },
      (values) => {
        expectTypeOf(values).toEqualTypeOf<{ x: string; y: string }>()
      },
      {
        velocity: {
          x: 10,
          y: 10,
          z: 10,
        },
      },
    )
  })

  test('multiple value: velocity properties are optional', () => {
    animate(
      {
        x: [0, 100],
        y: [0, 100],
      },
      (values) => {
        expectTypeOf(values).toEqualTypeOf<{ x: string; y: string }>()
      },
      {
        velocity: {},
      },
    )
  })
})
