<script setup>
import { ref } from 'vue'
import { SpringTransitionGroup } from '../../src/vue'

const list = ref([1, 2, 3, 4, 5])

function onAdd() {
  const max = Math.max(...list.value)
  const index = Math.floor(Math.random() * list.value.length)
  list.value = [
    ...list.value.slice(0, index),
    max + 1,
    ...list.value.slice(index),
  ]
}

function onRemove() {
  const index = Math.floor(Math.random() * list.value.length)
  list.value = [...list.value.slice(0, index), ...list.value.slice(index + 1)]
}

function onShuffle() {
  list.value = list.value.sort(() => Math.random() - 0.5)
}
</script>

<template>
  <div class="buttons">
    <button type="button" @click="onAdd">Add</button>
    <button type="button" @click="onRemove">Remove</button>
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
    @before-leave="(el) => (el.style.position = 'absolute')"
  >
    <li v-for="item of list" :key="item">{{ item }}</li>
  </SpringTransitionGroup>
</template>

<style scoped>
.buttons {
  margin-bottom: 20px;
}
</style>
