<script setup lang="ts">
import { ref, shallowRef, watchEffect } from 'vue'
import { calcSpringValue } from '../../src/main'
import { useSpringStyle } from '../../src/vue/main'

const from = 0
const to = 350

const canvasWidth = 500
const canvasHeight = 300

const parameters = ref({
  velocity: 0,
  bounce: 0,
  duration: 1000,
})

const x = ref(from)
const canvas = shallowRef<HTMLCanvasElement>()

const style = useSpringStyle(
  x,
  (value) => {
    return {
      translate: value,
    }
  },
  () => {
    return {
      ...parameters.value,
      disabled: x.value === from,
    }
  },
)

function render(time: number): void {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx) {
    return
  }

  const w = canvasWidth
  const h = canvasHeight
  const p = 50

  ctx.clearRect(0, 0, w, h)

  ctx.lineWidth = 1
  ctx.setLineDash([2, 4])
  ctx.strokeStyle = '#aaa'

  ctx.beginPath()
  ctx.moveTo(0, p)
  ctx.lineTo(w, p)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(0, h - p)
  ctx.lineTo(w, h - p)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(0, h / 2)
  ctx.lineTo(w, h / 2)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(w / 2, 0)
  ctx.lineTo(w / 2, h)
  ctx.stroke()

  ctx.lineWidth = 2
  ctx.setLineDash([])
  ctx.strokeStyle = '#000'

  ctx.beginPath()
  ctx.moveTo(0, h - p)

  for (let i = 0; i < w * 2; i++) {
    const t = i / w
    const value = calcSpringValue({
      time: t,
      from,
      to,
      initialVelocity: parameters.value.velocity,
      ...parameters.value,
    })

    const y = (2 - value / (to - from)) * (h / 2 - p) + p
    ctx.lineTo(i / 2, y)
  }
  ctx.stroke()

  ctx.lineWidth = 1
  ctx.strokeStyle = '#00f'

  ctx.beginPath()
  ctx.moveTo((time * w) / 2, 0)
  ctx.lineTo((time * w) / 2, h)
  ctx.stroke()
}

let intervalTimer: number | undefined
let rafTimer: number | undefined
watchEffect(() => {
  window.clearInterval(intervalTimer)

  function start(): void {
    if (rafTimer !== undefined) {
      window.cancelAnimationFrame(rafTimer)
    }

    x.value = from
    requestAnimationFrame(() => {
      x.value = to
    })

    let start: number | undefined

    function loop(now: number): void {
      if (start === undefined) {
        start = now
      }
      render((now - start) / parameters.value.duration)
      rafTimer = requestAnimationFrame(loop)
    }

    rafTimer = requestAnimationFrame(loop)
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
