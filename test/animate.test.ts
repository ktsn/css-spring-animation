import { describe, expect, test, vitest } from 'vitest'
import { animate, unit } from '../src/animate'

vitest.mock('../src/utils', async () => {
  const actual = await vitest.importActual<object>('../src/utils')
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
    const ctx = animate([0, 10], () => {})
    expect(ctx.finished).toBe(false)
    expect(ctx.settled).toBe(false)
  })

  test('ctx.finished = true after duration passed', () => {
    const ctx = animate([0, 10], () => {}, {
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
    const ctx = animate([0, 10], () => {}, {
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
    const ctx = animate([0, 10], () => {}, {
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
    const ctx = animate([0, 10], () => {}, {
      duration: 60000,
    })
    ctx.stop()
    expect(ctx.finished).toBe(true)
    expect(ctx.settled).toBe(true)
  })

  test('ctx.stop() force resolves finishingPromise', () => {
    const ctx = animate([0, 10], () => {}, {
      duration: 60000,
    })
    ctx.stop()
    return ctx.finishingPromise
  })

  test('ctx.stop() force resolves settlingPromise', () => {
    const ctx = animate([0, 10], () => {}, {
      duration: 60000,
    })
    ctx.stop()
    return ctx.settlingPromise
  })

  test('ctx.realValue returns to value after settled', () => {
    const ctx = animate([0, 10], () => {}, {
      duration: 10,
    })
    return ctx.settlingPromise.then(() => {
      expect(ctx.realValue).toBe(10)
    })
  })

  test('ctx.realValue returns record of to values after settled', () => {
    const ctx = animate({ x: [0, 10], y: [10, 20] }, () => {}, {
      duration: 10,
    })
    return ctx.settlingPromise.then(() => {
      expect(ctx.realValue).toEqual({ x: 10, y: 20 })
    })
  })

  test('ctx.realValue returns the real value when it is stopped', async () => {
    const ctx = animate([0, 10], () => {}, {
      duration: 100,
    })
    await raf()
    ctx.stop()
    await wait(100)
    expect(ctx.realValue).not.toBe(0)
    expect(ctx.realValue).not.toBe(10)
  })

  test('ctx.realVelocity returns 0 after settled', () => {
    const ctx = animate([0, 10], () => {}, {
      velocity: 100,
      duration: 10,
    })
    return ctx.settlingPromise.then(() => {
      expect(ctx.realVelocity).toBe(0)
    })
  })

  test('ctx.realVelocity returns record of 0 after settled', () => {
    const ctx = animate({ x: [0, 10], y: [10, 20] }, () => {}, {
      velocity: { x: 100, y: 200 },
      duration: 10,
    })
    return ctx.settlingPromise.then(() => {
      expect(ctx.realVelocity).toEqual({ x: 0, y: 0 })
    })
  })

  test('ctx.realVelocity returns 0 after stopped', async () => {
    const ctx = animate([0, 10], () => {}, {
      velocity: 100,
      duration: 100,
    })
    await raf()
    ctx.stop()
    expect(ctx.realVelocity).toBe(0)
  })

  test('pass style value with no unit', async () => {
    let value: string | undefined
    const ctx = animate(
      [0, 10],
      (v) => {
        value = v
      },
      {
        duration: 10,
      },
    )

    expect(value).not.toMatch(/\d+px/)
    await ctx.settlingPromise
    expect(value).toBe('10')
  })
})

describe('unit', () => {
  test('add unit directly to numeric value', () => {
    const actual = unit('10.123', 'px')
    expect(actual).toBe('10.123px')
  })

  test('wrap with calc() if value is likely an expression', () => {
    const actual = unit('1 + exp(3)', 'px')
    expect(actual).toBe('calc(1px * (1 + exp(3)))')
  })
})
