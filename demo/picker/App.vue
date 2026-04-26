<script setup lang="ts">
import { ref } from 'vue'
import { spring, springComputed, sv } from '../../src/vue'

const pickerHeight = 240
const itemHeight = 40

const hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

const selectedIndex = ref(0)
const loopDirection = ref<'up' | 'down'>()

const y = springComputed(() => {
  const segmentHeight = itemHeight * hours.length
  const centering = (pickerHeight - itemHeight) / 2

  if (loopDirection.value) {
    const realY = y.current()
    const normalizedY = normalizeRealPosition(realY, segmentHeight, centering)

    return loopDirection.value === 'up'
      ? normalizedY - segmentHeight
      : normalizedY + segmentHeight
  }

  const itemOffset = itemHeight * (hours.length + selectedIndex.value)
  return centering - itemOffset
})

function normalizeRealPosition(
  y: number,
  segmentHeight: number,
  centering: number,
): number {
  if (y <= -segmentHeight * 3 + centering) {
    return normalizeRealPosition(y + segmentHeight, segmentHeight, centering)
  }

  if (y > centering) {
    return normalizeRealPosition(y - segmentHeight, segmentHeight, centering)
  }

  return y
}

function selectByIndex(index: number): void {
  if (index >= 0 && index < hours.length) {
    selectedIndex.value = index
    return
  }

  loopDirection.value = index < 0 ? 'up' : 'down'

  requestAnimationFrame(() => {
    let normalized = index
    while (normalized < 0) {
      normalized += hours.length
    }

    loopDirection.value = undefined
    selectedIndex.value = normalized % hours.length
  })
}

function onWheel(event: WheelEvent): void {
  const delta = pickerDeltaByWheel(event)
  const nextIndex = selectedIndex.value + delta
  selectByIndex(nextIndex)
}

function pickerDeltaByWheel({
  deltaY,
  deltaMode,
}: {
  deltaY: number
  deltaMode: number
}): number {
  switch (deltaMode) {
    case WheelEvent.DOM_DELTA_PIXEL: {
      if (deltaY < 0) {
        return -pickerDeltaByWheel({
          deltaY: -deltaY,
          deltaMode,
        })
      }
      return Math.ceil(deltaY / itemHeight)
    }
    default:
      return 0
  }
}

function onChange(event: Event, index: number): void {
  const target = event.target as HTMLInputElement

  if (target.checked) {
    target.checked = false
    selectByIndex(index)
  }
}
</script>

<template>
  <div
    class="picker"
    :style="{ height: `${pickerHeight}px` }"
    @wheel.prevent="onWheel"
  >
    <spring.div
      class="picker-slider"
      :spring-style="{ translate: sv`0px ${y}px` }"
      :bounce="-0.2"
      :duration="300"
      :disabled="loopDirection !== undefined"
      :infer-velocity="false"
    >
      <label
        v-for="(hour, index) of [...hours, ...hours, ...hours]"
        :key="index"
        class="picker-item"
        :style="{ height: `${itemHeight}px` }"
      >
        <input
          type="radio"
          :value="hour"
          :checked="selectedIndex === index - hours.length"
          @change="onChange($event, index - hours.length)"
        />
        <span class="picker-item-label">{{ hour }}</span>
      </label>
    </spring.div>
  </div>
</template>

<style scoped>
.picker {
  width: 100%;
  overflow: hidden;
}

.picker-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  cursor: pointer;
}
</style>
