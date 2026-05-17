import { beforeEach, describe, expect, test, vitest } from 'vitest'
import { createApp, nextTick } from 'vue'

import { AnimationController } from '../../src/core'
import SpringTransition from '../../src/vue/SpringTransition'

let mockController: Record<keyof AnimationController<any>, any> | undefined

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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

describe('SpringTransition', () => {
  beforeEach(() => {
    mockController = undefined
  })

  test('set enterFrom style followed by springStyle on enter', async () => {
    const root = document.createElement('div')

    const app = createApp({
      template: `
        <spring-transition :enter-from="{ opacity: 0 }" :spring-style="{ opacity: 1 }">
          <span v-show="isShow">Hello</span>
        </spring-transition>
      `,
      components: {
        SpringTransition,
      },
      data() {
        return {
          isShow: false,
        }
      },
    })

    const vm: any = app.mount(root)
    vm.isShow = true
    await nextTick()
    expect(mockController?.setStyle).toHaveBeenCalledWith({ opacity: 0 }, { animate: false })
    expect(mockController?.setStyle).toHaveBeenCalledWith({ opacity: 1 })
  })

  test('set leaveTo style on leave', async () => {
    const root = document.createElement('div')

    const app = createApp({
      template: `
        <spring-transition :enter-from="{ opacity: 0 }" :spring-style="{ opacity: 1 }" :leave-to="{ opacity: 0 }">
          <span v-show="isShow">Hello</span>
        </spring-transition>
      `,
      components: {
        SpringTransition,
      },
      data() {
        return {
          isShow: false,
        }
      },
    })

    const vm: any = app.mount(root)
    vm.isShow = true
    await nextTick()
    mockController?.setStyle.mockClear()

    vm.isShow = false
    await nextTick()
    expect(mockController?.setStyle).toHaveBeenCalledOnce()
    expect(mockController?.setStyle).toHaveBeenCalledWith({ opacity: 0 })
  })

  test('use enterFrom style for leave when leaveTo is not specified', async () => {
    const root = document.createElement('div')

    const app = createApp({
      template: `
        <spring-transition :enter-from="{ opacity: 0 }" :spring-style="{ opacity: 1 }">
          <span v-show="isShow">Hello</span>
        </spring-transition>
      `,
      components: {
        SpringTransition,
      },
      data() {
        return {
          isShow: false,
        }
      },
    })

    const vm: any = app.mount(root)
    vm.isShow = true
    await nextTick()
    mockController?.setStyle.mockClear()

    vm.isShow = false
    await nextTick()
    expect(mockController?.setStyle).toHaveBeenCalledOnce()
    expect(mockController?.setStyle).toHaveBeenCalledWith({ opacity: 0 })
  })

  test('set leaveTo style after springStyle on leave when the element has not entered', async () => {
    const root = document.createElement('div')

    const app = createApp({
      template: `
        <spring-transition :spring-style="{ opacity: 1 }" :leave-to="{ opacity: 0 }">
          <span v-show="isShow">Hello</span>
        </spring-transition>
      `,
      components: {
        SpringTransition,
      },
      data() {
        return {
          isShow: true,
        }
      },
    })

    const vm: any = app.mount(root)
    vm.isShow = false
    await nextTick()
    expect(mockController?.setStyle).toHaveBeenCalledWith({ opacity: 1 }, { animate: false })
    expect(mockController?.setStyle).toHaveBeenCalledWith({ opacity: 0 })
  })

  test('set leaveTo style after espringStyle on enter cancelled', async () => {
    const root = document.createElement('div')

    const app = createApp({
      template: `
        <spring-transition :enter-from="{ opacity: 0 }" :spring-style="{ opacity: 1 }" :leave-to="{ opacity: 0 }">
          <span v-show="isShow">Hello</span>
        </spring-transition>
      `,
      components: {
        SpringTransition,
      },
      data() {
        return {
          isShow: false,
        }
      },
    })

    const vm: any = app.mount(root)
    vm.isShow = true
    await nextTick()
    expect(mockController?.setStyle).toHaveBeenCalledWith({ opacity: 0 }, { animate: false })
    expect(mockController?.setStyle).toHaveBeenCalledWith({ opacity: 1 })

    mockController?.setStyle.mockClear()
    vm.isShow = false
    await nextTick()
    expect(mockController?.setStyle).toHaveBeenCalledOnce()
    expect(mockController?.setStyle).toHaveBeenCalledWith({ opacity: 0 })
  })

  test('set springStyle after leaveTo style on leave cancelled', async () => {
    const root = document.createElement('div')

    const app = createApp({
      template: `
        <spring-transition :spring-style="{ opacity: 1 }" :leave-to="{ opacity: 0 }">
          <span v-show="isShow">Hello</span>
        </spring-transition>
      `,
      components: {
        SpringTransition,
      },
      data() {
        return {
          isShow: true,
        }
      },
    })

    const vm: any = app.mount(root)
    vm.isShow = false
    await nextTick()
    expect(mockController?.setStyle).toHaveBeenCalledWith({ opacity: 1 }, { animate: false })
    expect(mockController?.setStyle).toHaveBeenCalledWith({ opacity: 0 })

    mockController?.setStyle.mockClear()
    vm.isShow = true
    await nextTick()
    expect(mockController?.setStyle).toHaveBeenCalledOnce()
    expect(mockController?.setStyle).toHaveBeenCalledWith({ opacity: 1 })
  })

  test('set enterFrom style after leave animation ended', async () => {
    const root = document.createElement('div')

    const app = createApp({
      template: `
        <spring-transition :enter-from="{ opacity: 0 }" :spring-style="{ opacity: 1 }" :leave-to="{ opacity: 0.5 }" :duration="10">
          <span v-show="isShow">Hello</span>
        </spring-transition>
      `,
      components: {
        SpringTransition,
      },
      data() {
        return {
          isShow: false,
        }
      },
    })

    const vm: any = app.mount(root)
    vm.isShow = true
    await nextTick()
    expect(mockController?.setStyle).toHaveBeenCalledWith({ opacity: 0 }, { animate: false })
    expect(mockController?.setStyle).toHaveBeenCalledWith({ opacity: 1 })

    mockController?.setStyle.mockClear()
    vm.isShow = false
    await nextTick()
    expect(mockController?.setStyle).toHaveBeenCalledOnce()
    expect(mockController?.setStyle).toHaveBeenCalledWith({ opacity: 0.5 })

    mockController?.setStyle.mockClear()
    await wait(20)
    expect(mockController?.setStyle).toHaveBeenCalledOnce()
    expect(mockController?.setStyle).toHaveBeenCalledWith({ opacity: 0 }, { animate: false })
  })

  test('trigger before-enter event before setting style', async () => {
    const root = document.createElement('div')
    let resolveBefore!: (controller: typeof mockController) => void
    const beforeEntered = new Promise<typeof mockController>((resolve) => {
      resolveBefore = resolve
    })

    const app = createApp({
      template: `
        <spring-transition :enter-from="{ opacity: 0 }" :spring-style="{ opacity: 1 }" @before-enter="onBeforeEnter">
          <span v-show="isShow">Hello</span>
        </spring-transition>
      `,
      components: {
        SpringTransition,
      },
      data() {
        return {
          isShow: false,
        }
      },
      methods: {
        onBeforeEnter() {
          resolveBefore(mockController)
        },
      },
    })

    const vm: any = app.mount(root)
    vm.isShow = true
    const controllerAtEvent = await beforeEntered
    expect(controllerAtEvent).toBe(undefined)
  })

  test('trigger after-enter event after animation', async () => {
    const root = document.createElement('div')
    let resolveAfter!: (el: HTMLElement) => void
    const afterEntered = new Promise<HTMLElement>((resolve) => {
      resolveAfter = resolve
    })

    const app = createApp({
      template: `
        <spring-transition :enter-from="{ opacity: 0 }" :spring-style="{ opacity: 1 }" @after-enter="onAfterEnter" :duration="10">
          <span v-show="isShow" ref="el">Hello</span>
        </spring-transition>
      `,
      components: {
        SpringTransition,
      },
      data() {
        return {
          isShow: false,
        }
      },
      methods: {
        onAfterEnter() {
          resolveAfter(this.$refs.el as HTMLElement)
        },
      },
    })

    const vm: any = app.mount(root)
    vm.isShow = true
    const el = await afterEntered
    expect(mockController?.setStyle).toHaveBeenCalledWith({ opacity: 0 }, { animate: false })
    expect(mockController?.setStyle).toHaveBeenCalledWith({ opacity: 1 })
    expect(el.style.display).toBe('')
  })

  test('trigger enter-cancelled event on cancelling animation', async () => {
    const root = document.createElement('div')
    let resolveCancelled!: () => void
    const cancelled = new Promise<void>((resolve) => {
      resolveCancelled = resolve
    })

    const app = createApp({
      template: `
        <spring-transition :enter-from="{ opacity: 0 }" :spring-style="{ opacity: 1 }" @enter-cancelled="onEnterCancelled">
          <span v-show="isShow">Hello</span>
        </spring-transition>
      `,
      components: {
        SpringTransition,
      },
      data() {
        return {
          isShow: false,
        }
      },
      methods: {
        onEnterCancelled() {
          resolveCancelled()
        },
      },
    })

    const vm: any = app.mount(root)
    vm.isShow = true
    await nextTick()
    vm.isShow = false
    await cancelled
    expect(mockController?.setStyle).toHaveBeenCalled()
  })

  test('trigger before-leave event before setting style', async () => {
    const root = document.createElement('div')
    let resolveBefore!: (controller: typeof mockController) => void
    const beforeLeft = new Promise<typeof mockController>((resolve) => {
      resolveBefore = resolve
    })

    const app = createApp({
      template: `
        <spring-transition :spring-style="{ opacity: 1 }" :leave-to="{ opacity: 0 }" @before-leave="onBeforeLeave">
          <span v-show="isShow">Hello</span>
        </spring-transition>
      `,
      components: {
        SpringTransition,
      },
      data() {
        return {
          isShow: true,
        }
      },
      methods: {
        onBeforeLeave() {
          resolveBefore(mockController)
        },
      },
    })

    const vm: any = app.mount(root)
    vm.isShow = false
    const controllerAtEvent = await beforeLeft
    expect(controllerAtEvent).toBe(undefined)
  })

  test('trigger after-leave event after animation', async () => {
    const root = document.createElement('div')
    let resolveAfter!: (el: HTMLElement) => void
    const afterLeft = new Promise<HTMLElement>((resolve) => {
      resolveAfter = resolve
    })

    const app = createApp({
      template: `
        <spring-transition :spring-style="{ opacity: 1 }" :leave-to="{ opacity: 0 }" @after-leave="onAfterLeave" :duration="10">
          <span v-show="isShow" ref="el">Hello</span>
        </spring-transition>
      `,
      components: {
        SpringTransition,
      },
      data() {
        return {
          isShow: true,
        }
      },
      methods: {
        onAfterLeave() {
          resolveAfter(this.$refs.el as HTMLElement)
        },
      },
    })

    const vm: any = app.mount(root)
    vm.isShow = false
    const el = await afterLeft
    expect(mockController?.setStyle).toHaveBeenCalledWith({ opacity: 1 }, { animate: false })
    expect(mockController?.setStyle).toHaveBeenCalledWith({ opacity: 0 })
    expect(el.style.display).toBe('none')
  })

  test('trigger leave-cancelled event on cancelling animation', async () => {
    const root = document.createElement('div')
    let resolveCancelled!: () => void
    const cancelled = new Promise<void>((resolve) => {
      resolveCancelled = resolve
    })

    const app = createApp({
      template: `
        <spring-transition :spring-style="{ opacity: 1 }" :leave-to="{ opacity: 0 }" @leave-cancelled="onLeaveCancelled">
          <span v-show="isShow">Hello</span>
        </spring-transition>
      `,
      components: {
        SpringTransition,
      },
      data() {
        return {
          isShow: true,
        }
      },
      methods: {
        onLeaveCancelled() {
          resolveCancelled()
        },
      },
    })

    const vm: any = app.mount(root)
    vm.isShow = false
    await nextTick()
    vm.isShow = true
    await cancelled
    expect(mockController?.setStyle).toHaveBeenCalled()
  })
})
