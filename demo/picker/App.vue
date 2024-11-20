<script setup lang="ts">
import { ref } from 'vue'
import { useSpring } from '../../src/vue'

const pickerHeight = 240
const itemHeight = 40

const selectedIndex = ref(0)
const loopDirection = ref<'up' | 'down'>()

const hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

const { style: sliderStyle, realValue } = useSpring(
  () => {
    const segmentHeight = itemHeight * hours.length
    const centering = (pickerHeight - itemHeight) / 2

    if (loopDirection.value) {
      const realY = realValue.value.translate[1]!
      const normalizedY = normalizeRealPosition(realY, segmentHeight, centering)

      if (loopDirection.value === 'up') {
        return {
          translate: `0px ${normalizedY - segmentHeight}px`,
        }
      } else {
        return {
          translate: `0px ${normalizedY + segmentHeight}px`,
        }
      }
    }

    const itemOffset = itemHeight * (hours.length + selectedIndex.value)

    return {
      translate: `0px ${centering - itemOffset}px`,
    }
  },
  () => {
    return {
      bounce: -0.2,
      duration: 300,
      relocating: loopDirection.value !== undefined,
    }
  },
)

function normalizeRealPosition(
  y: number,
  segmentHeight: number,
  centering,
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
    <div class="picker-slider" :style="sliderStyle">
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
    </div>
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
