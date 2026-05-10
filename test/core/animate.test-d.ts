import { describe, expectTypeOf, test } from 'vitest'
import { animate } from '../../src/core/animate'

describe('animate type', () => {
  test('number value', () => {
    animate(
      { scale: [0, 1] },
      (value) => {
        expectTypeOf(value).toEqualTypeOf<Record<string, string>>()
      },
      {
        velocity: { scale: [10] },
      },
    )
  })

  test('string values', () => {
    animate(
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
