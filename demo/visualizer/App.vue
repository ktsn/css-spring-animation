<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useSpringStyle } from '../../src/vue/main'

const parameters = ref({
  velocity: 0,
  bounce: 0,
  duration: 1000,
})

const x = ref(0)

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
      disabled: x.value === 0,
    }
  },
)

let timer: number | undefined
watchEffect(() => {
  window.clearInterval(timer)

  timer = window.setInterval(() => {
    x.value = 0
    requestAnimationFrame(() => {
      x.value = 300
    })
  }, parameters.value.duration + 1000)
})
</script>

<template>
  <div class="preview">
    <div class="preview-ball" :style="style"></div>
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
  overflow: hidden;
  padding: 50px;
  max-width: 100%;
  width: 450px;
  background-color: #fff;
}

.preview-ball {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: #259902;
}
</style>
