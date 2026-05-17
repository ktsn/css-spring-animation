import { computed, ref } from 'vue'

import { createSpringValue } from '../core/spring-value'
import type { SpringComputed, SpringValue } from '../core/spring-value'

export function springValue(initial: number): SpringValue {
  const valueRef = ref(initial)
  return createSpringValue(
    () => valueRef.value,
    (next) => {
      valueRef.value = next
    },
  )
}

export function springComputed(getter: () => number): SpringComputed {
  const valueRef = computed(getter)
  return createSpringValue(() => valueRef.value)
}
