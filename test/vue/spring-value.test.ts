import { describe, expect, test, vitest } from 'vitest'
import { createApp, nextTick, ref, watchEffect } from 'vue'
import { spring } from '../../src/vue/spring-element'
import { springComputed, springValue } from '../../src/vue/spring-value'
import { sv } from '../../src/core/spring-value'
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

describe('springValue', () => {
  test('initial target', () => {
    const x = springValue(10)
    expect(x.target).toBe(10)
  })

  test('target is reactive', async () => {
    const x = springValue(0)
    const seen: number[] = []
    watchEffect(() => seen.push(x.target))

    x.target = 5
    await nextTick()
    expect(seen).toEqual([0, 5])
  })

  test('current() returns target when unbound', () => {
    const x = springValue(7)
    expect(x.current()).toBe(7)
    x.target = 42
    expect(x.current()).toBe(42)
  })

  test('velocity() returns 0 when unbound', () => {
    const x = springValue(7)
    expect(x.velocity()).toBe(0)
    x.target = 42
    expect(x.velocity()).toBe(0)
  })

  test('setVelocity sets velocity when unbound', () => {
    const x = springValue(0)
    x.setVelocity(5)
    expect(x.velocity()).toBe(5)
  })

  test('setting target preserves manually set velocity when unbound', () => {
    const x = springValue(0)
    x.setVelocity(5)
    x.target = 50
    expect(x.velocity()).toBe(5)
    expect(x.current()).toBe(50)
  })
})

describe('sv tagged template', () => {
  test('single SpringValue with unit', () => {
    const x = springValue(10)
    const result = sv`${x}px`

    expect(result.wraps).toEqual(['', ''])
    expect(result.units).toEqual(['px'])
    expect(result.values).toEqual([x])
  })

  test('multiple SpringValues', () => {
    const x = springValue(1)
    const y = springValue(2)
    const result = sv`translate(${x}px, ${y}px)`

    expect(result.wraps).toEqual(['translate(', ', ', ')'])
    expect(result.units).toEqual(['px', 'px'])
    expect(result.values).toEqual([x, y])
  })

  test('static + dynamic mix', () => {
    const x = springValue(10)
    const result = sv`${x}px ${20}px`

    expect(result.wraps).toEqual(['', ' ', ''])
    expect(result.units).toEqual(['px', 'px'])
    expect(result.values[0]).toBe(x)
    expect(result.values[1]?.target).toBe(20)
  })

  test('string interpolation appends to wrap', () => {
    const x = springValue(10)
    const result = sv`${'translate('}${x}px${')'}`

    expect(result.wraps).toEqual(['translate(', ')'])
    expect(result.units).toEqual(['px'])
    expect(result.values).toEqual([x])
  })

  test('no unit after slot', () => {
    const x = springValue(10)
    const result = sv`scale(${x})`

    expect(result.wraps).toEqual(['scale(', ')'])
    expect(result.units).toEqual([''])
    expect(result.values).toEqual([x])
  })

  test('static number in template text becomes a slot', () => {
    const x = springValue(10)
    const result = sv`0px ${x}px`

    // The literal "0" is extracted so slot indices align with the
    // controller's parsed value array (otherwise x's binding would
    // read the static 0 instead of x's animating value).
    expect(result.wraps).toEqual(['', ' ', ''])
    expect(result.units).toEqual(['px', 'px'])
    expect(result.values[0]?.target).toBe(0)
    expect(result.values[1]).toBe(x)
  })
})

