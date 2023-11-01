# CSS Spring Animation

English | [日本語](./README.ja.md)

An intuitive and predictable spring animation library powered by CSS Transition. It is inspired by [Animate with springs](https://developer.apple.com/videos/play/wwdc2023/10158/) of WWDC 2023. The features of this library are:

- Implementing spring animation with CSS Transition
- Animation options are intuitive and predictable
  - `bounce`: Bounciness of an animation
  - `duration`: Perceptive animation duration
- Graceful degradation with `requestAnimationFrame` for browsers that do not support the features used in the library

## Getting Started

There is a Vue binding of the library. Install it with npm (or yarn, pnpm):

```sh
$ npm install @css-spring-animation/vue
```

When you use `<script setup>` in a single file component, you can use `spring` higher-order component as below:

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
    :bounce="0.3"
  ></spring.div>
</template>
```

The property name after `spring.` is the tag name to be rendered. For example, `<spring.div>` renders `<div>` element. The element has the style specified on `:spring-style` prop. Spring animation will be triggered when the value of `:spring-style` prop is changed.

## Bounce and Duration

`bounce` and `duration` options are used to specify the bounciness and perceptive duration of an animation.

**bounce**<br>
Bounciness of an animation. The value is between -1 and 1. The default value is 0.

**duration**<br>
Perceptive duration (ms) of an animation. The default value is 1000.

## Spring Style Caveats

All numbers in a style value must have the same unit and must be appeared in the same order. For example, the following `:spring-style` value is invalid and will not work as expected:

```vue
<template>
  <!-- ❌ this example will not work as expected -->
  <spring.div
    :spring-style="{ transform: flag ? 'translate(100px, 100px)' : 'scale(2)' }"
  ></spring.div>
</template>
```

This is because the library parses the numbers in the style value, then calculate the animation for each number in the style value. The library cannot understand the meaning of `translate`, `scale` nor predict the difference between `100%` and `100px`. To fix the above example, you need to specify both `translate` and `scale` in the same order and always use the same unit:

```vue
<template>
  <!-- ✅ all numbers in the :spring-style have the same unit and are in the same order -->
  <spring.div
    :spring-style="{
      transform: flag
        ? 'scale(1) translate(100px, 100px)'
        : 'scale(2) translate(0px, 0px)',
    }"
  ></spring.div>
</template>
```

## How It Works

The library sets spring animation expression in an animating CSS value including a custom property that representing elapsed time (let's say `--t` here). Then register `--t` by using [`CSS.registerProperty`](https://developer.mozilla.org/en-US/docs/Web/API/CSS/registerProperty_static) to be able to apply CSS Transition on it. The pseudo code of the spring animation expression looks like below:

```js
// Register --t
CSS.registerProperty({
  name: '--t',
  syntax: '<number>',
  inherits: false,
  initialValue: 0,
})

// Set initial state
el.style.setProperty('--t', 0)

// Set spring animatioin expression including --t
el.style.translate = 'calc(P * (A * var(--t) + B) * exp(-C * var(--t)) - Q)'

// Re-render
forceReflow()

// Trigger animation
el.style.setProperty('--t', 1)
el.style.transition = '--t 1000ms linear'
```

The library also provides a graceful degradation for browsers that do not support `CSS.registerProperty` and `exp()` function of CSS. In this case, the library will use `requestAnimationFrame` to animate the style value instead of CSS Transition.

## API Reference

### `<spring>` component

It renders a native HTML element as same tag name as the property name (e.g. `<spring.div>` renders `<div>` element).

**Props**

- `spring-style`: Style object to be animated
- `bounce`
- `duration`

```vue
<script setup>
import { spring } from '@css-spring-animation/vue'

const position = ref(0)
</script>

<template>
  <spring.div
    :spring-style="{
      translate: `${position.value}px`,
    }"
    :duration="600"
    :bounce="0.3"
  ></spring.div>
</template>
```

### `<SpringTransition>` component

`<SpringTransition>` is a spring animation version of Vue's `<Transition>` component. It triggers animation from `enter-from` style to `spring-style` on entering and from `spring-style` to `leave-to` on leaving.

**Props**

- `spring-style`: Default style of a child element.
- `enter-from`: Style of a child element before entering.
- `leave-to`: Style of a child element after leaving.
- `bounce`
- `duration`

**Events**

- `before-enter`
- `after-enter`
- `entere-cancelled`
- `before-leave`
- `after-leave`
- `leave-cancelled`

```vue
<script setup>
import { ref } from 'vue'
import { SpringTransition } from '../../src/vue'

const isShow = ref(false)
</script>

<template>
  <button type="button" class="button" @click="isShow = !isShow">Toggle</button>

  <!-- Trigger spring animation for the child element -->
  <SpringTransition
    :spring-style="{
      translate: '0px',
    }"
    :enter-from="{
      translate: '-100px',
    }"
    :leave-to="{
      translate: '100px',
    }"
    :duration="600"
    :bounce="0"
  >
    <!-- .rectangle element will be animated when v-show value is changed -->
    <div v-show="isShow" class="rectangle"></div>
  </SpringTransition>
</template>
```

### `useSpring` composable

A composable function to generate spring animation style. It also returns the real value and velocity of the corresponding number in the style value. They are as same shape as the style value except that its values are the array of numbers.

The first argument is a function or ref that returns the style object to be animated. The second argument is an options object. It also can be a function or ref that returns the options.

It is expected to be used in a complex situation that `<spring>` component is not suitable to be used.

```vue
<script setup>
import { ref } from 'vue'
import { useSpring } from '@css-spring-animation/vue'

const position = ref(0)

const { style, realValue, realVelocity } = useSpring(
  () => {
    return {
      translate: `${position.value}px`,
    }
  },
  () => {
    return {
      duration: 600,
      bounce: 0.3,
    }
  },
)
</script>

<template>
  <div :style="style"></div>
  <ul>
    <li>realValue: {{ realValue.translate[0] }}</li>
    <li>realVelocity: {{ realVelocity.translate[0] }}</li>
  </ul>
</template>
```

### `v-spring-style` and `v-spring-options` directivies

`v-spring-style` directive is used to specify the style to be animated. `v-spring-options` directive is used to specify the options of the animation.

It is expected to be used out of `<script setup>` where `<spring>` component is not able to be used.

You can register the directives by using plugin object exported as `springDirectives`:

```js
import { createApp } from 'vue'
import App from './App.vue'
import { springDirectives } from '@css-spring-animation/vue'

createApp(App).use(springDirectives).mount('#app')
```

Then you can use the directives in a template:

```vue
<template>
  <div
    v-spring-style="{
      translate: `${position}px`,
    }"
    v-spring-options="{
      duration: 600,
      bounce: 0.3,
    }"
  ></div>
</template>
```
