import { describe, expect, test, vitest } from 'vitest'
import { createApp, nextTick } from 'vue'
import SpringTransitionGroup from '../../src/vue/SpringTransitionGroup'
import { scKey } from '../../src/vue/SpringTransition'
import { AnimationController } from '../../src/core'

vitest.mock('../../src/core/controller', async () => {
  const module = await vitest.importActual<any>('../../src/core/controller')

  return {
    ...module,
    createAnimateController: (...args: any[]) => {
      const controller = module.createAnimateController(...args)
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

describe('SpringTransitionGroup', () => {
  test('set enterFrom style followed by springStyle on enter', async () => {
    const root = document.createElement('div')

    const app = createApp({
      template: `
        <spring-transition-group :enter-from="{ opacity: 0 }" :spring-style="{ opacity: 1 }">
          <div v-for="item of list" key="item" ref="els">{{ item }}</div>
        </spring-transition-group>
      `,
      components: {
        SpringTransitionGroup,
      },
      data() {
        return {
          list: [],
        }
      },
    })

    const vm: any = app.mount(root)
    vm.list = ['a']
    await nextTick()

    const controller: AnimationController<any> = vm.$refs.els[0][scKey]
    expect(controller.setStyle).toHaveBeenCalledWith({ opacity: 0 }, false)
    expect(controller.setStyle).toHaveBeenCalledWith({ opacity: 1 })
  })

  test('set leaveTo style on leave', async () => {
    const root = document.createElement('div')

    const app = createApp({
      template: `
        <spring-transition-group :enter-from="{ opacity: 0 }" :spring-style="{ opacity: 1 }" :leave-to="{ opacity: 0 }">
          <div v-for="item of list" key="item" ref="els">{{ item }}</div>
        </spring-transition-group>
      `,
      components: {
        SpringTransitionGroup,
      },
      data() {
        return {
          list: [],
        }
      },
    })

    const vm: any = app.mount(root)

    vm.list = ['a']
    await nextTick()
    const controller = vm.$refs.els[0][scKey]
    controller.setStyle.mockClear()

    vm.list = []
    await nextTick()

    expect(controller.setStyle).toHaveBeenCalledTimes(1)
    expect(controller.setStyle).toHaveBeenCalledWith({ opacity: 0 })
  })

  test('set leaveTo after springStyle on leave when the element has not entered', async () => {
    const root = document.createElement('div')

    const app = createApp({
      template: `
        <spring-transition-group :spring-style="{ opacity: 1 }" :leave-to="{ opacity: 0 }">
          <div v-for="item of list" key="item" ref="els">{{ item }}</div>
        </spring-transition-group>
      `,
      components: {
        SpringTransitionGroup,
      },
      data() {
        return {
          list: ['a'],
        }
      },
    })

    const vm: any = app.mount(root)
    const el = vm.$refs.els[0]

    vm.list = []
    await nextTick()

    expect(el[scKey].setStyle).toHaveBeenCalledWith({ opacity: 1 }, false)
    expect(el[scKey].setStyle).toHaveBeenCalledWith({ opacity: 0 })
  })

  test('set leaveTo style after springStyle on enter cancelled', async () => {
    const root = document.createElement('div')

    const app = createApp({
      template: `
        <spring-transition-group :enter-from="{ opacity: 0 }" :spring-style="{ opacity: 1 }" :leave-to="{ opacity: 0 }">
          <div v-for="item of list" key="item" ref="els">{{ item }}</div>
        </spring-transition-group>
      `,
      components: {
        SpringTransitionGroup,
      },
      data() {
        return {
          list: [],
        }
      },
    })

    const vm: any = app.mount(root)
    vm.list = ['a']
    await nextTick()

    const controller = vm.$refs.els[0][scKey]
    expect(controller.setStyle).toHaveBeenCalledWith({ opacity: 0 }, false)
    expect(controller.setStyle).toHaveBeenCalledWith({ opacity: 1 })
    controller.setStyle.mockClear()

    vm.list = []
    await nextTick()

    expect(controller.setStyle).toHaveBeenCalledTimes(1)
    expect(controller.setStyle).toHaveBeenCalledWith({ opacity: 0 })
  })

  test('set springStyle after leaveTo style on leave cancelled', async () => {
    const root = document.createElement('div')

    const app = createApp({
      template: `
        <spring-transition-group :enter-from="{ opacity: 0 }" :spring-style="{ opacity: 1 }" :leave-to="{ opacity: 0 }">
          <div v-for="item of list" key="item" v-show="isShow" ref="els">{{ item }}</div>
        </spring-transition-group>
      `,
      components: {
        SpringTransitionGroup,
      },
      data() {
        return {
          list: ['a'],
          isShow: true,
        }
      },
    })

    const vm: any = app.mount(root)
    vm.isShow = false
    await nextTick()

    const controller = vm.$refs.els[0][scKey]
    expect(controller.setStyle).toHaveBeenCalledWith({ opacity: 1 }, false)
    expect(controller.setStyle).toHaveBeenCalledWith({ opacity: 0 })
    controller.setStyle.mockClear()

    vm.isShow = true
    await nextTick()

    expect(controller.setStyle).toHaveBeenCalledTimes(1)
    expect(controller.setStyle).toHaveBeenCalledWith({ opacity: 1 })
  })

  test('set enterFrom style after leave animation ended', async () => {
    const root = document.createElement('div')

    const app = createApp({
      template: `
        <spring-transition-group :enter-from="{ opacity: 0.5 }" :spring-style="{ opacity: 1 }" :leave-to="{ opacity: 0 }" :duration="10">
          <div v-for="item of list" key="item" v-show="isShow" ref="els">{{ item }}</div>
        </spring-transition-group>
      `,
      components: {
        SpringTransitionGroup,
      },
      data() {
        return {
          list: ['a'],
          isShow: true,
        }
      },
    })

    const vm: any = app.mount(root)
    vm.isShow = false
    await nextTick()

    const controller = vm.$refs.els[0][scKey]
    expect(controller.setStyle).toHaveBeenCalledWith({ opacity: 1 }, false)
    expect(controller.setStyle).toHaveBeenCalledWith({ opacity: 0 })
    controller.setStyle.mockClear()

    await wait(20)

    expect(controller.setStyle).toHaveBeenCalledTimes(1)
    expect(controller.setStyle).toHaveBeenCalledWith({ opacity: 0.5 }, false)
  })

  test('trigger before-enter event before setting style', () => {
    return new Promise<void>((resolve, reject) => {
      const root = document.createElement('div')

      const app = createApp({
        template: `
        <spring-transition-group :enter-from="{ opacity: 0 }" :spring-style="{ opacity: 1 }" @before-enter="beforeEnter">
          <div v-for="item of list" key="item" ref="els">{{ item }}</div>
        </spring-transition-group>
      `,
        components: {
          SpringTransitionGroup,
        },
        data() {
          return {
            list: [],
          }
        },
        methods: {
          beforeEnter() {
            try {
              const els = this.$refs.els ?? []
              expect(els.length).toBe(0)
              resolve()
            } catch (e) {
              reject(e)
            }
          },
        },
      })

      const vm: any = app.mount(root)
      vm.list = ['a']
    })
  })

  test('trigger after-enter event after animation', () => {
    return new Promise<void>((resolve, reject) => {
      const root = document.createElement('div')

      const app = createApp({
        template: `
        <spring-transition-group :enter-from="{ opacity: 0 }" :spring-style="{ opacity: 1 }" @after-enter="afterEnter" :duration="10">
          <div v-for="item of list" key="item" ref="els">{{ item }}</div>
        </spring-transition-group>
      `,
        components: {
          SpringTransitionGroup,
        },
        data() {
          return {
            list: [],
          }
        },
        methods: {
          afterEnter() {
            try {
              const controller = this.$refs.els[0][scKey]
              expect(controller.setStyle).toHaveBeenCalledWith(
                { opacity: 0 },
                false,
              )
              expect(controller.setStyle).toHaveBeenCalledWith({ opacity: 1 })
              resolve()
            } catch (e) {
              reject(e)
            }
          },
        },
      })

      const vm: any = app.mount(root)
      vm.list = ['a']
    })
  })

  test('trigger enter-cancelled event on cancelling animation', () => {
    return new Promise<void>(async (resolve) => {
      const root = document.createElement('div')

      const app = createApp({
        template: `
        <spring-transition-group :enter-from="{ opacity: 0 }" :spring-style="{ opacity: 1 }" @enter-cancelled="enterCancelled">
          <div v-for="item of list" key="item" ref="els">{{ item }}</div>
        </spring-transition-group>
      `,
        components: {
          SpringTransitionGroup,
        },
        data() {
          return {
            list: [],
          }
        },
        methods: {
          enterCancelled() {
            resolve()
          },
        },
      })

      const vm: any = app.mount(root)
      vm.list = ['a']
      await nextTick()
      vm.list = []
    })
  })

  test('trigger before-leave event before setting style', () => {
    return new Promise<void>((resolve, reject) => {
      const root = document.createElement('div')
      let el: any

      const app = createApp({
        template: `
        <spring-transition-group :leave-to="{ opacity: 0 }" :spring-style="{ opacity: 1 }" @before-leave="beforeLeave">
          <div v-for="item of list" key="item" ref="els">{{ item }}</div>
        </spring-transition-group>
      `,
        components: {
          SpringTransitionGroup,
        },
        data() {
          return {
            list: ['a'],
          }
        },
        methods: {
          beforeLeave() {
            try {
              expect(el[scKey]).toBe(undefined)
              resolve()
            } catch (e) {
              reject(e)
            }
          },
        },
      })

      const vm: any = app.mount(root)
      el = vm.$refs.els[0]
      vm.list = []
    })
  })

  test('trigger after-leave event after animation', () => {
    return new Promise<void>((resolve, reject) => {
      const root = document.createElement('div')
      let el: any

      const app = createApp({
        template: `
        <spring-transition-group :leave-to="{ opacity: 0 }" :spring-style="{ opacity: 1 }" @after-leave="afterLeave" :duration="10">
          <div v-for="item of list" key="item" ref="els">{{ item }}</div>
        </spring-transition-group>
      `,
        components: {
          SpringTransitionGroup,
        },
        data() {
          return {
            list: ['a'],
          }
        },
        methods: {
          afterLeave() {
            try {
              const controller = el[scKey]
              expect(controller.setStyle).toHaveBeenCalledWith(
                { opacity: 1 },
                false,
              )
              expect(controller.setStyle).toHaveBeenCalledWith({ opacity: 0 })
              resolve()
            } catch (e) {
              reject(e)
            }
          },
        },
      })

      const vm: any = app.mount(root)
      el = vm.$refs.els[0]
      vm.list = []
    })
  })

  test('trigger leave-cancelled event on cancelling animation', () => {
    return new Promise<void>(async (resolve) => {
      const root = document.createElement('div')

      const app = createApp({
        template: `
        <spring-transition-group :leave-to="{ opacity: 0 }" :spring-style="{ opacity: 1 }" @leave-cancelled="leaveCancelled">
          <div v-for="item of list" key="item" v-show="isShow" ref="els">{{ item }}</div>
        </spring-transition-group>
      `,
        components: {
          SpringTransitionGroup,
        },
        data() {
          return {
            list: ['a'],
            isShow: true,
          }
        },
        methods: {
          leaveCancelled() {
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
