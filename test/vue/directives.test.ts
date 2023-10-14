import { beforeEach, describe, expect, test, vitest } from 'vitest'
import { createApp, nextTick, ref } from 'vue'
import { vSpringStyle, vSpringOptions } from '../../src/vue/directives'

const mockController = {
  setStyle: vitest.fn(),
  setOptions: vitest.fn(),
}

vitest.mock('../../src/core/controller', () => {
  return {
    createAnimateController: () => {
      return mockController
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
})
