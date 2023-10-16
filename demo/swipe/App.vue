<script setup lang="ts">
import { ref } from 'vue'
import { useSpring } from '../../src/vue'

const dotLeftPosition = {
  x: 100,
  y: 200,
}

const dotRightPosition = {
  x: 500,
  y: 200,
}

const position = ref({
  ...dotLeftPosition,
})

const isDragging = ref(false)

const { style, realVelocity } = useSpring(
  () => ({
    translate: `${position.value.x}px ${position.value.y}px`,
  }),
  () => ({
    duration: 800,
    disabled: isDragging.value,
  }),
)

const onPointerDown = (e: PointerEvent) => {
  isDragging.value = true
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

const onPointerMove = (e: PointerEvent) => {
  if (!isDragging.value) {
    return
  }

  position.value.x = e.clientX
  position.value.y = e.clientY
}

const onPointerUp = (e: PointerEvent) => {
  if (!isDragging.value) {
    return
  }
  isDragging.value = false

  const velocityX = realVelocity.value.translate[0]!
  const threshold = (dotLeftPosition.x + dotRightPosition.x) / 2

  if (position.value.x + velocityX > threshold) {
    position.value = { ...dotRightPosition }
  } else {
    position.value = { ...dotLeftPosition }
  }
}
</script>

<template>
  <div class="wrapper">
    <div class="dot left"></div>
    <div class="dot right"></div>

    <div
      class="ball"
      :style="style"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
    ></div>
  </div>
</template>

<style scoped>
.dot {
  position: absolute;
  margin-top: -2.5px;
  margin-left: -2.5px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: #000;
}

.left {
  left: calc(1px * v-bind('dotLeftPosition.x'));
  top: calc(1px * v-bind('dotLeftPosition.y'));
}

.right {
  left: calc(1px * v-bind('dotRightPosition.x'));
  top: calc(1px * v-bind('dotRightPosition.y'));
}

.ball {
  position: absolute;
  left: -50px;
  top: -50px;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background-color: #fff;
  box-shadow: 0 0 15px 5px rgba(0, 0, 0, 0.3);
  will-change: transform;
}
</style>
