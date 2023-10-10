<script setup lang="ts">
import { ref } from 'vue'
import { unit, useSpringStyle } from '../../src/vue/main'

const to = ref({
  x: 0,
  y: 0,
})

const style = useSpringStyle(
  to,
  (values) => {
    return {
      translate: `${unit(values.x, 'px')} ${unit(values.y, 'px')}`,
    }
  },
  {
    duration: 5000,
  },
)

function onPointerDown(event: PointerEvent): void {
  to.value = {
    x: event.clientX - 15,
    y: event.clientY - 15,
  }
}
</script>

<template>
  <div class="wrapper" @pointerdown="onPointerDown">
    <div class="target" :style="style"></div>
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
