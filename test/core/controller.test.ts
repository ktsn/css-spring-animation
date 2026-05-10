import { describe, expect, test, vi, vitest } from 'vitest'
import { createAnimateController } from '../../src/core'
import { t } from '../../src/core/time'

vitest.mock('../../src/core/utils', async () => {
  const actual = await vitest.importActual<object>('../../src/core/utils')
  return {
    ...actual,
    isCssLinearTimingFunctionSupported: () => true,
  }
})

function raf(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

describe('AnimationController', () => {
  test('set initial style', () => {
    let actual: Record<string, string> | undefined
    const controller = createAnimateController((style) => {
      actual = style
    })
    controller.setStyle({
      width: `100px`,
    })
    expect(actual?.width).toEqual('100px')
  })

  test('set style without animation', () => {
    let actual: Record<string, string> | undefined
    const controller = createAnimateController((style) => {
      actual = style
    })
    controller.setStyle({ width: `100px` })
    expect(actual).toEqual({ width: '100px', transition: '', [t]: '' })
    controller.setStyle({ width: `200px` }, { animate: false })
    expect(actual).toEqual({ width: '200px', transition: '', [t]: '' })
  })

  test('set style with animation', async () => {
    let actual: Record<string, string> | undefined
    const controller = createAnimateController((style) => {
      actual = style
    })
    controller.setOptions({ duration: 10 })
    controller.setStyle({ width: `100px` })
    expect(actual?.width).toEqual('100px')

    controller.setStyle({ width: `200px` })
    expect(actual?.width).toBe('100px')
    expect(actual?.transition).toBe('none')
    await raf()
    await raf()
    expect(actual?.width).toBe('200px')
    expect(actual?.[t]).not.toBe('none')
  })

  test('set style without animation if the value is not animatable', () => {
    let actual: Record<string, string> | undefined
    const controller = createAnimateController((style) => {
      actual = style
    })
    controller.setOptions({ duration: 10 })
    controller.setStyle({ width: `auto` })
    expect(actual?.width).toBe('auto')

    controller.setStyle({ width: `100px` })
    expect(actual?.width).toBe('100px')
  })

  test('do not trigger animation by setting the same style value', () => {
    let actual: Record<string, string> | undefined
    const controller = createAnimateController((style) => {
      actual = style
    })
    controller.setOptions({ duration: 10 })
    controller.setStyle({ width: `100px` })
    expect(actual?.width).toBe('100px')

    controller.setStyle({ width: `100px` })
    expect(actual?.width).toBe('100px')
    expect(actual?.transition).toBe('')
    expect(actual?.[t]).toBe('')
  })

  test('trigger animation if any style value is different', async () => {
    let actual: Record<string, string> | undefined
    const controller = createAnimateController((style) => {
      actual = style
    })
    controller.setOptions({ duration: 10 })
    controller.setStyle({ width: '100px', height: '200px' })
    expect(actual?.width).toBe('100px')
    expect(actual?.height).toBe('200px')

    controller.setStyle({ width: `100px`, height: `100px` })
    expect(actual?.width).toBe('100px')
    expect(actual?.height).toBe('200px')
    expect(actual?.transition).toBe('none')
    await raf()
    await raf()
    expect(actual?.width).toBe('100px')
    expect(actual?.height).toBe('100px')
    expect(actual?.transition).not.toBe('none')
  })

  test('complete style unit if the value is 0 without unit', () => {
    let actual: Record<string, string> | undefined
    const controller = createAnimateController((style) => {
      actual = style
    })
    controller.setOptions({ duration: 10 })
    controller.setStyle({ width: '100px' })
    controller.setStyle({ width: '0' })
    expect(actual?.width).toContain('px')

    return vi.waitFor(() => {
      expect(actual?.width).toBe('0px')
    })
  })

  test('stop animation', () => {
    let actual: Record<string, string> | undefined
    const controller = createAnimateController((style) => {
      actual = style
    })
    controller.setOptions({ duration: 1000 })
    controller.setStyle({ width: `100px` })
    expect(actual?.width).toEqual('100px')

    controller.setStyle({ width: `200px` })
    controller.stop()
    expect(actual?.width).not.toBe('100px')
    expect(actual?.width).not.toBe('200px')
    expect(actual?.transition).toBe('')
    expect(actual?.[t]).toBe('')
  })

  test('complete stopped style unit from the previous style unit', () => {
    let actual: Record<string, string> | undefined
    const controller = createAnimateController((style) => {
      actual = style
    })
    controller.setOptions({ duration: 1000 })
    controller.setStyle({ width: '100%' })
    controller.setStyle({ width: '0' })
    controller.stop()
    expect(actual?.width).toContain('%')
  })

  test('register finish listener for the current animation', () => {
    let style: any
    const controller = createAnimateController((_style) => {
      style = _style
    })
    controller.setOptions({ duration: 100 })
    controller.setStyle({ width: '100px' }, { animate: false })
    controller.setStyle({ width: '200px' })

    return new Promise<void>((resolve) => {
      controller.onFinishCurrent(({ stopped }) => {
        expect(stopped).toBe(false)
        expect(style.width).not.toBe('100px')
        resolve()
      })
    })
  })

  test('register settle listener for the current animation', () => {
    let style: any
    const controller = createAnimateController((_style) => {
      style = _style
    })
    controller.setOptions({ duration: 100 })
    controller.setStyle({ width: '100px' }, { animate: false })
    controller.setStyle({ width: '200px' })

    return new Promise<void>((resolve) => {
      controller.onSettleCurrent(({ stopped }) => {
        expect(stopped).toBe(false)
        expect(style.width).toBe('200px')
        resolve()
      })
    })
  })

  test('stopped == true in onFinishCurrent when animation is stopped by stop()', () => {
    let style: any
    const controller = createAnimateController((_style) => {
      style = _style
    })
    controller.setOptions({ duration: 100 })
    controller.setStyle({ width: '100px' }, { animate: false })
    controller.setStyle({ width: '200px' })

    return new Promise<void>((resolve) => {
      controller.onFinishCurrent(({ stopped }) => {
        expect(stopped).toBe(true)
        expect(style.width).not.toBe('100px')
        expect(style.width).not.toBe('200px')
        resolve()
      })
      controller.stop()
    })
  })

  test('stopped == true in onFinishCurrent when animation is stopped by a new animation', () => {
    const controller = createAnimateController(() => {})
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
    let style: any
    const controller = createAnimateController((_style) => {
      style = _style
    })
    controller.setOptions({ duration: 100 })
    controller.setStyle({ width: '100px' }, { animate: false })
    controller.setStyle({ width: '200px' })

    return new Promise<void>((resolve) => {
      controller.onSettleCurrent(({ stopped }) => {
        expect(stopped).toBe(true)
        expect(style.width).not.toBe('100px')
        expect(style.width).not.toBe('200px')
        resolve()
      })
      controller.stop()
    })
  })

  test('stopped == true in onSettleCurrent when animation is stopped by a new animation', () => {
    const controller = createAnimateController(() => {})
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
})
