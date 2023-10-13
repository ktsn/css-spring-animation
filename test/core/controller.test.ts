import { describe, expect, test, vitest } from 'vitest'
import { createAnimateController, s } from '../../src/core'

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
      width: s`${100}px`,
    })
    expect(actual).toEqual({ width: '100px' })
  })

  test('set style without animation', () => {
    let actual: Record<string, string> | undefined
    const controller = createAnimateController((style) => {
      actual = style
    })
    controller.setStyle({ width: s`${100}px` })
    expect(actual).toEqual({ width: '100px' })
    controller.setStyle({ width: s`${200}px` }, false)
    expect(actual).toEqual({ width: '200px' })
  })

  test('set style with animation', () => {
    let actual: Record<string, string> | undefined
    const controller = createAnimateController((style) => {
      actual = style
    })
    controller.setOptions({ duration: 10 })
    controller.setStyle({ width: s`${100}px` })
    expect(actual).toEqual({ width: '100px' })

    controller.setStyle({ width: s`${200}px` })
    expect(actual?.width).not.toBe('100px')
    expect(actual?.width).not.toBe('200px')
  })

  test('stop animation', () => {
    let actual: Record<string, string> | undefined
    const controller = createAnimateController((style) => {
      actual = style
    })
    controller.setOptions({ duration: 1000 })
    controller.setStyle({ width: s`${100}px` })
    expect(actual).toEqual({ width: '100px' })

    controller.setStyle({ width: s`${200}px` })
    controller.stop()
    expect(actual?.width).not.toBe('100px')
    expect(actual?.width).not.toBe('200px')
  })

  test('realValue is as same as value in style before animation', () => {
    const controller = createAnimateController(() => {})
    controller.setStyle({ transform: s`${100}px ${200}px` })
    expect(controller.realValue).toEqual({ transform: [100, 200] })
  })

  test('realValue is actual value while animating', () => {
    const controller = createAnimateController(() => {})
    controller.setOptions({ duration: 10 })
    controller.setStyle({ transform: s`${100}px ${200}px` })
    controller.setStyle({ transform: s`${200}px ${300}px` })
    expect(controller.realValue.transform).not.toEqual([100, 200])
    expect(controller.realValue.transform).not.toEqual([200, 300])
  })

  test('realValue is stopped value after stopping', () => {
    const controller = createAnimateController(() => {})
    controller.setOptions({ duration: 100 })
    controller.setStyle({ transform: s`${100}px ${200}px` })
    controller.setStyle({ transform: s`${200}px ${300}px` })
    controller.stop()
    expect(controller.realValue.transform).not.toEqual([100, 200])
    expect(controller.realValue.transform).not.toEqual([200, 300])
  })

  test('realVelocity is 0 before animation', () => {
    const controller = createAnimateController(() => {})
    controller.setStyle({ transform: s`${100}px ${200}px` })
    expect(controller.realVelocity.transform).toEqual([0, 0])
  })

  test('realVelocity is actual velocity while animating', () => {
    const controller = createAnimateController(() => {})
    controller.setOptions({ duration: 10 })
    controller.setStyle({ transform: s`${100}px ${200}px` })
    controller.setStyle({ transform: s`${200}px ${300}px` })
    expect(controller.realVelocity.transform).not.toEqual([0, 0])
  })

  test('realVelocity is 0 after stopping', () => {
    const controller = createAnimateController(() => {})
    controller.setOptions({ duration: 100 })
    controller.setStyle({ transform: s`${100}px ${200}px` })
    controller.setStyle({ transform: s`${200}px ${300}px` })
    controller.stop()
    expect(controller.realVelocity.transform).toEqual([0, 0])
  })
})
