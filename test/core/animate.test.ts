import { afterEach, describe, expect, test, vitest } from 'vitest'
import type { MockInstance } from 'vitest'
import { animate } from '../../src/core/animate'
import { createSpringValue, sv } from '../../src/core/spring-value'
import type { SpringComputed } from '../../src/core/spring-value'

// jsdom's CSS.supports doesn't recognize `linear()` or `calc(... exp(...))`,
// so without this mock animate() falls back to the RAF path, which doesn't
// touch Element.animate. Force the per-property easing path so assertions on
// the WAAPI keyframes are exercised.
vitest.mock('../../src/core/utils', async () => {
  const actual = await vitest.importActual<object>('../../src/core/utils')
  return {
    ...actual,
    isCssLinearTimingFunctionSupported: () => true,
  }
})

function spring(value: number): SpringComputed {
  return createSpringValue(() => value)
}

function el(): HTMLElement {
  return document.createElement('div')
}

function raf() {
  return new Promise((resolve) => requestAnimationFrame(resolve))
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const activeSpies: MockInstance[] = []

afterEach(() => {
  while (activeSpies.length) {
    activeSpies.pop()!.mockRestore()
  }
})

/**
 * Spy on `getComputedStyle` so that, for the given `target`, the listed
 * custom properties report `overrides[name]` whenever the inline style for
 * that name has been cleared. Other properties (and other elements) pass
 * through to the real implementation. The spy is auto-restored in afterEach.
 */
function mockComputedWhenInlineCleared(
  target: HTMLElement,
  overrides: Record<string, string>,
): void {
  const real = globalThis.getComputedStyle

  const spy = vitest
    .spyOn(globalThis, 'getComputedStyle')
    .mockImplementation((elt: Element, pseudo?: string | null) => {
      const cs = real(elt, pseudo)
      if (elt !== target) return cs

      return new Proxy(cs, {
        get(t, prop, receiver) {
          if (prop === 'getPropertyValue') {
            return (name: string) => {
              if (
                name in overrides &&
                target.style.getPropertyValue(name) === ''
              ) {
                return overrides[name]
              }
              return t.getPropertyValue(name)
            }
          }
          return Reflect.get(t, prop, receiver)
        },
      }) as CSSStyleDeclaration
    })

  activeSpies.push(spy)
}

describe('animate', () => {
  test('ctx.finished and ctx.settled equal to false on start', () => {
    const ctx = animate(el(), [{ scale: 0 }, { scale: 10 }])
    expect(ctx.finished).toBe(false)
    expect(ctx.settled).toBe(false)
  })

  test('ctx.finished = true after duration passed', () => {
    const ctx = animate(el(), [{ scale: 0 }, { scale: 10 }], {
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
    const ctx = animate(el(), [{ scale: 0 }, { scale: 10 }], {
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
    const ctx = animate(el(), [{ scale: 0 }, { scale: 10 }], {
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
    const ctx = animate(el(), [{ scale: 0 }, { scale: 10 }], {
      duration: 60000,
    })
    ctx.stop()
    expect(ctx.finished).toBe(true)
    expect(ctx.settled).toBe(true)
  })

  test('ctx.stop() force resolves finishingPromise', () => {
    const ctx = animate(el(), [{ scale: 0 }, { scale: 10 }], {
      duration: 60000,
    })
    ctx.stop()
    return ctx.finishingPromise
  })

  test('ctx.stop() force resolves settlingPromise', () => {
    const ctx = animate(el(), [{ scale: 0 }, { scale: 10 }], {
      duration: 60000,
    })
    ctx.stop()
    return ctx.settlingPromise
  })

  test('SpringValue.current() reaches `to` after settled', () => {
    const x = spring(10)
    const y = spring(20)
    const ctx = animate(
      el(),
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
    animate(el(), [{ scale: sv`0` }, { scale: sv`${x}` }])
    expect(x.current()).not.toBe(0)
    expect(x.current()).not.toBe(100)
  })

  test('SpringValue.current() returns the stopped value when stopped', async () => {
    const x = spring(10)
    const ctx = animate(el(), [{ scale: sv`0` }, { scale: sv`${x}` }], {
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
      el(),
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
    const ctx = animate(el(), [{ scale: sv`${x}` }, { scale: '10' }], {
      duration: 10,
    })
    return ctx.settlingPromise.then(() => {
      expect(x.current()).toBe(10)
    })
  })

  test('SpringValues in both `from` and `to` share the same animation', async () => {
    const a = spring(0)
    const b = spring(10)
    const ctx = animate(el(), [{ scale: sv`${a}` }, { scale: sv`${b}` }], {
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
    animate(el(), [{ scale: sv`${x}` }, { scale: '10' }], {
      duration: 1000,
    })
    expect(x.velocity()).toBeCloseTo(50, 0)
  })

  test('velocity set on a `to`-side SpringValue is used as the initial velocity', () => {
    const x = spring(10)
    x.setVelocity(50)
    animate(el(), [{ scale: '0' }, { scale: sv`${x}` }], { duration: 1000 })
    expect(x.velocity()).toBeCloseTo(50, 0)
  })

  test('prefers the `from`-side velocity when both `from` and `to` are SpringValues with velocities', () => {
    const a = spring(0)
    const b = spring(10)
    a.setVelocity(50)
    b.setVelocity(100)
    animate(el(), [{ scale: sv`${a}` }, { scale: sv`${b}` }], {
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
      el(),
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
    animate(el(), [{ scale: sv`0` }, { scale: sv`${x}` }])
    expect(x.velocity()).not.toBe(0)
    expect(x.velocity()).not.toBe(100)
  })

  test('SpringValue.velocity() is 0 after stopped', async () => {
    const x = spring(10)
    x.setVelocity(100)
    const ctx = animate(el(), [{ scale: sv`0` }, { scale: sv`${x}` }], {
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
      el(),
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

  test('passes resolved keyframes to Element.animate()', () => {
    const target = el()
    const calls: {
      keyframes: Keyframe[]
      options: KeyframeAnimationOptions
    }[] = []
    target.animate = ((kf: Keyframe[], opt: KeyframeAnimationOptions) => {
      calls.push({ keyframes: kf, options: opt })
      return Element.prototype.animate.call(target, kf, opt)
    }) as Element['animate']

    animate(
      target,
      [
        { '--x': 0, '--y': `0px` },
        { '--x': 10, '--y': `20px` },
      ],
      { duration: 100 },
    )

    expect(calls.length).toBe(2)
    expect(calls[0]?.keyframes).toEqual([{ '--x': '0' }, { '--x': '10' }])
    expect(calls[1]?.keyframes).toEqual([{ '--y': '0px' }, { '--y': '20px' }])
    expect(calls[0]?.options.fill).toBe('forwards')
    expect(typeof calls[0]?.options.easing).toBe('string')
  })

  test('writes `to` style immediately if the value is not animatable (from is not animatable)', async () => {
    const target = el()
    const ctx = animate(target, [{ width: 'auto' }, { width: '100px' }], {
      duration: 10,
    })
    expect(target.style.width).toBe('100px')
    await ctx.settlingPromise
    expect(target.style.width).toBe('100px')
  })

  test('writes `to` style immediately if the value is not animatable (to is not animatable)', async () => {
    const target = el()
    const ctx = animate(target, [{ width: '100px' }, { width: 'auto' }], {
      duration: 10,
    })
    expect(target.style.width).toBe('auto')
    await ctx.settlingPromise
    expect(target.style.width).toBe('auto')
  })

  test('writes the slot value to element.style after settlingPromise', async () => {
    const target = el()
    const ctx = animate(
      target,
      [
        { '--x': 0, '--y': `0px` },
        { '--x': 10, '--y': `20px` },
      ],
      { duration: 10 },
    )
    await ctx.settlingPromise
    expect(target.style.getPropertyValue('--x')).toBe('10')
    expect(target.style.getPropertyValue('--y')).toBe('20px')
  })

  test('writes the mid-flight slot value to element.style after stopped', async () => {
    const target = el()
    const ctx = animate(target, [{ '--x': `0px` }, { '--x': `10px` }], {
      duration: 10,
    })
    ctx.stop()
    await wait(10)
    const x = target.style.getPropertyValue('--x')
    expect(x).not.toBe('0px')
    expect(x).not.toBe('10px')
  })

  test('completes `to` style unit from `from` style', async () => {
    const target = el()
    const ctx = animate(target, [{ '--x': '100%' }, { '--x': '0' }], {
      duration: 10,
    })
    await ctx.settlingPromise
    expect(target.style.getPropertyValue('--x')).toBe('0%')
  })

  test('completes stopped style unit from `from` style', async () => {
    const target = el()
    const ctx = animate(target, [{ '--x': '100%' }, { '--x': '0' }], {
      duration: 10,
    })
    ctx.stop()
    await ctx.settlingPromise
    expect(target.style.getPropertyValue('--x')).toContain('%')
  })

  test('reads `from` from computed style when the key is missing in `from`', async () => {
    const target = el()
    // Inline override that must be ignored while resolving the missing `from`.
    target.style.setProperty('--x', '50px')

    // Simulate the underlying computed style (e.g. from a stylesheet) that
    // shows through once the inline override is cleared.
    mockComputedWhenInlineCleared(target, { '--x': '10px' })

    const calls: { keyframes: Keyframe[] }[] = []
    target.animate = ((kf: Keyframe[], opt: KeyframeAnimationOptions) => {
      calls.push({ keyframes: kf })
      return Element.prototype.animate.call(target, kf, opt)
    }) as Element['animate']

    const ctx = animate(target, [{}, { '--x': '100px' }], { duration: 10 })

    // After resolution the inline override is restored.
    expect(target.style.getPropertyValue('--x')).toBe('50px')

    expect(calls.length).toBe(1)
    expect(calls[0]?.keyframes).toEqual([{ '--x': '10px' }, { '--x': '100px' }])

    await ctx.settlingPromise
    expect(target.style.getPropertyValue('--x')).toBe('100px')
  })

  test('reads `to` from computed style when the key is missing in `to`', async () => {
    const target = el()
    // Inline override that must be ignored while resolving the missing `to`.
    target.style.setProperty('--x', '50px')

    // Simulate the underlying computed style (e.g. from a stylesheet) that
    // shows through once the inline override is cleared.
    mockComputedWhenInlineCleared(target, { '--x': '20px' })

    const calls: { keyframes: Keyframe[] }[] = []
    target.animate = ((kf: Keyframe[], opt: KeyframeAnimationOptions) => {
      calls.push({ keyframes: kf })
      return Element.prototype.animate.call(target, kf, opt)
    }) as Element['animate']

    const ctx = animate(target, [{ '--x': '50px' }, {}], { duration: 10 })

    // After resolution the inline override is restored.
    expect(target.style.getPropertyValue('--x')).toBe('50px')

    expect(calls.length).toBe(1)
    expect(calls[0]?.keyframes).toEqual([{ '--x': '50px' }, { '--x': '20px' }])

    await ctx.settlingPromise
    expect(target.style.getPropertyValue('--x')).toBe('20px')
  })

  test('treats a single-element tuple as `to` only and fills `from` from computed style', async () => {
    const target = el()
    // Inline override that should be cleared while resolving the implicit
    // empty `from`.
    target.style.setProperty('--x', '50px')

    mockComputedWhenInlineCleared(target, { '--x': '10px' })

    const calls: { keyframes: Keyframe[] }[] = []
    target.animate = ((kf: Keyframe[], opt: KeyframeAnimationOptions) => {
      calls.push({ keyframes: kf })
      return Element.prototype.animate.call(target, kf, opt)
    }) as Element['animate']

    const ctx = animate(target, [{ '--x': '100px' }], { duration: 10 })

    // After resolution the inline override is restored.
    expect(target.style.getPropertyValue('--x')).toBe('50px')

    expect(calls.length).toBe(1)
    expect(calls[0]?.keyframes).toEqual([{ '--x': '10px' }, { '--x': '100px' }])

    await ctx.settlingPromise
    expect(target.style.getPropertyValue('--x')).toBe('100px')
  })

  test('treats null / undefined values as missing on both sides', async () => {
    const target = el()
    target.style.setProperty('--from-only', '40px')
    target.style.setProperty('--to-only', '60px')

    mockComputedWhenInlineCleared(target, {
      '--from-only': '5px',
      '--to-only': '7px',
    })

    const calls: { keyframes: Keyframe[] }[] = []
    target.animate = ((kf: Keyframe[], opt: KeyframeAnimationOptions) => {
      calls.push({ keyframes: kf })
      return Element.prototype.animate.call(target, kf, opt)
    }) as Element['animate']

    const ctx = animate(
      target,
      [
        { '--to-only': '60px', '--from-only': null },
        { '--from-only': '40px', '--to-only': undefined },
      ],
      { duration: 10 },
    )

    // Inline overrides should be restored after resolution.
    expect(target.style.getPropertyValue('--from-only')).toBe('40px')
    expect(target.style.getPropertyValue('--to-only')).toBe('60px')

    const keyframesByKey = new Map<string, Keyframe[]>()
    for (const c of calls) {
      const key = Object.keys(c.keyframes[0]!)[0]!
      keyframesByKey.set(key, c.keyframes)
    }
    expect(keyframesByKey.get('--from-only')).toEqual([
      { '--from-only': '5px' },
      { '--from-only': '40px' },
    ])
    expect(keyframesByKey.get('--to-only')).toEqual([
      { '--to-only': '60px' },
      { '--to-only': '7px' },
    ])

    await ctx.settlingPromise
  })
})
