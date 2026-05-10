import { describe, expect, test, vitest } from 'vitest'
import { animate } from '../../src/core/animate'
import { createSpringValue, sv } from '../../src/core/spring-value'
import type { SpringComputed } from '../../src/core/spring-value'

function spring(value: number): SpringComputed {
  return createSpringValue(() => value)
}

vitest.mock('../../src/core/utils', async () => {
  const actual = await vitest.importActual<object>('../../src/core/utils')
  return {
    ...actual,
    isCssLinearTimingFunctionSupported: () => true,
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
    const ctx = animate(() => {}, [{ scale: 0 }, { scale: 10 }])
    expect(ctx.finished).toBe(false)
    expect(ctx.settled).toBe(false)
  })

  test('ctx.finished = true after duration passed', () => {
    const ctx = animate(() => {}, [{ scale: 0 }, { scale: 10 }], {
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
    const ctx = animate(() => {}, [{ scale: 0 }, { scale: 10 }], {
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
    const ctx = animate(() => {}, [{ scale: 0 }, { scale: 10 }], {
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
    const ctx = animate(() => {}, [{ scale: 0 }, { scale: 10 }], {
      duration: 60000,
    })
    ctx.stop()
    expect(ctx.finished).toBe(true)
    expect(ctx.settled).toBe(true)
  })

  test('ctx.stop() force resolves finishingPromise', () => {
    const ctx = animate(() => {}, [{ scale: 0 }, { scale: 10 }], {
      duration: 60000,
    })
    ctx.stop()
    return ctx.finishingPromise
  })

  test('ctx.stop() force resolves settlingPromise', () => {
    const ctx = animate(() => {}, [{ scale: 0 }, { scale: 10 }], {
      duration: 60000,
    })
    ctx.stop()
    return ctx.settlingPromise
  })

  test('SpringValue.current() reaches `to` after settled', () => {
    const x = spring(10)
    const y = spring(20)
    const ctx = animate(
      () => {},
      [
        { x: sv`0`, y: sv`10` },
        { x: sv`${x}`, y: sv`${y}` },
      ],
      { duration: 10 },
    )
    return ctx.settlingPromise.then(() => {
      expect(x.current()).toBe(10)
      expect(y.current()).toBe(20)
    })
  })

  test('SpringValue.current() returns a mid-flight value while animating', () => {
    const x = spring(100)
    animate(() => {}, [{ scale: sv`0` }, { scale: sv`${x}` }])
    expect(x.current()).not.toBe(0)
    expect(x.current()).not.toBe(100)
  })

  test('SpringValue.current() returns the stopped value when stopped', async () => {
    const x = spring(10)
    const ctx = animate(() => {}, [{ scale: sv`0` }, { scale: sv`${x}` }], {
      duration: 1000,
    })
    await raf()
    ctx.stop()
    await wait(100)
    expect(x.current()).not.toBe(0)
    expect(x.current()).not.toBe(10)
  })

  test('every SpringValue in a parsed style reaches its `to`', () => {
    const x = spring(10)
    const y = spring(20)
    const ctx = animate(
      () => {},
      [
        { translate: `translate(0px, 10px)` },
        { translate: sv`translate(${x}px, ${y}px)` },
      ],
      { duration: 10 },
    )

    return ctx.settlingPromise.then(() => {
      expect(x.current()).toBe(10)
      expect(y.current()).toBe(20)
    })
  })

  test('SpringValue in `from` is attached even when `to` is a literal', () => {
    const x = spring(0)
    const ctx = animate(() => {}, [{ scale: sv`${x}` }, { scale: '10' }], {
      duration: 10,
    })
    return ctx.settlingPromise.then(() => {
      expect(x.current()).toBe(10)
    })
  })

  test('SpringValues in both `from` and `to` share the same animation', async () => {
    const a = spring(0)
    const b = spring(10)
    const ctx = animate(() => {}, [{ scale: sv`${a}` }, { scale: sv`${b}` }], {
      duration: 1000,
    })
    await raf()
    ctx.stop()
    // After stop, both reads use the same frozen `stoppedDuration` from
    // the shared AnimateContext, so identical values prove they're on
    // the same animation.
    expect(a.current()).toBe(b.current())
    // Both report a mid-flight value, proving both are attached.
    expect(a.current()).not.toBe(0)
    expect(a.current()).not.toBe(10)
  })

  test('velocity set on a `from`-side SpringValue is used as the initial velocity', () => {
    const x = spring(0)
    x.setVelocity(50)
    animate(() => {}, [{ scale: sv`${x}` }, { scale: '10' }], {
      duration: 1000,
    })
    expect(x.velocity()).toBeCloseTo(50, 0)
  })

  test('velocity set on a `to`-side SpringValue is used as the initial velocity', () => {
    const x = spring(10)
    x.setVelocity(50)
    animate(() => {}, [{ scale: '0' }, { scale: sv`${x}` }], { duration: 1000 })
    expect(x.velocity()).toBeCloseTo(50, 0)
  })

  test('prefers the `from`-side velocity when both `from` and `to` are SpringValues with velocities', () => {
    const a = spring(0)
    const b = spring(10)
    a.setVelocity(50)
    b.setVelocity(100)
    animate(() => {}, [{ scale: sv`${a}` }, { scale: sv`${b}` }], {
      duration: 1000,
    })
    expect(a.velocity()).toBeCloseTo(50, 0)
    expect(b.velocity()).toBeCloseTo(50, 0)
  })

  test('SpringValue.velocity() is 0 after settled', () => {
    const x = spring(10)
    const y = spring(20)
    x.setVelocity(100)
    y.setVelocity(200)
    const ctx = animate(
      () => {},
      [
        { x: sv`0`, y: sv`10` },
        { x: sv`${x}`, y: sv`${y}` },
      ],
      { duration: 10 },
    )
    return ctx.settlingPromise.then(() => {
      expect(x.velocity()).toBe(0)
      expect(y.velocity()).toBe(0)
    })
  })

  test('SpringValue.velocity() is non-zero while animating', () => {
    const x = spring(100)
    animate(() => {}, [{ scale: sv`0` }, { scale: sv`${x}` }])
    expect(x.velocity()).not.toBe(0)
    expect(x.velocity()).not.toBe(100)
  })

  test('SpringValue.velocity() is 0 after stopped', async () => {
    const x = spring(10)
    x.setVelocity(100)
    const ctx = animate(() => {}, [{ scale: sv`0` }, { scale: sv`${x}` }], {
      duration: 1000,
    })
    await raf()
    ctx.stop()
    expect(x.velocity()).toBe(0)
  })

  test('every SpringValue in a parsed style settles to 0 velocity', () => {
    const x = spring(10)
    const y = spring(20)
    const ctx = animate(
      () => {},
      [
        { translate: `translate(0px, 10%)` },
        { translate: sv`translate(${x}px, ${y}%)` },
      ],
      { duration: 10 },
    )

    return ctx.settlingPromise.then(() => {
      expect(x.velocity()).toBe(0)
      expect(y.velocity()).toBe(0)
    })
  })

  test('pass compiled style value', async () => {
    let value: Record<string, string> | undefined
    const ctx = animate(
      (v) => {
        value = v
      },
      [
        { x: 0, y: `0px` },
        { x: 10, y: `20px` },
      ],
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
      (v) => {
        value = v
      },
      [{ width: 'auto' }, { width: '100px' }],
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
      (v) => {
        value = v
      },
      [{ width: '100px' }, { width: 'auto' }],
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
      (v) => {
        value = v
      },
      [{ x: `0px` }, { x: `10px` }],
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
      (v) => {
        value = v
      },
      [{ x: '100%' }, { x: '0' }],
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
      (v) => {
        value = v
      },
      [{ x: '100%' }, { x: '0' }],
      {
        duration: 10,
      },
    )

    ctx.stop()
    await ctx.settlingPromise
    expect(value?.x).toContain('%')
  })
})
