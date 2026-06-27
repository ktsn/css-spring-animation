import { afterEach, describe, expect, test, vitest } from 'vite-plus/test'
import type { MockInstance } from 'vite-plus/test'

import { createAnimateController } from '../../src/core'

function el(): HTMLElement {
  return document.createElement('div')
}

function raf(): Promise<unknown> {
  return new Promise((resolve) => requestAnimationFrame(resolve))
}

const activeSpies: MockInstance[] = []

afterEach(() => {
  while (activeSpies.length) {
    activeSpies.pop()!.mockRestore()
  }
})

/**
 * Spy on `getComputedStyle` so that, for `target`, any `<n>rem` width probe
 * resolves to `<n * 16>px` (jsdom doesn't resolve units on its own). This lets
 * the controller's mixed-unit `px` resolution run in tests.
 */
function mockRemResolution(target: HTMLElement): void {
  const real = globalThis.getComputedStyle

  const spy = vitest
    .spyOn(globalThis, 'getComputedStyle')
    .mockImplementation((elt: Element, pseudo?: string | null) => {
      const cs = real(elt, pseudo)
      if (elt !== target) return cs

      return new Proxy(cs, {
        get(t, prop, receiver) {
          if (prop === 'width') {
            const probe = target.style.width
            const match = /^(\d+(?:\.\d+)?)rem$/.exec(probe)
            if (match) return `${parseFloat(match[1]!) * 16}px`
          }
          return Reflect.get(t, prop, receiver)
        },
      }) as CSSStyleDeclaration
    })

  activeSpies.push(spy)
}

