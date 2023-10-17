import { beforeEach, describe, expect, test, vitest } from 'vitest'
import { createApp, nextTick, ref } from 'vue'
import { vSpringStyle, vSpringOptions } from '../../src/vue/directives'
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

describe('directives', () => {
  beforeEach(() => {
    vitest.resetAllMocks()
  })

  test('set style value', async () => {
    const root = document.createElement('div')
    const app = createApp({
      template: '<div v-spring-style="{ opacity: 0 }"></div>',
      directives: {
        springStyle: vSpringStyle,
      },
    })
    app.mount(root)
    expect(mockController.setStyle).toHaveBeenCalledWith({ opacity: 0 })
  })

  test('set both style and options', async () => {
    const root = document.createElement('div')
    const app = createApp({
      template:
        '<div v-spring-style="{ opacity: 0 }" v-spring-options="{ bounce: 0.2 }"></div>',
      directives: {
        springStyle: vSpringStyle,
        springOptions: vSpringOptions,
      },
    })
    app.mount(root)
    expect(mockController.setOptions).toHaveBeenCalledWith({ bounce: 0.2 })
    expect(mockController.setStyle).toHaveBeenCalledWith({ opacity: 0 })
  })

  test('detect update', async () => {
    const opacity = ref(0)
    const bounce = ref(0.2)

    const root = document.createElement('div')
    const app = createApp({
      template:
        '<div v-spring-style="{ opacity }" v-spring-options="{ bounce }"></div>',
      directives: {
        springStyle: vSpringStyle,
        springOptions: vSpringOptions,
      },
      setup() {
        return {
          opacity,
          bounce,
        }
      },
    })
    app.mount(root)
    mockController.setStyle.mockClear()
    mockController.setOptions.mockClear()

    opacity.value = 1
    bounce.value = 0
    await nextTick()

    expect(mockController.setOptions).toHaveBeenCalledWith({ bounce: 0 })
    expect(mockController.setStyle).toHaveBeenCalledWith({ opacity: 1 })
  })

  test('set style property', () => {
    const root = document.createElement('div')
    const app = createApp({
      template:
        "<div v-spring-style=\"{ width: '100%', backgroundColor: '#fff' }\"></div>",
      directives: {
        springStyle: vSpringStyle,
      },
    })
    const vm = app.mount(root)
    expect(vm.$el.style.width).toBe('100%')
    expect(vm.$el.style.backgroundColor).toBe('rgb(255, 255, 255)')
  })
})
