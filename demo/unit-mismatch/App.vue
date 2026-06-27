<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

import { spring } from '../../src/vue'

const flipped = ref(false)

let timer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  timer = setInterval(() => {
    flipped.value = !flipped.value
  }, 2000)
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>

<template>
  <h1>Unit Mismatch Demo</h1>
  <button type="button" class="toggle" @click="flipped = !flipped">Toggle</button>

  <section>
    <h2>width: 10rem ↔ 300px</h2>
    <div class="track">
      <spring.div
        class="box"
        :spring-style="{ width: flipped ? '300px' : '10rem' }"
        :duration="800"
        :bounce="0.3"
      />
    </div>
  </section>

  <section>
    <h2>width: 50% ↔ 300px</h2>
    <div class="track">
      <spring.div
        class="box"
        :spring-style="{ width: flipped ? '300px' : '50%' }"
        :duration="800"
        :bounce="0.3"
      />
    </div>
  </section>

  <section>
    <h2>padding: 10px 1rem ↔ 40px 64px</h2>
    <div class="track">
      <spring.div
        class="box-padded"
        :spring-style="{ padding: flipped ? '40px 64px' : '10px 1rem' }"
        :duration="800"
        :bounce="0.3"
        >●</spring.div
      >
    </div>
  </section>

  <section>
    <h2>font-size: 1em ↔ 48px</h2>
    <div class="track">
      <spring.div
        class="box-text"
        :spring-style="{ fontSize: flipped ? '48px' : '1em' }"
        :duration="800"
        :bounce="0.3"
        >Aa</spring.div
      >
    </div>
  </section>
</template>

<style scoped>
h1 {
  margin: 0 0 0.5rem;
}

h2 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  color: #333;
}

code {
  background: #f1f1f1;
  padding: 0 0.25em;
  border-radius: 3px;
}

.toggle {
  margin-bottom: 1.5rem;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  cursor: pointer;
}

section {
  margin-bottom: 1.5rem;
}

.track {
  border: 1px dashed #bbb;
  padding: 0.5rem;
  background: #fafafa;
  /* Anchor for `%` resolution: width: 50% resolves against this 400px width. */
  width: 400px;
}

.box {
  height: 30px;
  background: #259902;
  border-radius: 4px;
}

.box-padded {
  display: inline-block;
  background: #2566e3;
  color: white;
  border-radius: 4px;
}

.box-text {
  display: inline-block;
  font-weight: 600;
  color: #aa2266;
}
</style>
