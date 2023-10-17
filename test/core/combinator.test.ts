import { describe, expect, test } from 'vitest'
import { hexColor, number } from '../../src/core/combinator'

describe('number combinator', () => {
  test('integer', () => {
    const parsed = number('100')
    expect(parsed).toEqual({
      ok: true,
      value: '100',
      rest: '',
    })
  })

  test('zero', () => {
    const parsed = number('0')
    expect(parsed).toEqual({
      ok: true,
      value: '0',
      rest: '',
    })
  })

  test('float', () => {
    const parsed = number('100.5')
    expect(parsed).toEqual({
      ok: true,
      value: '100.5',
      rest: '',
    })
  })

  test('float without zero', () => {
    const parsed = number('.5')
    expect(parsed).toEqual({
      ok: true,
      value: '.5',
      rest: '',
    })
  })

  test('with plus sign', () => {
    const parsed = number('+100')
    expect(parsed).toEqual({
      ok: true,
      value: '+100',
      rest: '',
    })
  })

  test('with minus sign', () => {
    const parsed = number('-100')
    expect(parsed).toEqual({
      ok: true,
      value: '-100',
      rest: '',
    })
  })

  test('exponential', () => {
    const parsed = number('10e3')
    expect(parsed).toEqual({
      ok: true,
      value: '10e3',
      rest: '',
    })
  })

  test('floating exponential', () => {
    const parsed = number('-3.4e-2')
    expect(parsed).toEqual({
      ok: true,
      value: '-3.4e-2',
      rest: '',
    })
  })
})

describe('hexColor combinator', () => {
  test('#RGB', () => {
    const parsed = hexColor('#abc')
    expect(parsed).toEqual({
      ok: true,
      value: ['#', 'a', 'b', 'c', ''],
      rest: '',
    })
  })

  test('#RRGGBB', () => {
    const parsed = hexColor('#0a1b2c')
    expect(parsed).toEqual({
      ok: true,
      value: ['#', '0a', '1b', '2c', ''],
      rest: '',
    })
  })

  test('#RGBA', () => {
    const parsed = hexColor('#abcd')
    expect(parsed).toEqual({
      ok: true,
      value: ['#', 'a', 'b', 'c', 'd'],
      rest: '',
    })
  })

  test('#RRGGBBAA', () => {
    const parsed = hexColor('#0a1b2c3d')
    expect(parsed).toEqual({
      ok: true,
      value: ['#', '0a', '1b', '2c', '3d'],
      rest: '',
    })
  })
})
