import { describe, expect, test, vitest } from 'vitest'
import { createApp, nextTick, ref } from 'vue'

import { AnimationController } from '../../src/core'
import { spring } from '../../src/vue/spring-element'

let mockController: Record<keyof AnimationController<any>, any>

vitest.mock('../../src/core/controller', async () => {
  const module = await vitest.importActual<any>('../../src/core/controller')

  return {
    ...module,
    createAnimateController: (...args: any[]) => {
      const controller = (mockController = module.createAnimateController(...args))
      vitest.spyOn(controller, 'setStyle')
      vitest.spyOn(controller, 'setOptions')
      return controller
    },
  }
})

describe('Spring Element', () => {
  test('render specified element', () => {
    const root = document.createElement('div')
    const app = createApp({
      template: `
        <springp class="root" data-test-id="test" :spring-style="{ opacity: 1 }">
          Hello
        </springp>
      `,

      components: {
        springp: spring.p!,
      },
    })
    const vm = app.mount(root)
    expect(vm.$el.tagName).toBe('P')
    expect(vm.$el.textContent.trim()).toBe('Hello')
    expect(vm.$el.className).toBe('root')
    expect(vm.$el.getAttribute('data-test-id')).toBe('test')
  })

  test('set initial style', () => {
    const root = document.createElement('div')
    const app = createApp({
      template: `
        <springp :spring-style="{ opacity: 1 }">
          Hello
        </springp>
      `,

      components: {
        springp: spring.p!,
      },
    })
    const vm = app.mount(root)
    expect(vm.$el.style.opacity).toBe('1')
  })

  test('animate when springStyle is updated', async () => {
    const root = document.createElement('div')
    const app = createApp({
      template: `
        <springp :spring-style="springStyle" :bounce="0.2" :duration="800">
          Hello
        </springp>
      `,

      components: {
        springp: spring.p!,
      },

      setup() {
        const springStyle = ref({ opacity: 1 })
        return {
          springStyle,
        }
      },
    })
    const vm: any = app.mount(root)
    expect(vm.$el.style.opacity).toBe('1')

    vm.springStyle.opacity = 0
    await nextTick()
    expect(mockController.setOptions).toHaveBeenCalledWith({
      bounce: 0.2,
      duration: 800,
      disabled: false,
      inferVelocity: true,
    })
    expect(mockController.setStyle).toHaveBeenCalledWith({ opacity: 0 }, { animate: true })
  })

  test('disable animation when disabled prop is true', async () => {
    const root = document.createElement('div')
    const app = createApp({
      template: `
        <springp :spring-style="springStyle" disabled>
          Hello
        </springp>
      `,

      components: {
        springp: spring.p!,
      },

      setup() {
        const springStyle = ref({ opacity: 1 })
        return {
          springStyle,
        }
      },
    })
    const vm: any = app.mount(root)
    expect(vm.$el.style.opacity).toBe('1')

    vm.springStyle.opacity = 0
    await nextTick()
    expect(mockController.setStyle).toHaveBeenCalledWith({ opacity: 0 }, { animate: false })
    expect(vm.$el.style.opacity).toBe('0')
  })

  test('just update style when cannot be animated', async () => {
    const root = document.createElement('div')
    const app = createApp({
      template: `
        <springp :spring-style="springStyle">
          Hello
        </springp>
      `,

      components: {
        springp: spring.p!,
      },

      setup() {
        const springStyle = ref({ height: 'auto' })
        return {
          springStyle,
        }
      },
    })
    const vm: any = app.mount(root)
    expect(vm.$el.style.height).toBe('auto')

    vm.springStyle.height = '100px'

    await nextTick()

    expect(mockController.setStyle).toHaveBeenCalledWith({ height: '100px' }, { animate: true })
    expect(vm.$el.style.height).toBe('100px')
  })

  function mountWithEvents(template: string, setupExtra?: () => any) {
    const root = document.createElement('div')
    const finish = vitest.fn<(data: { stopped: boolean }) => void>()
    const settle = vitest.fn<(data: { stopped: boolean }) => void>()
    const app = createApp({
      template,
      components: {
        springp: spring.p!,
      },
      setup() {
        const springStyle = ref<Record<string, any>>({ width: '10px' })
        return {
          springStyle,
          onFinish: finish,
          onSettle: settle,
          ...setupExtra?.(),
        }
      },
    })
    const vm: any = app.mount(root)
    return { vm, finish, settle }
  }

  function waitForCurrentCycleSettled(): Promise<void> {
    return new Promise<void>((resolve) => {
      mockController.onSettleCurrent(() => resolve())
    })
  }

  test('emit spring-finish and spring-settle on natural completion', async () => {
    const { vm, finish, settle } = mountWithEvents(`
      <springp
        :spring-style="springStyle"
        :duration="10"
        @spring-finish="onFinish"
        @spring-settle="onSettle"
      />
    `)

    vm.springStyle = { width: '20px' }
    await nextTick()
    await nextTick()
    await waitForCurrentCycleSettled()

    expect(finish).toHaveBeenCalledTimes(1)
    expect(settle).toHaveBeenCalledTimes(1)
  })

  test('do not emit for an interrupted cycle', async () => {
    const { vm, finish, settle } = mountWithEvents(`
      <springp
        :spring-style="springStyle"
        :duration="10"
        @spring-finish="onFinish"
        @spring-settle="onSettle"
      />
    `)

    vm.springStyle = { width: '20px' }
    await nextTick()
    await nextTick()
    vm.springStyle = { width: '30px' }
    await nextTick()
    await nextTick()
    await waitForCurrentCycleSettled()

    expect(finish).toHaveBeenCalledTimes(1)
    expect(settle).toHaveBeenCalledTimes(1)
  })

  test('do not emit when disabled', async () => {
    const { vm, finish, settle } = mountWithEvents(
      `
        <springp
          :spring-style="springStyle"
          :duration="10"
          disabled
          @spring-finish="onFinish"
          @spring-settle="onSettle"
        />
      `,
    )

    vm.springStyle = { width: '20px' }
    await nextTick()
    await nextTick()
    await waitForCurrentCycleSettled()

    expect(finish).not.toHaveBeenCalled()
    expect(settle).not.toHaveBeenCalled()
  })

  test('do not emit when springStyle is reassigned with the same values', async () => {
    const { vm, finish, settle } = mountWithEvents(`
      <springp
        :spring-style="springStyle"
        :duration="10"
        @spring-finish="onFinish"
        @spring-settle="onSettle"
      />
    `)

    // Run a real animation to completion first so the second reassignment
    // hits a settled (non-pseudo) ctx, which is the case isSameStyle must guard.
    vm.springStyle = { width: '20px' }
    await nextTick()
    await nextTick()
    await waitForCurrentCycleSettled()
    expect(finish).toHaveBeenCalledTimes(1)
    expect(settle).toHaveBeenCalledTimes(1)

    vm.springStyle = { width: '20px' }
    await nextTick()
    await nextTick()
    await waitForCurrentCycleSettled()

    expect(finish).toHaveBeenCalledTimes(1)
    expect(settle).toHaveBeenCalledTimes(1)
  })
})
