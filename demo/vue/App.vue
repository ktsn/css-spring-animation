<script setup lang="ts">
import { ref } from 'vue'
import { spring } from '../../src/vue'

const to = ref({
  x: 0,
  y: 0,
})

function onPointerDown(event: PointerEvent): void {
  to.value = {
    x: event.clientX - 15,
    y: event.clientY - 15,
  }
}
</script>

<template>
  <div class="wrapper" @pointerdown="onPointerDown">
    <spring.div
      class="target"
      :spring-style="{
        translate: `${to.x}px ${to.y}px`,
      }"
      :duration="5000"
    ></spring.div>
  </div>
</template>

<style scoped>
.wrapper {
  position: absolute;
  inset: 0;
}

.target {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: #259902;
}
</style>
