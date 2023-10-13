import { describe, expect, test } from 'vitest'
import { zip } from '../../src/core/utils'

describe('zip', () => {
  test('zip arrays', () => {
    const actual = zip([1, 2, 3], [4, 5, 6])
    expect(actual).toEqual([
      [1, 4],
      [2, 5],
      [3, 6],
    ])
  })
})
