import { describe, expect, test } from 'vitest'
import { createSpring, springValue, springVelocity } from '../src/spring'

function toMostlyEqual(actual: number, expected: number, tolerance = 0.000001) {
  expect(actual).toBeLessThan(expected + tolerance)
  expect(actual).toBeGreaterThan(expected - tolerance)
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
    test('return actual number when there is no gap between from and to', () => {
      const spring = createSpring({
        bounce: 0.2,
        duration: 1000,
      })

      toMostlyEqual(
        springVelocity(spring, {
          from: 100,
          to: 100,
          initialVelocity: 0,
          time: 0,
        }),
        0,
      )

      toMostlyEqual(
        springVelocity(spring, {
          from: 100,
          to: 100,
          initialVelocity: 1000,
          time: 0,
        }),
        1000,
      )
    })

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

  describe('settling duration constraints', () => {
    describe('value when time = settlingDuration must mostly equal to "to" value', () => {
      test('bounce > 0', () => {
        const duration = 3000

        const spring = createSpring({
          bounce: 0.2,
          duration,
        })

        toMostlyEqual(
          springValue(spring, {
            from: 0,
            to: 100,
            initialVelocity: 0,
            time:
              spring.settlingDuration({
                from: 0,
                to: 100,
              }) / duration,
          }),
          100,
          0.01,
        )

        toMostlyEqual(
          springValue(spring, {
            from: 0,
            to: 100,
            initialVelocity: 6000,
            time:
              spring.settlingDuration({
                from: 0,
                to: 100,
              }) / duration,
          }),
          100,
          0.01,
        )
      })

      test('bounce = 0', () => {
        const duration = 3000

        const spring = createSpring({
          bounce: 0,
          duration,
        })

        toMostlyEqual(
          springValue(spring, {
            from: 0,
            to: 100,
            initialVelocity: 0,
            time:
              spring.settlingDuration({
                from: 0,
                to: 100,
              }) / duration,
          }),
          100,
          0.01,
        )

        toMostlyEqual(
          springValue(spring, {
            from: 0,
            to: 100,
            initialVelocity: 6000,
            time: spring.settlingDuration({
              from: 0,
              to: 100,
            }),
          }),
          100,
          0.01,
        )
      })

      test('bounce < 0', () => {
        const duration = 3000

        const spring = createSpring({
          bounce: -0.2,
          duration,
        })

        toMostlyEqual(
          springValue(spring, {
            from: 0,
            to: 100,
            initialVelocity: 0,
            time:
              spring.settlingDuration({
                from: 0,
                to: 100,
              }) / duration,
          }),
          100,
          0.01,
        )

        toMostlyEqual(
          springValue(spring, {
            from: 0,
            to: 100,
            initialVelocity: 6000,
            time:
              spring.settlingDuration({
                from: 0,
                to: 100,
              }) / duration,
          }),
          100,
          0.01,
        )
      })
    })
  })
})