describe('springValue bound to <spring.div>', () => {
  test('animates when target changes', async () => {
    const root = document.createElement('div')
    const x = springValue(0)
    const app = createApp({
      template: `
        <springp :spring-style="{ translate: svExpr }" :duration="100">
          Hello
        </springp>
      `,
      components: { springp: spring.p! },
      setup() {
        return { svExpr: sv`${x}px` }
      },
    })
    const vm: any = app.mount(root)
    expect(vm.$el.style.translate).toBe('0px')

    x.target = 100
    await nextTick()

    // setStyle is called with the raw ParsedStyleValue carrying the
    // SpringComputed slot — `animate()` snapshots and attaches it.
    const calls = mockController.setStyle.mock.calls
    const [styleArg, optsArg] = calls[calls.length - 1]
    expect(styleArg.translate.values[0].target).toBe(100)
    expect(optsArg).toEqual({ animate: true })
  })

  test('current() reads from controller when bound', async () => {
    const root = document.createElement('div')
    const x = springValue(0)
    const app = createApp({
      template: `
        <springp :spring-style="{ translate: svExpr }" :duration="100">
          Hello
        </springp>
      `,
      components: { springp: spring.p! },
      setup() {
        return { svExpr: sv`${x}px` }
      },
    })
    app.mount(root)
    expect(x.current()).toBe(0)

    x.target = 100
    await nextTick()
    // Mid-animation: real value diverges from both 0 and 100
    expect(x.current()).not.toBe(0)
    expect(x.current()).not.toBe(100)
  })

  test('velocity() reads from controller when bound', async () => {
    const root = document.createElement('div')
    const x = springValue(0)
    const app = createApp({
      template: `
        <springp :spring-style="{ translate: svExpr }" :duration="100">
          Hello
        </springp>
      `,
      components: { springp: spring.p! },
      setup() {
        return { svExpr: sv`${x}px` }
      },
    })
    app.mount(root)
    expect(x.velocity()).toBe(0)

    x.target = 100
    await nextTick()
    expect(x.velocity()).not.toBe(0)
  })

  test('velocity() reflects drag motion while disabled (swipe regression)', async () => {
    const root = document.createElement('div')
    const x = springValue(0)
    const app = createApp({
      template: `
        <springp :spring-style="{ translate: svExpr }" disabled>
          Hello
        </springp>
      `,
      components: { springp: spring.p! },
      setup() {
        return { svExpr: sv`${x}px` }
      },
    })
    app.mount(root)
    await nextTick()

    // Simulate drag-style updates — each target change triggers a
    // setStyle(animate: false) that pushes into the controller's
    // valueHistory.
    x.target = 10
    await nextTick()
    x.target = 30
    await nextTick()
    x.target = 60
    await nextTick()

    // Synchronous read like the swipe demo's pointerup handler. Without
    // the controller-scoped attachment, _attachment is unset/stale here
    // and velocity() collapses to 0.
    expect(x.velocity()).not.toBe(0)
  })

  test('disabled: target change applies immediately', async () => {
    const root = document.createElement('div')
    const x = springValue(0)
    const app = createApp({
      template: `
        <springp :spring-style="{ translate: svExpr }" disabled>
          Hello
        </springp>
      `,
      components: { springp: spring.p! },
      setup() {
        return { svExpr: sv`${x}px` }
      },
    })
    const vm: any = app.mount(root)
    expect(vm.$el.style.translate).toBe('0px')

    x.target = 100
    await nextTick()
    expect(vm.$el.style.translate).toBe('100px')
    expect(x.current()).toBe(100)
  })

  test('two SpringValues in one sv expression', async () => {
    const root = document.createElement('div')
    const x = springValue(0)
    const y = springValue(0)
    const app = createApp({
      template: `
        <springp :spring-style="{ translate: svExpr }" disabled>
          Hello
        </springp>
      `,
      components: { springp: spring.p! },
      setup() {
        return { svExpr: sv`${x}px ${y}px` }
      },
    })
    const vm: any = app.mount(root)
    expect(vm.$el.style.translate).toBe('0px 0px')

    x.target = 10
    y.target = 20
    await nextTick()
    expect(vm.$el.style.translate).toBe('10px 20px')
    expect(x.current()).toBe(10)
    expect(y.current()).toBe(20)
  })

  test('unmount: current() returns the stopped snapshot, not target', async () => {
    const root = document.createElement('div')
    const x = springValue(0)
    const app = createApp({
      template: `
        <springp :spring-style="{ translate: svExpr }" :duration="10">
          Hello
        </springp>
      `,
      components: { springp: spring.p! },
      setup() {
        return { svExpr: sv`${x}px` }
      },
    })
    app.mount(root)

    // Trigger a real animation. While bound,
    // current() reads from the controller's live value.
    x.target = 100
    await nextTick()
    expect(x.current()).not.toBe(0)

    app.unmount()

    // After unmount the controller is stopped, but the springValue
    // remains attached. current() reads from the (now-frozen) ctx and
    // returns the snapshot at stop time, NOT the writable target ref.
    const frozen = x.current()

    x.target = 50
    expect(x.current()).toBe(frozen)
    expect(x.target).toBe(50)
    expect(x.velocity()).toBe(0)
  })

  test('current() reads live value when template starts with static number', async () => {
    const root = document.createElement('div')
    const x = springValue(0)
    const app = createApp({
      template: `
        <springp :spring-style="{ translate: svExpr }" :duration="100">
          Hello
        </springp>
      `,
      components: { springp: spring.p! },
      setup() {
        return { svExpr: sv`0px ${x}px` }
      },
    })
    app.mount(root)
    expect(x.current()).toBe(0)

    x.target = 100
    await nextTick()
    // Mid-animation x.current() must reflect x's live value, not the
    // static "0" sitting earlier in the parsed value array.
    expect(x.current()).not.toBe(0)
    expect(x.current()).not.toBe(100)
  })

  test('setVelocity snapshots and detaches when bound', async () => {
    const root = document.createElement('div')
    const x = springValue(0)
    const app = createApp({
      template: `
        <springp :spring-style="{ translate: svExpr }" :duration="100">
          Hello
        </springp>
      `,
      components: { springp: spring.p! },
      setup() {
        return { svExpr: sv`${x}px` }
      },
    })
    app.mount(root)

    x.target = 100
    await nextTick()

    // Mid-animation: while attached, current() reflects ctx.
    const liveCurrent = x.current()
    expect(liveCurrent).not.toBe(0)
    expect(liveCurrent).not.toBe(100)

    x.setVelocity(99)

    // After setVelocity, the SpringValue is detached. current() returns
    // the snapshot taken at detach time; velocity() returns the just-set
    // value.
    expect(x.current()).toBeCloseTo(liveCurrent, 1)
    expect(x.velocity()).toBe(99)
  })

  test('static numeric slot is preserved through resolution', async () => {
    const root = document.createElement('div')
    const x = springValue(0)
    const app = createApp({
      template: `
        <springp :spring-style="{ translate: svExpr }" disabled>
          Hello
        </springp>
      `,
      components: { springp: spring.p! },
      setup() {
        return { svExpr: sv`${x}px ${20}px` }
      },
    })
    const vm: any = app.mount(root)
    expect(vm.$el.style.translate).toBe('0px 20px')

    x.target = 5
    await nextTick()
    expect(vm.$el.style.translate).toBe('5px 20px')
  })
})

