<script setup lang="ts">
import { CSSProperties, ref, shallowRef, watchEffect } from 'vue'
import {
  AnimateContext,
  animate,
  createSpring,
  springValue,
  springBounceValue,
  springDecayValue,
} from '../../src/core'
import { Spring } from '../../src/core/spring'

const from = 0
const to = 350

const canvasWidth = 500
const canvasHeight = 300

const parameters = ref({
  velocity: 0,
  bounce: 0,
  duration: 1000,
})

const canvas = shallowRef<HTMLCanvasElement>()

const style = ref<CSSProperties>({})

function renderLines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  padding: number,
): void {
  ctx.lineWidth = 1
  ctx.setLineDash([2, 4])
  ctx.strokeStyle = '#aaa'

  ctx.beginPath()
  ctx.moveTo(0, padding)
  ctx.lineTo(width, padding)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(0, height - padding)
  ctx.lineTo(width, height - padding)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(0, height / 2)
  ctx.lineTo(width, height / 2)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(width / 2, 0)
  ctx.lineTo(width / 2, height)
  ctx.stroke()
}

function renderBounceGraph(
  ctx: CanvasRenderingContext2D,
  spring: Spring,
  width: number,
  height: number,
  padding: number,
): void {
  ctx.lineWidth = 2
  ctx.setLineDash([])
  ctx.strokeStyle = '#0000cc66'

  ctx.beginPath()
  ctx.moveTo(0, height - padding)

  for (let i = 0; i < width * 2; i++) {
    const t = i / width
    const value = springBounceValue(spring, {
      time: t,
      from,
      to,
      initialVelocity: parameters.value.velocity,
    })

    const y = (1 + value) * (height / 2 - padding) + padding
    ctx.lineTo(i / 2, y)
  }

  ctx.stroke()
}

function renderDecayGraph(
  ctx: CanvasRenderingContext2D,
  spring: Spring,
  width: number,
  height: number,
  padding: number,
): void {
  ctx.lineWidth = 2
  ctx.setLineDash([])
  ctx.strokeStyle = '#00aa0066'

  ctx.beginPath()
  ctx.moveTo(0, height - padding)

  for (let i = 0; i < width * 2; i++) {
    const t = i / width
    const value = springDecayValue(spring, {
      time: t,
      from,
      to,
      initialVelocity: parameters.value.velocity,
    })

    const y = (1 + value) * (height / 2 - padding) + padding
    ctx.lineTo(i / 2, y)
  }

  ctx.stroke()
}

function renderSpringGraph(
  ctx: CanvasRenderingContext2D,
  spring: Spring,
  width: number,
  height: number,
  padding: number,
): void {
  ctx.lineWidth = 2
  ctx.setLineDash([])
  ctx.strokeStyle = '#000'

  ctx.beginPath()
  ctx.moveTo(0, height - padding)

  for (let i = 0; i < width * 2; i++) {
    const t = i / width
    const value = springValue(spring, {
      time: t,
      from,
      to,
      initialVelocity: parameters.value.velocity,
    })

    const y = (2 - value / (to - from)) * (height / 2 - padding) + padding
    ctx.lineTo(i / 2, y)
  }

  ctx.stroke()
}

function renderCurrentTime(
  ctx: CanvasRenderingContext2D,
  spring: Spring,
  width: number,
  height: number,
  padding: number,
  time: number,
): void {
  ctx.lineWidth = 1
  ctx.strokeStyle = '#00f'

  ctx.beginPath()
  ctx.moveTo((time * width) / 2, 0)
  ctx.lineTo((time * width) / 2, height)
  ctx.stroke()

  ctx.fillStyle = '#f00'

  const x = Math.floor(time * width) / 2
  const value = springValue(spring, {
    time,
    from,
    to,
    initialVelocity: parameters.value.velocity,
  })
  const y = (2 - value / (to - from)) * (height / 2 - padding) + padding

  ctx.beginPath()
  ctx.ellipse(x, y, 4, 4, 0, 0, Math.PI * 2)
  ctx.fill()
}

function render(time: number): void {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx) {
    return
  }

  const w = canvasWidth
  const h = canvasHeight
  const p = 50

  const spring = createSpring({
    ...parameters.value,
  })

  ctx.clearRect(0, 0, w, h)
  renderLines(ctx, w, h, p)

  renderDecayGraph(ctx, spring, w, h, p)
  renderBounceGraph(ctx, spring, w, h, p)
  renderSpringGraph(ctx, spring, w, h, p)

  renderCurrentTime(ctx, spring, w, h, p, time)
}

let intervalTimer: number | undefined
let loopTimer: number | undefined
let animateTimer: number | undefined
let ctx: AnimateContext<any> | undefined
watchEffect(() => {
  window.clearInterval(intervalTimer)
  const { velocity, bounce, duration } = parameters.value

  function start(): void {
    if (animateTimer !== undefined) {
      window.cancelAnimationFrame(animateTimer)
    }
    if (loopTimer !== undefined) {
      window.cancelAnimationFrame(loopTimer)
    }

    ctx?.stop()
    animateTimer = requestAnimationFrame(() => {
      ctx = animate(
        {
          translate: [`${from}px`, `${to}px`],
        },
        (_style) => {
          style.value = _style
        },
        {
          velocity: {
            translate: [velocity],
          },
          bounce,
          duration,
        },
      )
    })

    let start: number | undefined

    function loop(now: number): void {
      if (start === undefined) {
        start = now
      }
      render((now - start) / parameters.value.duration)
      loopTimer = requestAnimationFrame(loop)
    }

    loopTimer = requestAnimationFrame(loop)
  }

  start()

  intervalTimer = window.setInterval(start, parameters.value.duration * 2)
})
</script>

<template>
  <div class="wrapper">
    <div class="preview">
      <div class="preview-behavior">
        <div class="preview-ball" :style="style"></div>
      </div>

      <div class="preview-graph">
        <canvas
          ref="canvas"
          class="preview-graph-canvas"
          :width="canvasWidth"
          :height="canvasHeight"
        ></canvas>
      </div>
    </div>

    <div class="parameters">
      <div class="parameter">
        <label>Velocity</label>
        <input
          type="range"
          min="-10000"
          max="10000"
          step="10"
          v-model.number="parameters.velocity"
        />
        <input
          type="number"
          min="-10000"
          max="10000"
          step="100"
          v-model.number="parameters.velocity"
        />
      </div>

      <div class="parameter">
        <label>Bounce</label>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.01"
          v-model.number="parameters.bounce"
        />
        <input
          type="number"
          min="-1"
          max="1"
          step="0.1"
          v-model.number="parameters.bounce"
        />
      </div>

      <div class="parameter">
        <label>Duration</label>
        <input
          type="range"
          min="100"
          max="5000"
          step="10"
          v-model.number="parameters.duration"
        />
        <input
          type="number"
          min="100"
          max="5000"
          step="100"
          v-model.number="parameters.duration"
        />
      </div>
    </div>
  </div>
</template>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  background-color: #e0e0e0;
}
</style>

<style scoped>
.wrapper {
  margin: auto;
  padding: 20px;
  width: 1060px;
}

.preview {
  display: flex;
  gap: 20px;
}

.preview-behavior {
  display: flex;
  align-items: center;
  overflow: hidden;
  flex: 1 1 0;
  padding: 25px 50px;
  background-color: #fff;
}

.preview-ball {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: #259902;
}

.preview-graph {
  display: flex;
  flex: 1 1 0;
  width: 500px;
  background-color: #fff;
}
</style>
