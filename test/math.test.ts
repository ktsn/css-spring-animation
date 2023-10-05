import { describe, expect, test } from 'vitest'
import { generateCSSValue, v, var_, cos, exp, add, mul } from '../src/math'

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
})
