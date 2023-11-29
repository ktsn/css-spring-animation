import { describe, expect, test, vitest } from 'vitest'
import { createAnimateController } from '../../src/core'
import { t } from '../../src/core/time'

vitest.mock('../../src/core/utils', async () => {
  const actual = await vitest.importActual<object>('../../src/core/utils')
  return {
    ...actual,
    isBrowserSupported: () => true,
  }
})

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
    controller.setStyle({ width: `200px` }, false)
    expect(actual).toEqual({ width: '200px', transition: '', [t]: '' })
  })

  test('set style with animation', () => {
    let actual: Record<string, string> | undefined
    const controller = createAnimateController((style) => {
      actual = style
    })
    controller.setOptions({ duration: 10 })
    controller.setStyle({ width: `100px` })
    expect(actual?.width).toEqual('100px')

    controller.setStyle({ width: `200px` })
    expect(actual?.width).not.toBe('100px')
    expect(actual?.width).not.toBe('200px')
    expect(actual?.transition).not.toBe('')
    expect(actual?.[t]).not.toBe('')
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

  test('realVelocity is calculated from value history without animation', () => {
    const controller = createAnimateController(() => {})
    controller.setStyle({ transform: `100px 200px` }, false)
    controller.setStyle({ transform: `101px 200px` }, false)
    controller.setStyle({ transform: `102px 200px` }, false)
    expect(controller.realVelocity.transform?.[0]).not.toBe(0)
    expect(controller.realVelocity.transform?.[1]).toBe(0)
  })

  test('register finish listener for the current animation', () => {
    let style: any
    const controller = createAnimateController((_style) => {
      style = _style
    })
    controller.setOptions({ duration: 10 })
    controller.setStyle({ width: '100px' }, false)
    controller.setStyle({ width: '200px' })

    return new Promise<void>((resolve) => {
      controller.onFinishCurrent(({ stopped }) => {
        expect(stopped).toBe(false)
        expect(style.width).not.toBe('100px')
        resolve()
      })
    })
  })

  test('stopped == true when animation is stopped by stop()', () => {
    let style: any
    const controller = createAnimateController((_style) => {
      style = _style
    })
    controller.setOptions({ duration: 100 })
    controller.setStyle({ width: '100px' }, false)
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

  test('stopped == true when animation is stopped by a new animation', () => {
    let style: any
    const controller = createAnimateController((_style) => {
      style = _style
    })
    controller.setOptions({ duration: 100 })
    controller.setStyle({ width: '100px' }, false)
    controller.setStyle({ width: '200px' })

    return new Promise<void>((resolve) => {
      controller.onFinishCurrent(({ stopped }) => {
        expect(stopped).toBe(true)
        resolve()
      })
      controller.setStyle({ width: '300px' })
    })
  })
})
