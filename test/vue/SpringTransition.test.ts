import { beforeEach, describe, expect, test, vitest } from 'vitest'
import SpringTransition from '../../src/vue/SpringTransition'
import { AnimationController } from '../../src/core'
import { createApp, nextTick } from 'vue'

let mockController: Record<keyof AnimationController<any>, any> | undefined

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
    expect(mockController?.setStyle).toHaveBeenCalledWith({ opacity: 0 }, false)
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
    expect(mockController?.setStyle).toHaveBeenCalledWith({ opacity: 1 }, false)
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
    expect(mockController?.setStyle).toHaveBeenCalledWith({ opacity: 0 }, false)
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
    expect(mockController?.setStyle).toHaveBeenCalledWith({ opacity: 1 }, false)
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
    expect(mockController?.setStyle).toHaveBeenCalledWith({ opacity: 0 }, false)
    expect(mockController?.setStyle).toHaveBeenCalledWith({ opacity: 1 })

    mockController?.setStyle.mockClear()
    vm.isShow = false
    await nextTick()
    expect(mockController?.setStyle).toHaveBeenCalledOnce()
    expect(mockController?.setStyle).toHaveBeenCalledWith({ opacity: 0.5 })

    mockController?.setStyle.mockClear()
    await wait(20)
    expect(mockController?.setStyle).toHaveBeenCalledOnce()
    expect(mockController?.setStyle).toHaveBeenCalledWith({ opacity: 0 }, false)
  })

  test('trigger before-enter event before setting style', () => {
    return new Promise<void>((resolve, reject) => {
      const root = document.createElement('div')

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
          async onBeforeEnter() {
            try {
              expect(mockController).toBe(undefined)
              resolve()
            } catch (e) {
              reject(e)
            }
          },
        },
      })

      const vm: any = app.mount(root)
      vm.isShow = true
    })
  })

  test('trigger after-enter event after animation', () => {
    return new Promise<void>((resolve, reject) => {
      const root = document.createElement('div')

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
          async onAfterEnter() {
            try {
              expect(mockController?.setStyle).toHaveBeenCalledWith(
                { opacity: 0 },
                false,
              )
              expect(mockController?.setStyle).toHaveBeenCalledWith({
                opacity: 1,
              })
              expect(this.$refs.el.style.display).toBe('')
              resolve()
            } catch (e) {
              reject(e)
            }
          },
        },
      })

      const vm: any = app.mount(root)
      vm.isShow = true
    })
  })

  test('trigger enter-cancelled event on cancelling animation', () => {
    return new Promise<void>(async (resolve) => {
      const root = document.createElement('div')

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
            resolve()
          },
        },
      })

      const vm: any = app.mount(root)
      vm.isShow = true
      await nextTick()
      vm.isShow = false
    })
  })

  test('trigger before-leave event before setting style', () => {
    return new Promise<void>((resolve, reject) => {
      const root = document.createElement('div')

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
          async onBeforeLeave() {
            try {
              expect(mockController).toBe(undefined)
              resolve()
            } catch (e) {
              reject(e)
            }
          },
        },
      })

      const vm: any = app.mount(root)
      vm.isShow = false
    })
  })

  test('trigger after-leave event after animation', () => {
    return new Promise<void>((resolve, reject) => {
      const root = document.createElement('div')

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
          async onAfterLeave() {
            try {
              expect(mockController?.setStyle).toHaveBeenCalledWith(
                { opacity: 1 },
                false,
              )
              expect(mockController?.setStyle).toHaveBeenCalledWith({
                opacity: 0,
              })
              expect(this.$refs.el.style.display).toBe('none')
              resolve()
            } catch (e) {
              reject(e)
            }
          },
        },
      })

      const vm: any = app.mount(root)
      vm.isShow = false
    })
  })

  test('trigger leave-cancelled event on cancelling animation', () => {
    return new Promise<void>(async (resolve) => {
      const root = document.createElement('div')

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
            resolve()
          },
        },
      })

      const vm: any = app.mount(root)
      vm.isShow = false
      await nextTick()
      vm.isShow = true
    })
  })
})
