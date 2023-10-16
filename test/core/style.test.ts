import { describe, expect, test } from 'vitest'
import { interpolateParsedStyle, parseStyleValue } from '../../src/core/style'

describe('parseStyleValue', () => {
  test('parse number with unit', () => {
    const parsed = parseStyleValue('100px')
    expect(parsed).toEqual({
      values: [100],
      units: ['px'],
      wraps: ['', ''],
    })
  })

  test('parse % unit', () => {
    const parsed = parseStyleValue('100%')
    expect(parsed).toEqual({
      values: [100],
      units: ['%'],
      wraps: ['', ''],
    })
  })

  test('parse translate', () => {
    const parsed = parseStyleValue('translate(100px, 200%)')
    expect(parsed).toEqual({
      values: [100, 200],
      units: ['px', '%'],
      wraps: ['translate(', ', ', ')'],
    })
  })

  test('parse scale', () => {
    const parsed = parseStyleValue('scale(100, 200)')
    expect(parsed).toEqual({
      values: [100, 200],
      units: ['', ''],
      wraps: ['scale(', ', ', ')'],
    })
  })

  test('parse rotate', () => {
    const parsed = parseStyleValue('rotate(90deg)')
    expect(parsed).toEqual({
      values: [90],
      units: ['deg'],
      wraps: ['rotate(', ')'],
    })
  })

  describe('number parser', () => {
    test('integer', () => {
      const parsed = parseStyleValue('100')
      expect(parsed).toEqual({
        values: [100],
        units: [''],
        wraps: ['', ''],
      })
    })

    test('zero', () => {
      const parsed = parseStyleValue('0')
      expect(parsed).toEqual({
        values: [0],
        units: [''],
        wraps: ['', ''],
      })
    })

    test('float', () => {
      const parsed = parseStyleValue('100.5')
      expect(parsed).toEqual({
        values: [100.5],
        units: [''],
        wraps: ['', ''],
      })
    })

    test('float without zero', () => {
      const parsed = parseStyleValue('.5')
      expect(parsed).toEqual({
        values: [0.5],
        units: [''],
        wraps: ['', ''],
      })
    })

    test('with plus sign', () => {
      const parsed = parseStyleValue('+100')
      expect(parsed).toEqual({
        values: [100],
        units: [''],
        wraps: ['', ''],
      })
    })

    test('with minus sign', () => {
      const parsed = parseStyleValue('-100')
      expect(parsed).toEqual({
        values: [-100],
        units: [''],
        wraps: ['', ''],
      })
    })
  })
})

describe('stringifyInterpolatedStyle', () => {
  test('generate with specified numbers', () => {
    const actual = interpolateParsedStyle(
      {
        units: ['px', '%'],
        wraps: ['translate(', ', ', ')'],
      },
      [100, 200],
    )
    expect(actual).toBe('translate(100px, 200%)')
  })

  test('generate with specified expressions', () => {
    const actual = interpolateParsedStyle(
      {
        units: ['px', '%'],
        wraps: ['translate(', ', ', ')'],
      },
      ['100 * exp(3)', '100 * exp(4)'],
    )
    expect(actual).toBe(
      'translate(calc(1px * (100 * exp(3))), calc(1% * (100 * exp(4))))',
    )
  })
})
