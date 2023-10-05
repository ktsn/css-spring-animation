import { describe, expect, test } from 'vitest'
import {
  generateCSSValue,
  v,
  var_,
  cos,
  exp,
  add,
  mul,
  calculate,
} from '../src/math'

describe('math', () => {
  describe('generateCSSValue', () => {
    test('value', () => {
      expect(generateCSSValue(v(1))).toBe('1')
    })

    test('variiable', () => {
      expect(generateCSSValue(var_('--foo'))).toBe('var(--foo)')
    })

    test('cosine', () => {
      expect(generateCSSValue(cos(v(1)))).toBe('cos(1rad * (1))')
    })

    test('exponential', () => {
      expect(generateCSSValue(exp(v(1)))).toBe('exp(1)')
    })

    test('addition', () => {
      expect(generateCSSValue(add(v(1), v(2)))).toBe('(1 + 2)')
    })

    test('multiplication', () => {
      expect(generateCSSValue(mul(v(1), v(2)))).toBe('(1 * 2)')
    })

    test('complex', () => {
      expect(
        generateCSSValue(
          add(mul(cos(add(mul(v(1), v(2)), exp(v(3)))), v(4)), var_('--foo')),
        ),
      ).toBe('((cos(1rad * (((1 * 2) + exp(3)))) * 4) + var(--foo))')
    })
  })

  describe('calculate', () => {
    test('value', () => {
      expect(calculate(v(1))).toBe(1)
    })

    test('variable', () => {
      expect(calculate(var_('--foo'), { '--foo': 1 })).toBe(1)
    })

    test('cosine', () => {
      expect(calculate(cos(v(Math.PI)))).toBe(-1)
    })

    test('exponential', () => {
      expect(calculate(exp(v(1)))).toBe(Math.exp(1))
    })

    test('addition', () => {
      expect(calculate(add(v(2), v(3)))).toBe(5)
    })

    test('multiplication', () => {
      expect(calculate(mul(v(2), v(3)))).toBe(6)
    })
  })
})
