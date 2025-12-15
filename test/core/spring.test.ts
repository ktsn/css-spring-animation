import { describe, expect, test } from 'vitest'
import {
  createSpring,
  springSettlingDuration,
  evaluateSpring,
  evaluateSpringVelocity,
  springCSS,
  springGenerator,
} from '../../src/core/spring'

describe('spring', () => {
  describe('value constraints', () => {
    test('return actual animating value when from and to are the same', () => {
      const spring = createSpring({
        bounce: 0,
        duration: 1000,
      })

      expect(
        evaluateSpring(spring, {
          from: 0,
          to: 0,
          initialVelocity: 1000,
          time: 0.1,
        }),
      ).not.toBe(0)
    })

    describe('initial value must mostly equal to "from" value', () => {
      test('bounce > 0', () => {
        const spring = createSpring({
          bounce: 0.2,
          duration: 1000,
        })

        expect(
          evaluateSpring(spring, {
            from: 100,
            to: 200,
            initialVelocity: 0,
            time: 0,
          }),
        ).toBeCloseTo(100)

        expect(
          evaluateSpring(spring, {
            from: 0,
            to: 200,
            initialVelocity: 1000,
            time: 0,
          }),
        ).toBeCloseTo(0)
      })

      test('bounce = 0', () => {
        const spring = createSpring({
          bounce: 0,
          duration: 1000,
        })

        expect(
          evaluateSpring(spring, {
            from: 100,
            to: 200,
            initialVelocity: 0,
            time: 0,
          }),
        ).toBeCloseTo(100)

        expect(
          evaluateSpring(spring, {
            from: 0,
            to: 200,
            initialVelocity: 1000,
            time: 0,
          }),
        ).toBeCloseTo(0)
      })

      test('bounce < 0', () => {
        const spring = createSpring({
          bounce: -0.2,
          duration: 1000,
        })

        expect(
          evaluateSpring(spring, {
            from: 100,
            to: 200,
            initialVelocity: 0,
            time: 0,
          }),
        ).toBeCloseTo(100)

        expect(
          evaluateSpring(spring, {
            from: 0,
            to: 200,
            initialVelocity: 1000,
            time: 0,
          }),
        ).toBeCloseTo(0)
      })
    })
  })

  describe('velocity constraints', () => {
    test('return actual number when there is no gap between from and to', () => {
      const spring = createSpring({
        bounce: 0,
        duration: 1000,
      })

      expect(
        evaluateSpringVelocity(spring, {
          from: 100,
          to: 100,
          initialVelocity: 0,
          time: 0,
        }),
      ).toBeCloseTo(0)

      expect(
        evaluateSpringVelocity(spring, {
          from: 100,
          to: 100,
          initialVelocity: 1000,
          time: 0,
        }),
      ).toBeCloseTo(1000)
    })

    describe('velocity when time = 0 must mostly equal to initialVelocity value', () => {
      test('bounce > 0', () => {
        const spring = createSpring({
          bounce: 0.2,
          duration: 1000,
        })

        expect(
          evaluateSpringVelocity(spring, {
            from: 0,
            to: 100,
            initialVelocity: 0,
            time: 0,
          }),
        ).toBeCloseTo(0)

        expect(
          evaluateSpringVelocity(spring, {
            from: 0,
            to: 100,
            initialVelocity: 1000,
            time: 0,
          }),
        ).toBeCloseTo(1000)
      })

      test('bounce = 0', () => {
        const spring = createSpring({
          bounce: 0,
          duration: 1000,
        })

        expect(
          evaluateSpringVelocity(spring, {
            from: 0,
            to: 100,
            initialVelocity: 0,
            time: 0,
          }),
        ).toBeCloseTo(0)

        expect(
          evaluateSpringVelocity(spring, {
            from: 0,
            to: 100,
            initialVelocity: 1000,
            time: 0,
          }),
        ).toBeCloseTo(1000)
      })

      test('bounce < 0', () => {
        const spring = createSpring({
          bounce: -0.2,
          duration: 1000,
        })

        expect(
          evaluateSpringVelocity(spring, {
            from: 0,
            to: 100,
            initialVelocity: 0,
            time: 0,
          }),
        ).toBeCloseTo(0)

        expect(
          evaluateSpringVelocity(spring, {
            from: 0,
            to: 100,
            initialVelocity: 1000,
            time: 0,
          }),
        ).toBeCloseTo(1000)
      })
    })
  })

  describe('settling duration constraints', () => {
    test('return actual value that is greater than or equal to duration when there is no gap between from and to', () => {
      const spring = createSpring({
        bounce: 0,
        duration: 1000,
      })

      const actual = springSettlingDuration(spring, {
        from: 100,
        to: 100,
        initialVelocity: 0,
      })

      expect(Number.isFinite(actual)).toBe(true)
      expect(actual).toBeGreaterThanOrEqual(1000)
    })

    describe('value when time = settlingDuration must mostly equal to "to" value', () => {
      test('bounce > 0', () => {
        const duration = 3000

        const spring = createSpring({
          bounce: 0.2,
          duration,
        })

        expect(
          evaluateSpring(spring, {
            from: 0,
            to: 100,
            initialVelocity: 0,
            time:
              springSettlingDuration(spring, {
                from: 0,
                to: 100,
                initialVelocity: 0,
              }) / duration,
          }),
        ).toBeCloseTo(100, 0.01)

        expect(
          evaluateSpring(spring, {
            from: 0,
            to: 100,
            initialVelocity: 6000,
            time:
              springSettlingDuration(spring, {
                from: 0,
                to: 100,
                initialVelocity: 6000,
              }) / duration,
          }),
        ).toBeCloseTo(100, 0.01)
      })

      test('bounce = 0', () => {
        const duration = 3000

        const spring = createSpring({
          bounce: 0,
          duration,
        })

        expect(
          evaluateSpring(spring, {
            from: 0,
            to: 100,
            initialVelocity: 0,
            time:
              springSettlingDuration(spring, {
                from: 0,
                to: 100,
                initialVelocity: 0,
              }) / duration,
          }),
        ).toBeCloseTo(100, 0.01)

        expect(
          evaluateSpring(spring, {
            from: 0,
            to: 100,
            initialVelocity: 6000,
            time: springSettlingDuration(spring, {
              from: 0,
              to: 100,
              initialVelocity: 6000,
            }),
          }),
        ).toBeCloseTo(100, 0.01)
      })

      test('bounce < 0', () => {
        const duration = 3000

        const spring = createSpring({
          bounce: -0.2,
          duration,
        })

        expect(
          evaluateSpring(spring, {
            from: 0,
            to: 100,
            initialVelocity: 0,
            time:
              springSettlingDuration(spring, {
                from: 0,
                to: 100,
                initialVelocity: 0,
              }) / duration,
          }),
        ).toBeCloseTo(100, 0.01)

        expect(
          evaluateSpring(spring, {
            from: 0,
            to: 100,
            initialVelocity: 6000,
            time:
              springSettlingDuration(spring, {
                from: 0,
                to: 100,
                initialVelocity: 6000,
              }) / duration,
          }),
        ).toBeCloseTo(100, 0.05)
      })
    })
  })

  describe('springGenerator', () => {
    test('yields correct values at various time points', () => {
      const gen = springGenerator({
        from: 0,
        to: 100,
        bounce: 0,
        duration: 1000,
      })

      const first = gen.next(0)
      expect(first.value).toBe(0)
      expect(first.done).toBe(false)

      const mid = gen.next(500)
      expect(mid.value).toBeGreaterThan(0)
      expect(mid.value).toBeLessThan(100)
      expect(mid.done).toBe(false)
    })

    test('completes (done: true) after settling duration', () => {
      const gen = springGenerator({
        from: 0,
        to: 100,
        bounce: 0,
        duration: 1000,
      })

      const spring = createSpring({ bounce: 0, duration: 1000 })
      const settlingMs = springSettlingDuration(spring, {
        from: 0,
        to: 100,
        initialVelocity: 0,
      })

      // Pass time beyond settling duration
      const result = gen.next(settlingMs + 100)
      expect(result.value).toBe(100)
      expect(result.done).toBe(true)
    })

    test('handles from === to edge case', () => {
      const gen = springGenerator({
        from: 100,
        to: 100,
        bounce: 0,
        duration: 1000,
      })

      const first = gen.next(0)
      expect(first.value).toBe(100)
      expect(first.done).toBe(false)
    })

    test('handles initial velocity', () => {
      const gen = springGenerator({
        from: 0,
        to: 100,
        bounce: 0,
        duration: 1000,
        velocity: 1000,
      })

      const early = gen.next(700)
      // With positive initial velocity, should progress faster
      expect(early.value).toBeGreaterThan(100)
      expect(early.done).toBe(false)
    })
  })

  test('generate valid spring CSS', () => {
    const css = springCSS(400, 0.1)
    expect(css).toMatch(/^\d+ms linear\(.+\)$/)
  })
})
