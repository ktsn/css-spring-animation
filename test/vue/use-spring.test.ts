import { afterEach, describe, expect, test } from 'vite-plus/test'
import { EffectScope, effectScope, nextTick, ref } from 'vue'

import { useSpring } from '../../src/vue/use-spring'

describe('useSpring', () => {
  let scope: EffectScope | undefined

  afterEach(() => {
    scope?.stop()
    scope = undefined
  })

  function runInScope<T>(fn: () => T): T {
    scope = effectScope()
    return scope.run(fn) as T
  }

  test('apply initial style on the element synchronously', () => {
    const el = document.createElement('div')
    runInScope(() => {
      useSpring(el, () => {
        return {
          width: `10px`,
        }
      })
    })

    expect(el.style.width).toBe('10px')
  })

  test('update style value immediately when disabled', async () => {
    const el = document.createElement('div')
    const value = ref(10)

    runInScope(() => {
      useSpring(
        el,
        () => {
          return {
            width: `${value.value}px`,
          }
        },
        {
          disabled: true,
        },
      )
    })

    expect(el.style.width).toBe('10px')
    value.value = 20
    await nextTick()
    expect(el.style.width).toBe('20px')
  })

  test('register finish listener for the current animation', () => {
    const el = document.createElement('div')
    const value = ref(10)

    const { onFinishCurrent } = runInScope(() =>
      useSpring(
        el,
        () => ({
          width: `${value.value}px`,
        }),
        {
          duration: 100,
        },
      ),
    )

    return new Promise<void>((resolve) => {
      value.value = 20
      onFinishCurrent(({ stopped }) => {
        expect(stopped).toBe(false)
        resolve()
      })
    })
  })

  test('register settle listener for the current animation', () => {
    const el = document.createElement('div')
    const value = ref(10)

    const { onSettleCurrent } = runInScope(() =>
      useSpring(
        el,
        () => ({
          width: `${value.value}px`,
        }),
        {
          duration: 100,
        },
      ),
    )

    return new Promise<void>((resolve) => {
      value.value = 20
      onSettleCurrent(({ stopped }) => {
        expect(stopped).toBe(false)
        expect(el.style.width).toBe('20px')
        resolve()
      })
    })
  })

  test('running animation completes when disabled', async () => {
    const el = document.createElement('div')
    const value = ref(10)
    const disabled = ref(false)

    const { onFinishCurrent } = runInScope(() =>
      useSpring(
        el,
        () => ({
          width: `${value.value}px`,
        }),
        () => ({
          duration: 100,
          disabled: disabled.value,
        }),
      ),
    )

    // Start the animation, then disable it while it is still running.
    value.value = 20
    await nextTick()
    disabled.value = true

    return new Promise<void>((resolve) => {
      onFinishCurrent(({ stopped }) => {
        expect(stopped).toBe(false)
        resolve()
      })
    })
  })

  test('running animation settles when disabled', async () => {
    const el = document.createElement('div')
    const value = ref(10)
    const disabled = ref(false)

    const { onSettleCurrent } = runInScope(() =>
      useSpring(
        el,
        () => ({
          width: `${value.value}px`,
        }),
        () => ({
          duration: 100,
          disabled: disabled.value,
        }),
      ),
    )

    // Start the animation, then disable it while it is still running.
    value.value = 20
    await nextTick()
    disabled.value = true

    return new Promise<void>((resolve) => {
      onSettleCurrent(({ stopped }) => {
        expect(stopped).toBe(false)
        expect(el.style.width).toBe('20px')
        resolve()
      })
    })
  })

  test('assigning a style value while disabled stops the in-progress animation', async () => {
    const el = document.createElement('div')
    const value = ref(10)
    const disabled = ref(false)

    runInScope(() =>
      useSpring(
        el,
        () => ({
          width: `${value.value}px`,
        }),
        () => ({
          duration: 100,
          disabled: disabled.value,
        }),
      ),
    )

    // Start the animation and let it run for a tick.
    value.value = 20
    await nextTick()

    // The animation is in progress: the value is between the start and target.
    expect(el.style.width).not.toBe('10px')
    expect(el.style.width).not.toBe('20px')

    // Disable, then assign a new value to stop the running animation.
    disabled.value = true
    value.value = 30
    await nextTick()

    // The value snaps to the assigned value immediately instead of animating,
    // which means the in-progress animation was stopped.
    expect(el.style.width).toBe('30px')
  })
})
