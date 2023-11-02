<script setup>
import { ref } from 'vue'
import { SpringTransitionGroup } from '../../src/vue'

const list = ref([1, 2, 3, 4, 5])

function onAdd() {
  const max = Math.max(...list.value)
  list.value = [max + 1, ...list.value]
}

function onShuffle() {
  list.value = list.value.sort(() => Math.random() - 0.5)
}
</script>

<template>
  <div class="buttons">
    <button type="button" @click="onAdd">Add</button>
    <button type="button" @click="onShuffle">Shuffle</button>
  </div>

  <SpringTransitionGroup
    tag="ul"
    :spring-style="{
      opacity: 1,
    }"
    :enter-from="{
      opacity: 0,
    }"
    :leave-to="{
      opacity: 0,
    }"
    :duration="800"
    :bounce="0"
  >
    <li v-for="item of list" :key="item">{{ item }}</li>
  </SpringTransitionGroup>
</template>

<style scoped>
.buttons {
  margin-bottom: 20px;
}
</style>
