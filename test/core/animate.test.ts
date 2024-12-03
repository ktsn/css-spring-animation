import { describe, expect, test, vitest } from 'vitest'
import { animate } from '../../src/core/animate'

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
        translate: [`translate(0px, 10)`, `translate(10px, 20)`],
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
        translate: [`translate(0px, 10%)`, `translate(10px, 20%)`],
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
      { x: [0, 10], y: [`0px`, `20px`] },
      (v) => {
        value = v
      },
      {
        duration: 100,
      },
    )
    expect(value?.x).toBe('0')
    expect(value?.y).toBe('0px')
    expect(value?.transition).toBe('none')
    await raf()
    await raf()
    expect(value?.x).toBe('10')
    expect(value?.y).toBe('20px')
    expect(value?.transition).not.toBe('none')
    await ctx.settlingPromise
    expect(value?.x).toBe('10')
    expect(value?.y).toBe('20px')
    expect(value?.transition).toBe('')
  })

  test('pass to style value immediately if the value is not animatable (from is not animatable)', async () => {
    let value: Record<string, string> | undefined
    const ctx = animate(
      { width: ['auto', '100px'] },
      (v) => {
        value = v
      },
      {
        duration: 10,
      },
    )
    expect(value?.width).toBe('100px')
    await ctx.settlingPromise
    expect(value?.width).toBe('100px')
  })

  test('pass to style value immediately if the value is not animatable (to is not animatable)', async () => {
    let value: Record<string, string> | undefined
    const ctx = animate(
      { width: ['100px', 'auto'] },
      (v) => {
        value = v
      },
      {
        duration: 10,
      },
    )
    expect(value?.width).toBe('auto')
    await ctx.settlingPromise
    expect(value?.width).toBe('auto')
  })

  test('pass real style value after stopped', async () => {
    let value: Record<string, string> | undefined
    const ctx = animate(
      { x: [`0px`, `10px`] },
      (v) => {
        value = v
      },
      {
        duration: 10,
      },
    )
    ctx.stop()
    await wait(10)
    expect(value?.x).not.toBe('0px')
    expect(value?.x).not.toBe('10px')
  })

  test('complete `to` style unit from `from` style', async () => {
    let value: Record<string, string> | undefined
    const ctx = animate(
      { x: ['100%', '0'] },
      (v) => {
        value = v
      },
      {
        duration: 10,
      },
    )

    expect(value?.x).toContain('%')
    await ctx.settlingPromise
    expect(value?.x).toBe('0%')
  })

  test('complete stopped style unit from `from` style', async () => {
    let value: Record<string, string> | undefined
    const ctx = animate(
      { x: ['100%', '0'] },
      (v) => {
        value = v
      },
      {
        duration: 10,
      },
    )

    ctx.stop()
    await ctx.settlingPromise
    expect(value?.x).toContain('%')
  })
})
