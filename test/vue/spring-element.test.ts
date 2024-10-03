import { describe, expect, test, vitest } from 'vitest'
import { createApp, nextTick, ref } from 'vue'
import { spring } from '../../src/vue/spring-element'
import { AnimationController } from '../../src/core'

let mockController: Record<keyof AnimationController<any>, any>

vitest.mock('../../src/core/controller', async () => {
  const module = await vitest.importActual<any>('../../src/core/controller')

  return {
    ...module,
    createAnimateController: (...args: any[]) => {
      const controller = (mockController = module.createAnimateController(
        ...args,
      ))
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
    })
    expect(mockController.setStyle).toHaveBeenCalledWith({ opacity: 0 })
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
    expect(mockController.setStyle).toHaveBeenCalledWith(
      { opacity: 0 },
      { animate: false },
    )
  })
})
