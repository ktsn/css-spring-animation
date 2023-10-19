<script setup>
import { ref } from 'vue'
import { spring } from '../../src/vue'

const moved = ref(false)
</script>

<template>
  <button type="button" class="button" @click="moved = !moved">Toggle</button>

  <spring.div
    class="rectangle"
    :spring-style="{
      translate: moved ? '100px' : '0px',
    }"
    :duration="600"
    :bounce="0.2"
  ></spring.div>
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