describe('springComputed', () => {
  test('target is derived from the getter', () => {
    const source = ref(7)
    const x = springComputed(() => source.value * 2)
    expect(x.target).toBe(14)
    source.value = 10
    expect(x.target).toBe(20)
  })

  test('target is reactive', async () => {
    const source = ref(0)
    const x = springComputed(() => source.value + 1)
    const seen: number[] = []
    watchEffect(() => seen.push(x.target))

    source.value = 4
    await nextTick()
    expect(seen).toEqual([1, 5])
  })

  test('current() returns target when unbound', () => {
    const source = ref(3)
    const x = springComputed(() => source.value)
    expect(x.current()).toBe(3)
    source.value = 9
    expect(x.current()).toBe(9)
  })

  test('animates when computed result changes', async () => {
    const root = document.createElement('div')
    const source = ref(0)
    const x = springComputed(() => source.value)
    const app = createApp({
      template: `
        <springp :spring-style="{ translate: svExpr }" :duration="100">
          Hello
        </springp>
      `,
      components: { springp: spring.p! },
      setup() {
        return { svExpr: sv`${x}px` }
      },
    })
    app.mount(root)

    source.value = 100
    await nextTick()
    const calls = mockController.setStyle.mock.calls
    const [styleArg, optsArg] = calls[calls.length - 1]
    expect(styleArg.translate.values[0].target).toBe(100)
    expect(optsArg).toEqual({ animate: true })
  })

  test('current() reads from controller when bound', async () => {
    const root = document.createElement('div')
    const source = ref(0)
    const x = springComputed(() => source.value)
    const app = createApp({
      template: `
        <springp :spring-style="{ translate: svExpr }" :duration="100">
          Hello
        </springp>
      `,
      components: { springp: spring.p! },
      setup() {
        return { svExpr: sv`${x}px` }
      },
    })
    app.mount(root)

    source.value = 100
    await nextTick()
    expect(x.current()).not.toBe(0)
    expect(x.current()).not.toBe(100)
  })
})
