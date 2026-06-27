import { describe, expect, test, vitest } from 'vite-plus/test'
import { createApp, nextTick } from 'vue'

import { AnimationController } from '../../src/core'
import { scKey } from '../../src/vue/SpringTransition'
import SpringTransitionGroup from '../../src/vue/SpringTransitionGroup'

vitest.mock('../../src/core/controller', async () => {
  const module = await vitest.importActual<any>('../../src/core/controller')

  return {
    ...module,
    createAnimateController: (...args: any[]) => {
      const controller = module.createAnimateController(...args)
      vitest.spyOn(controller, 'setStyle')
      vitest.spyOn(controller, 'setOptions')
      vitest.spyOn(controller, 'stop')
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
    expect(controller.setStyle).toHaveBeenCalledWith({ opacity: 0 }, { animate: false })
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

  test('use enterFrom style for leave when leaveTo is not specified', async () => {
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

    expect(el[scKey].setStyle).toHaveBeenCalledWith({ opacity: 1 }, { animate: false })
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
    expect(controller.setStyle).toHaveBeenCalledWith({ opacity: 0 }, { animate: false })
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
    expect(controller.setStyle).toHaveBeenCalledWith({ opacity: 1 }, { animate: false })
    expect(controller.setStyle).toHaveBeenCalledWith({ opacity: 0 })
    controller.setStyle.mockClear()

    vm.isShow = true
    await nextTick()

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
    expect(controller.setStyle).toHaveBeenCalledWith({ opacity: 1 }, { animate: false })
    expect(controller.setStyle).toHaveBeenCalledWith({ opacity: 0 })
    controller.setStyle.mockClear()

    await wait(20)

    expect(controller.setStyle).toHaveBeenCalledTimes(1)
    expect(controller.setStyle).toHaveBeenCalledWith({ opacity: 0.5 }, { animate: false })
  })

  test('force finish enter animation when move processing is triggered', async () => {
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

    const el = vm.$refs.els[0]

    vm.list = ['a', 'b']
    await nextTick()

    expect(el.style.opacity).toBe('1')
  })

  test('does not stop leave animation by move processing', async () => {
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

    expect(el[scKey].stop).not.toHaveBeenCalled()
  })

  test('trigger before-enter event before setting style', async () => {
    const root = document.createElement('div')
    let resolveBefore!: (els: any[]) => void
    const beforeEntered = new Promise<any[]>((resolve) => {
      resolveBefore = resolve
    })

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
          resolveBefore(this.$refs.els ?? [])
        },
      },
    })

    const vm: any = app.mount(root)
    vm.list = ['a']
    const els = await beforeEntered
    expect(els.length).toBe(0)
  })

  test('trigger after-enter event after animation', async () => {
    const root = document.createElement('div')
    let resolveAfter!: (controller: any) => void
    const afterEntered = new Promise<any>((resolve) => {
      resolveAfter = resolve
    })

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
          resolveAfter(this.$refs.els[0][scKey])
        },
      },
    })

    const vm: any = app.mount(root)
    vm.list = ['a']
    const controller = await afterEntered
    expect(controller.setStyle).toHaveBeenCalledWith({ opacity: 0 }, { animate: false })
    expect(controller.setStyle).toHaveBeenCalledWith({ opacity: 1 })
  })

  test('trigger enter-cancelled event on cancelling animation', async () => {
    const root = document.createElement('div')
    let resolveCancelled!: () => void
    const cancelled = new Promise<void>((resolve) => {
      resolveCancelled = resolve
    })

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
          resolveCancelled()
        },
      },
    })

    const vm: any = app.mount(root)
    vm.list = ['a']
    await nextTick()
    vm.list = []
    await cancelled
    expect(vm.list).toEqual([])
  })

  test('trigger before-leave event before setting style', async () => {
    const root = document.createElement('div')
    let el: any
    let resolveBefore!: (controller: any) => void
    const beforeLeft = new Promise<any>((resolve) => {
      resolveBefore = resolve
    })

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
          resolveBefore(el[scKey])
        },
      },
    })

    const vm: any = app.mount(root)
    el = vm.$refs.els[0]
    vm.list = []
    const controllerAtEvent = await beforeLeft
    expect(controllerAtEvent).toBe(undefined)
  })

  test('trigger after-leave event after animation', async () => {
    const root = document.createElement('div')
    let resolveAfter!: () => void
    const afterLeft = new Promise<void>((resolve) => {
      resolveAfter = resolve
    })

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
          resolveAfter()
        },
      },
    })

    const vm: any = app.mount(root)
    const el = vm.$refs.els[0]
    vm.list = []
    await afterLeft
    const controller = el[scKey]
    expect(controller.setStyle).toHaveBeenCalledWith({ opacity: 1 }, { animate: false })
    expect(controller.setStyle).toHaveBeenCalledWith({ opacity: 0 })
  })

  test('trigger leave-cancelled event on cancelling animation', async () => {
    const root = document.createElement('div')
    let resolveCancelled!: () => void
    const cancelled = new Promise<void>((resolve) => {
      resolveCancelled = resolve
    })

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
          resolveCancelled()
        },
      },
    })

    const vm: any = app.mount(root)
    vm.isShow = false
    await nextTick()
    vm.isShow = true
    await cancelled
    expect(vm.isShow).toBe(true)
  })
})
