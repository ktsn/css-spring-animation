import { describe, expect, test, vitest } from 'vitest'
import { animate } from '../../src/core/animate'
import { s } from '../../src/core/style'

vitest.mock('../../src/core/utils', async () => {
  const actual = await vitest.importActual<object>('../../src/core/utils')
  return {
    ...actual,
    isBrowserSupported: () => true,
  }
})

function raf() {
  return new Promise((resolve) => requestAnimationFrame(resolve))
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('animate', () => {
  test('ctx.finished and ctx.settled equal to false on start', () => {
    const ctx = animate({ scale: [0, 10] }, () => {})
    expect(ctx.finished).toBe(false)
    expect(ctx.settled).toBe(false)
  })

  test('ctx.finished = true after duration passed', () => {
    const ctx = animate({ scale: [0, 10] }, () => {}, {
      duration: 10,
    })
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(ctx.finished).toBe(true)
        expect(ctx.settled).toBe(false)
        resolve()
      }, 11)
    })
  })

  test('ctx.finished = true after finishingPromise resolved', () => {
    const ctx = animate({ scale: [0, 10] }, () => {}, {
      duration: 10,
    })
    return new Promise<void>((resolve) => {
      ctx.finishingPromise.then(() => {
        expect(ctx.finished).toBe(true)
        expect(ctx.settled).toBe(false)
        resolve()
      })
    })
  })

  test('ctx.settled = true after settlingPromise resolved', () => {
    const ctx = animate({ scale: [0, 10] }, () => {}, {
      duration: 10,
    })
    return new Promise<void>((resolve) => {
      ctx.settlingPromise.then(() => {
        expect(ctx.finished).toBe(true)
        expect(ctx.settled).toBe(true)
        resolve()
      })
    })
  })

  test('ctx.stop() makes finished and settled be true', () => {
    const ctx = animate({ scale: [0, 10] }, () => {}, {
      duration: 60000,
    })
    ctx.stop()
    expect(ctx.finished).toBe(true)
    expect(ctx.settled).toBe(true)
  })

  test('ctx.stop() force resolves finishingPromise', () => {
    const ctx = animate({ scale: [0, 10] }, () => {}, {
      duration: 60000,
    })
    ctx.stop()
    return ctx.finishingPromise
  })

  test('ctx.stop() force resolves settlingPromise', () => {
    const ctx = animate({ scale: [0, 10] }, () => {}, {
      duration: 60000,
    })
    ctx.stop()
    return ctx.settlingPromise
  })

  test('ctx.realValue returns record of to values after settled', () => {
    const ctx = animate({ x: [0, 10], y: [10, 20] }, () => {}, {
      duration: 10,
    })
    return ctx.settlingPromise.then(() => {
      expect(ctx.realValue).toEqual({ x: [10], y: [20] })
    })
  })

  test('ctx.realValue returns actual value while animating', () => {
    const ctx = animate({ scale: [0, 100] }, () => {})
    expect(ctx.realValue.scale[0]).not.toBe(0)
    expect(ctx.realValue.scale[0]).not.toBe(100)
  })

  test('ctx.realValue returns the real value when it is stopped', async () => {
    const ctx = animate({ scale: [0, 10] }, () => {}, {
      duration: 100,
    })
    await raf()
    ctx.stop()
    await wait(100)
    expect(ctx.realValue.scale[0]).not.toBe(0)
    expect(ctx.realValue.scale[0]).not.toBe(10)
  })

  test('ctx.realValue returns all values in parsed style', () => {
    const ctx = animate(
      {
        translate: [
          s`translate(${0}px, ${10}%)`,
          s`translate(${10}px, ${20}%)`,
        ],
      },
      () => {},
      {
        duration: 10,
      },
    )

    expect(ctx.realValue.translate.length).toBe(2)
    return ctx.settlingPromise.then(() => {
      expect(ctx.realValue).toEqual({
        translate: [10, 20],
      })
    })
  })

  test('ctx.realVelocity returns record of 0 after settled', () => {
    const ctx = animate({ x: [0, 10], y: [10, 20] }, () => {}, {
      velocity: { x: [100], y: [200] },
      duration: 10,
    })
    return ctx.settlingPromise.then(() => {
      expect(ctx.realVelocity).toEqual({ x: [0], y: [0] })
    })
  })

  test('ctx.realVelocity returns actual velocity while animating', () => {
    const ctx = animate({ scale: [0, 100] }, () => {})
    expect(ctx.realVelocity.scale[0]).not.toBe(0)
    expect(ctx.realVelocity.scale[0]).not.toBe(100)
  })

  test('ctx.realVelocity returns 0 after stopped', async () => {
    const ctx = animate({ scale: [0, 10] }, () => {}, {
      velocity: { scale: [100] },
      duration: 100,
    })
    await raf()
    ctx.stop()
    expect(ctx.realVelocity.scale[0]).toBe(0)
  })

  test('ctx.realVelocity returns all velocities in parsed style', () => {
    const ctx = animate(
      {
        translate: [
          s`translate(${0}px, ${10}%)`,
          s`translate(${10}px, ${20}%)`,
        ],
      },
      () => {},
      {
        duration: 10,
      },
    )

    expect(ctx.realVelocity.translate.length).toBe(2)
    return ctx.settlingPromise.then(() => {
      expect(ctx.realVelocity).toEqual({
        translate: [0, 0],
      })
    })
  })

  test('pass compiled style value', async () => {
    let value: Record<string, string> | undefined
    const ctx = animate(
      { x: [0, 10], y: [s`${0}px`, s`${20}px`] },
      (v) => {
        value = v
      },
      {
        duration: 10,
      },
    )
    expect(value?.x).not.toBe('0')
    expect(value?.x).not.toBe('10')
    expect(value?.x).not.toMatch(/\d+px/)
    expect(value?.y).not.toBe('0px')
    expect(value?.y).not.toBe('20px')
    expect(value?.y).toMatch(/\d+px/)
    await ctx.settlingPromise
    expect(value?.x).toBe('10')
    expect(value?.y).toBe('20px')
  })
})
