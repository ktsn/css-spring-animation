import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { wait } from '../../src/core/time'

describe('time', () => {
  beforeAll(() => {
    vi.useFakeTimers()
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  test('wait: 16ms', async () => {
    const start = performance.now()
    const promise = wait(16)

    vi.advanceTimersByTimeAsync(16)
    await promise

    const end = performance.now()
    expect(end - start).toBeGreaterThan(15.8)
  })

  test('wait: force resolve', async () => {
    const start = performance.now()
    const forceResolve = { fn: [] as (() => void)[] }
    const promise = wait(10000, forceResolve)
    forceResolve.fn.forEach((fn) => fn())

    await promise

    const end = performance.now()
    expect(end - start).toBeLessThan(100)
  })
})
