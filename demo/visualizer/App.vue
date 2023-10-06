<script setup lang="ts">
import { ref, shallowRef, watchEffect } from 'vue'
import { calcSpringValue } from '../../src/main'
import { useSpringStyle } from '../../src/vue/main'

const from = 0
const to = 300

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

function render(): void {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx) {
    return
  }

  const w = 400
  const h = 200

  ctx.clearRect(0, 0, w, h)

  ctx.beginPath()
  ctx.moveTo(0, h)

  for (let i = 0; i < w * 2; i++) {
    const t = i / w
    const value = calcSpringValue({
      time: t,
      from,
      to,
      initialVelocity: parameters.value.velocity,
      ...parameters.value,
    })

    const y = (2 - value / (to - from)) * (h / 2)
    ctx.lineTo(i / 2, y)
  }

  ctx.stroke()
}

let intervalTimer: number | undefined
let rafTimer: number | undefined
watchEffect(() => {
  window.clearInterval(intervalTimer)
  if (rafTimer !== undefined) {
    window.cancelAnimationFrame(rafTimer)
  }

  intervalTimer = window.setInterval(() => {
    x.value = from
    requestAnimationFrame(() => {
      x.value = to
    })
  }, parameters.value.duration + 1000)
})

requestAnimationFrame(function loop() {
  render()
  requestAnimationFrame(loop)
})
</script>

<template>
  <div class="preview">
    <div class="preview-behavior">
      <div class="preview-ball" :style="style"></div>
    </div>

    <div class="preview-graph">
      <canvas
        ref="canvas"
        class="preview-graph-canvas"
        width="400"
        height="200"
      ></canvas>
    </div>
  </div>

  <div class="parameters">
    <div class="parameter">
      <label>Velocity</label>
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
        type="number"
        min="100"
        max="5000"
        step="100"
        v-model.number="parameters.duration"
      />
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
  background-color: #e0e0e0;
}
</style>

<style scoped>
.preview {
  display: flex;
  gap: 20px;
}

.preview-behavior {
  display: flex;
  align-items: center;
  overflow: hidden;
  padding: 25px;
  max-width: 100%;
  width: 400px;
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
  width: 400px;
  background-color: #fff;
}
</style>
