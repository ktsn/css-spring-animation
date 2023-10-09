import { describe, expect, test } from 'vitest'
import { createSpring, springValue, springVelocity } from '../src/spring'

function toMostlyEqual(actual: number, expected: number) {
  expect(Math.abs(actual - expected)).toBeLessThan(0.000001)
}

describe('spring', () => {
  describe('value constraints', () => {
    describe('initial value must mostly equal to "from" value', () => {
      test('bounce > 0', () => {
        const spring = createSpring({
          bounce: 0.2,
          duration: 1000,
        })

        toMostlyEqual(
          springValue(spring, {
            from: 100,
            to: 200,
            initialVelocity: 0,
            time: 0,
          }),
          100,
        )

        toMostlyEqual(
          springValue(spring, {
            from: 0,
            to: 200,
            initialVelocity: 1000,
            time: 0,
          }),
          0,
        )
      })

      test('bounce = 0', () => {
        const spring = createSpring({
          bounce: 0,
          duration: 1000,
        })

        toMostlyEqual(
          springValue(spring, {
            from: 100,
            to: 200,
            initialVelocity: 0,
            time: 0,
          }),
          100,
        )

        toMostlyEqual(
          springValue(spring, {
            from: 0,
            to: 200,
            initialVelocity: 1000,
            time: 0,
          }),
          0,
        )
      })

      test('bounce < 0', () => {
        const spring = createSpring({
          bounce: -0.2,
          duration: 1000,
        })

        toMostlyEqual(
          springValue(spring, {
            from: 100,
            to: 200,
            initialVelocity: 0,
            time: 0,
          }),
          100,
        )

        toMostlyEqual(
          springValue(spring, {
            from: 0,
            to: 200,
            initialVelocity: 1000,
            time: 0,
          }),
          0,
        )
      })
    })
  })

  describe('velocity constraints', () => {
    describe('velocity when time = 0 must mostly equal to initialVelocity value', () => {
      test('bounce > 0', () => {
        const spring = createSpring({
          bounce: 0.2,
          duration: 1000,
        })

        toMostlyEqual(
          springVelocity(spring, {
            from: 0,
            to: 100,
            initialVelocity: 0,
            time: 0,
          }),
          0,
        )

        toMostlyEqual(
          springVelocity(spring, {
            from: 0,
            to: 100,
            initialVelocity: 1000,
            time: 0,
          }),
          1000,
        )
      })

      test('bounce = 0', () => {
        const spring = createSpring({
          bounce: 0,
          duration: 1000,
        })

        toMostlyEqual(
          springVelocity(spring, {
            from: 0,
            to: 100,
            initialVelocity: 0,
            time: 0,
          }),
          0,
        )

        toMostlyEqual(
          springVelocity(spring, {
            from: 0,
            to: 100,
            initialVelocity: 1000,
            time: 0,
          }),
          1000,
        )
      })

      test('bounce < 0', () => {
        const spring = createSpring({
          bounce: -0.2,
          duration: 1000,
        })

        toMostlyEqual(
          springVelocity(spring, {
            from: 0,
            to: 100,
            initialVelocity: 0,
            time: 0,
          }),
          0,
        )

        toMostlyEqual(
          springVelocity(spring, {
            from: 0,
            to: 100,
            initialVelocity: 1000,
            time: 0,
          }),
          1000,
        )
      })
    })
  })
})
