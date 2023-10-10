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
        unit: 'em',
      },
    )

    expectTypeOf(ctx.current).toEqualTypeOf<number>()
    expectTypeOf(ctx.velocity).toEqualTypeOf<number>()
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
        unit: {
          x: 'em',
          y: 'em',
        },
      },
    )

    expectTypeOf(ctx.current).toEqualTypeOf<{ x: number; y: number }>()
    expectTypeOf(ctx.velocity).toEqualTypeOf<{ x: number; y: number }>()
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

  test('multiple value: disallow single velocity or unit', () => {
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

    // @ts-expect-error Type 'string' has no properties in common with type 'Partial<Record<"x" | "y", string>>'
    animate(
      {
        x: [0, 100],
        y: [0, 100],
      },
      (values) => {
        expectTypeOf(values).toEqualTypeOf<{ x: string; y: string }>()
      },
      {
        unit: 'em',
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

    // @ts-expect-error Type '{ x: string; y: string; z: string; }' is not assignable to type 'Partial<Record<"x" | "y", string>>'.
    animate(
      {
        x: [0, 100],
        y: [0, 100],
      },
      (values) => {
        expectTypeOf(values).toEqualTypeOf<{ x: string; y: string }>()
      },
      {
        unit: {
          x: 'em',
          y: 'em',
          z: 'em',
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

  test('multiple value: unit properties are optional', () => {
    animate(
      {
        x: [0, 100],
        y: [0, 100],
      },
      (values) => {
        expectTypeOf(values).toEqualTypeOf<{ x: string; y: string }>()
      },
      {
        unit: {},
      },
    )
  })
})