describe('AnimationController', () => {
  test('set initial style', () => {
    const target = el()
    const controller = createAnimateController(target)
    const ctx = controller.setStyle({
      width: `100px`,
    })
    expect(ctx.settled).toBe(true)
    expect(target.style.width).toEqual('100px')
  })

  test('set style without animation', () => {
    const target = el()
    const controller = createAnimateController(target)
    controller.setStyle({ width: `100px` })
    expect(target.style.width).toBe('100px')
    const ctx = controller.setStyle({ width: `200px` }, { animate: false })
    expect(ctx.settled).toBe(true)
    expect(target.style.width).toBe('200px')
  })

  test('set style with animation reaches the to value after settling', async () => {
    const target = el()
    const controller = createAnimateController(target)
    controller.setOptions({ duration: 10 })
    controller.setStyle({ width: `100px` })
    expect(target.style.width).toEqual('100px')

    const ctx = controller.setStyle({ width: `200px` })
    expect(ctx.settled).toBe(false)
    await ctx.settlingPromise
    expect(target.style.width).toBe('200px')
  })

  test('set style without animation if the value is not animatable', () => {
    const target = el()
    const controller = createAnimateController(target)
    controller.setOptions({ duration: 10 })
    controller.setStyle({ width: `auto` })
    expect(target.style.width).toBe('auto')

    controller.setStyle({ width: `100px` })
    expect(target.style.width).toBe('100px')
  })

  test('do not trigger animation by setting the same style value', () => {
    const target = el()
    const controller = createAnimateController(target)
    controller.setOptions({ duration: 10 })
    controller.setStyle({ width: `100px` })
    expect(target.style.width).toBe('100px')

    const ctx = controller.setStyle({ width: `100px` })
    expect(ctx.settled).toBe(true)
    expect(target.style.width).toBe('100px')
  })

  test('trigger animation if any style value is different', async () => {
    const target = el()
    const controller = createAnimateController(target)
    controller.setOptions({ duration: 10 })
    controller.setStyle({ width: '100px', height: '200px' })
    expect(target.style.width).toBe('100px')
    expect(target.style.height).toBe('200px')

    const ctx = controller.setStyle({ width: `100px`, height: `100px` })
    expect(ctx.settled).toBe(false)
    await ctx.settlingPromise
    expect(target.style.width).toBe('100px')
    expect(target.style.height).toBe('100px')
  })

  test('complete style unit if the value is 0 without unit', async () => {
    const target = el()
    const controller = createAnimateController(target)
    controller.setOptions({ duration: 10 })
    controller.setStyle({ width: '100px' })
    const ctx = controller.setStyle({ width: '0' })
    expect(ctx.settled).toBe(false)
    await ctx.settlingPromise
    expect(target.style.width).toBe('0px')
  })

  test('stop animation', () => {
    const target = el()
    const controller = createAnimateController(target)
    controller.setOptions({ duration: 1000 })
    controller.setStyle({ width: `100px` })
    expect(target.style.width).toEqual('100px')

    controller.setStyle({ width: `200px` })
    controller.stop()
    expect(target.style.width).not.toBe('100px')
    expect(target.style.width).not.toBe('200px')
    expect(target.style.width).toContain('px')
  })

  test('complete stopped style unit from the previous style unit', () => {
    const target = el()
    const controller = createAnimateController(target)
    controller.setOptions({ duration: 1000 })
    controller.setStyle({ width: '100%' })
    controller.setStyle({ width: '0' })
    controller.stop()
    expect(target.style.width).toContain('%')
  })

  test('stopping a resolved mixed-unit animation hands off in px, not the authored unit', async () => {
    const target = el()
    mockRemResolution(target)

    const controller = createAnimateController(target)
    controller.setOptions({ duration: 1000 })

    // Start at 300px, then animate toward 10rem (resolves to 160px).
    controller.setStyle({ width: '300px' }, { animate: false })
    controller.setStyle({ width: '10rem' })

    await raf()
    controller.stop()

    // The animation was frozen at a px value between 160 and 300.
    const stoppedWidth = parseFloat(target.style.width)
    expect(target.style.width).toContain('px')
    expect(stoppedWidth).toBeGreaterThan(150)
    expect(stoppedWidth).toBeLessThan(310)

    // Re-fire toward 300px. The new `from` must reuse the stopped px value as
    // px. If it were mislabeled `rem`, the mock would resolve it to ~16x and the
    // start value would jump into the thousands.
    controller.setStyle({ width: '300px' })

    const restartWidth = parseFloat(target.style.width)
    expect(target.style.width).toContain('px')
    expect(Math.abs(restartWidth - stoppedWidth)).toBeLessThan(5)
  })

  test('register finish listener for the current animation', () => {
    const target = el()
    const controller = createAnimateController(target)
    controller.setOptions({ duration: 100 })
    controller.setStyle({ width: '100px' }, { animate: false })
    controller.setStyle({ width: '200px' })

    return new Promise<void>((resolve) => {
      controller.onFinishCurrent(({ stopped }) => {
        expect(stopped).toBe(false)
        resolve()
      })
    })
  })

  test('register settle listener for the current animation', () => {
    const target = el()
    const controller = createAnimateController(target)
    controller.setOptions({ duration: 100 })
    controller.setStyle({ width: '100px' }, { animate: false })
    controller.setStyle({ width: '200px' })

    return new Promise<void>((resolve) => {
      controller.onSettleCurrent(({ stopped }) => {
        expect(stopped).toBe(false)
        expect(target.style.width).toBe('200px')
        resolve()
      })
    })
  })

  test('stopped == true in onFinishCurrent when animation is stopped by stop()', () => {
    const target = el()
    const controller = createAnimateController(target)
    controller.setOptions({ duration: 100 })
    controller.setStyle({ width: '100px' }, { animate: false })
    controller.setStyle({ width: '200px' })

    return new Promise<void>((resolve) => {
      controller.onFinishCurrent(({ stopped }) => {
        expect(stopped).toBe(true)
        expect(target.style.width).not.toBe('100px')
        expect(target.style.width).not.toBe('200px')
        resolve()
      })
      controller.stop()
    })
  })

  test('stopped == true in onFinishCurrent when animation is stopped by a new animation', () => {
    const controller = createAnimateController(el())
    controller.setOptions({ duration: 100 })
    controller.setStyle({ width: '100px' }, { animate: false })
    controller.setStyle({ width: '200px' })

    return new Promise<void>((resolve) => {
      controller.onFinishCurrent(({ stopped }) => {
        expect(stopped).toBe(true)
        resolve()
      })
      controller.setStyle({ width: '300px' })
    })
  })

  test('stopped == true in onSettleCurrent when animation is stopped by stop()', () => {
    const target = el()
    const controller = createAnimateController(target)
    controller.setOptions({ duration: 100 })
    controller.setStyle({ width: '100px' }, { animate: false })
    controller.setStyle({ width: '200px' })

    return new Promise<void>((resolve) => {
      controller.onSettleCurrent(({ stopped }) => {
        expect(stopped).toBe(true)
        expect(target.style.width).not.toBe('100px')
        expect(target.style.width).not.toBe('200px')
        resolve()
      })
      controller.stop()
    })
  })

  test('stopped == true in onSettleCurrent when animation is stopped by a new animation', () => {
    const controller = createAnimateController(el())
    controller.setOptions({ duration: 100 })
    controller.setStyle({ width: '100px' }, { animate: false })
    controller.setStyle({ width: '200px' })

    return new Promise<void>((resolve) => {
      controller.onSettleCurrent(({ stopped }) => {
        expect(stopped).toBe(true)
        resolve()
      })
      controller.setStyle({ width: '300px' })
    })
  })

  test('dispose stops in-flight animation and clears state', () => {
    const target = el()
    const controller = createAnimateController(target)
    controller.setOptions({ duration: 1000 })
    controller.setStyle({ width: '100px' })
    const ctx = controller.setStyle({ width: '200px' })
    controller.dispose()
    expect(ctx.settled).toBe(true)
  })
})
