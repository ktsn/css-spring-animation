import { describe, expect, test } from 'vitest'
import { stringifyInterpolatedStyle, s } from '../../src/core/style'

describe('s util', () => {
  test('parse px unit', () => {
    const actual = s`${100}px`
    expect(actual).toEqual({
      values: [100],
      units: ['px'],
      strings: ['', ''],
    })
  })

  test('parse % unit', () => {
    const actual = s`${100}%`
    expect(actual).toEqual({
      values: [100],
      units: ['%'],
      strings: ['', ''],
    })
  })

  test('parse translate', () => {
    const actual = s`translate(${100}px, ${200}%)`
    expect(actual).toEqual({
      values: [100, 200],
      units: ['px', '%'],
      strings: ['translate(', ', ', ')'],
    })
  })

  test('parse scale', () => {
    const actual = s`scale(${100}, ${200})`
    expect(actual).toEqual({
      values: [100, 200],
      units: ['', ''],
      strings: ['scale(', ', ', ')'],
    })
  })

  test('parse rotate', () => {
    const actual = s`rotate(${90}deg)`
    expect(actual).toEqual({
      values: [90],
      units: ['deg'],
      strings: ['rotate(', ')'],
    })
  })
})

describe('stringifyInterpolatedStyle', () => {
  test('generate with specified numbers', () => {
    const actual = stringifyInterpolatedStyle(
      {
        units: ['px', '%'],
        strings: ['translate(', ', ', ')'],
      },
      [100, 200],
    )
    expect(actual).toBe('translate(100px, 200%)')
  })

  test('generate with specified expressions', () => {
    const actual = stringifyInterpolatedStyle(
      {
        units: ['px', '%'],
        strings: ['translate(', ', ', ')'],
      },
      ['100 * exp(3)', '100 * exp(4)'],
    )
    expect(actual).toBe(
      'translate(calc(1px * (100 * exp(3))), calc(1% * (100 * exp(4))))',
    )
  })
})
