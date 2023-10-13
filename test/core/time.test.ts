import { describe, expect, test } from 'vitest'
import { wait } from '../../src/core/time'

describe('time', () => {
  test('wait: 10ms', () => {
    const start = performance.now()
    return wait(10).then(() => {
      const end = performance.now()
      expect(end - start).toBeGreaterThan(9.8)
    })
  })

  test('wait: force resolve', () => {
    const start = performance.now()
    const forceResolve = { fn: [] as (() => void)[] }
    const promise = wait(10000, forceResolve)
    forceResolve.fn.forEach((fn) => fn())
    return promise.then(() => {
      const end = performance.now()
      expect(end - start).toBeLessThan(100)
    })
  })
})
