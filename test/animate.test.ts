import { describe, expect, test } from 'vitest'
import { animate } from '../src/animate'

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

  test('ctx.current returns to value after settled', () => {
    const ctx = animate([0, 10], () => {}, {
      duration: 10,
    })
    return ctx.settlingPromise.then(() => {
      expect(ctx.current).toBe(10)
    })
  })

  test('ctx.current returns record of to values after settled', () => {
    const ctx = animate({ x: [0, 10], y: [10, 20] }, () => {}, {
      duration: 10,
    })
    return ctx.settlingPromise.then(() => {
      expect(ctx.current).toEqual({ x: 10, y: 20 })
    })
  })

  test('ctx.velocity returns 0 after settled', () => {
    const ctx = animate([0, 10], () => {}, {
      velocity: 100,
      duration: 10,
    })
    return ctx.settlingPromise.then(() => {
      expect(ctx.velocity).toBe(0)
    })
  })

  test('ctx.velocity returns record of 0 after settled', () => {
    const ctx = animate({ x: [0, 10], y: [10, 20] }, () => {}, {
      velocity: { x: 100, y: 200 },
      duration: 10,
    })
    return ctx.settlingPromise.then(() => {
      expect(ctx.velocity).toEqual({ x: 0, y: 0 })
    })
  })
})
