# CSS Spring Animation

## Installation

```sh
# npm
$ npm install @css-spring-animation/vue

# yarn
$ yarn add @css-spring-animation/vue

# pnpm
$ pnpm add @css-spring-animation/vue
```

## Example

When you use `<script setup>` in a single file component of Vue, you can use `spring` higher-order component as below:

```vue
<script setup>
import { ref } from 'vue'
import { spring } from '@css-spring-animation/vue'

const moved = ref(false)
</script>

<template>
  <button type="button" class="button" @click="moved = !moved">Toggle</button>

  <!-- render <div> element animating with style specified on :spring-style -->
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
```
