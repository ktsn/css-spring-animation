<script setup>
import { ref } from 'vue'
import { SpringTransition } from '../../src/vue'

const isShow = ref(false)
</script>

<template>
  <button type="button" class="button" @click="isShow = !isShow">Toggle</button>

  <SpringTransition
    :spring-style="{
      scale: 1,
      translate: '0px',
    }"
    :enter-from="{
      translate: '-100px',
    }"
    :leave-to="{
      scale: 0,
    }"
    :duration="{
      enter: 600,
      leave: 1200,
    }"
    :bounce="{
      enter: 0.3,
      leave: 0,
    }"
  >
    <div v-show="isShow" class="rectangle"></div>
  </SpringTransition>
</template>

<style scoped>
.button {
  margin-bottom: 20px;
}

.rectangle {
  width: 100px;
  height: 100px;
  border-radius: 6px;
  background-color: red;
}
</style>
