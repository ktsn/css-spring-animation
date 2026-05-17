import { describe, expect, test } from 'vite-plus/test'

import { createAnimateController } from '../../src/core'

function el(): HTMLElement {
  return document.createElement('div')
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
