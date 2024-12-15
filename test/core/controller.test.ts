import { describe, expect, test, vitest } from 'vitest'
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

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(actual?.width).toBe('0px')
        resolve()
      }, 20)
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

  test('realValue is as same as value in style before animation', () => {
    const controller = createAnimateController(() => {})
    controller.setStyle({ transform: `100px 200px` })
    expect(controller.realValue).toEqual({ transform: [100, 200] })
  })

  test('realValue is actual value while animating', () => {
    const controller = createAnimateController(() => {})
    controller.setOptions({ duration: 10 })
    controller.setStyle({ transform: `100px 200px` })
    controller.setStyle({ transform: `200px 300px` })
    expect(controller.realValue.transform).not.toEqual([100, 200])
    expect(controller.realValue.transform).not.toEqual([200, 300])
  })

  test('realValue is stopped value after stopping', () => {
    const controller = createAnimateController(() => {})
    controller.setOptions({ duration: 100 })
    controller.setStyle({ transform: `100px 200px` })
    controller.setStyle({ transform: `200px 300px` })
    controller.stop()
    expect(controller.realValue.transform).not.toEqual([100, 200])
    expect(controller.realValue.transform).not.toEqual([200, 300])
  })

  test('realVelocity is 0 before animation', () => {
    const controller = createAnimateController(() => {})
    controller.setStyle({ transform: `100px 200px` })
    expect(controller.realVelocity.transform).toEqual([0, 0])
  })

  test('realVelocity is actual velocity while animating', () => {
    const controller = createAnimateController(() => {})
    controller.setOptions({ duration: 10 })
    controller.setStyle({ transform: `100px 200px` })
    controller.setStyle({ transform: `200px 300px` })
    expect(controller.realVelocity.transform).not.toEqual([0, 0])
  })

  test('realVelocity is 0 after stopping', () => {
    const controller = createAnimateController(() => {})
    controller.setOptions({ duration: 100 })
    controller.setStyle({ transform: `100px 200px` })
    controller.setStyle({ transform: `200px 300px` })
    controller.stop()
    expect(controller.realVelocity.transform).toEqual([0, 0])
  })

  test('realVelocity is kept when stopped with keepVelocity option', () => {
    const controller = createAnimateController(() => {})
    controller.setOptions({ duration: 100 })
    controller.setStyle({ transform: `100px 200px` })
    controller.setStyle({ transform: `200px 300px` })
    controller.stop({ keepVelocity: true })
    expect(controller.realVelocity.transform).not.toEqual([0, 0])
  })

  test('realVelocity is calculated from value history without animation', () => {
    const controller = createAnimateController(() => {})
    controller.setStyle({ transform: `100px 200px` }, { animate: false })
    controller.setStyle({ transform: `101px 200px` }, { animate: false })
    controller.setStyle({ transform: `102px 200px` }, { animate: false })
    expect(controller.realVelocity.transform?.[0]).not.toBe(0)
    expect(controller.realVelocity.transform?.[1]).toBe(0)
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
        expect(style.width).toBe(controller.realValue.width![0] + 'px')
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
        expect(style.width).toBe(controller.realValue.width![0] + 'px')
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
