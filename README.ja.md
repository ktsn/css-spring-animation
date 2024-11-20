# CSS Spring Animation

[English](./README.md) | 日本語

直感的で動作の予測がしやすい CSS トランジションベースのスプリングアニメーションライブラリです。WWDC 2023 の [Animate with springs](https://developer.apple.com/videos/play/wwdc2023/10158/) にインスパイアされて開発されています。このライブラリの特徴は以下の通りです。

- CSS トランジションを使ったスプリングアニメーションの実装
- オプションが直感的で動作を予測しやすい
  - `bounce`: アニメーションのバウンス度合い
  - `duration`: アニメーションの長さ
- ライブラリで使っている機能をサポートしていないブラウザに対しては `requestAnimationFrame` を使ったグレースフルデグラデーションでアニメーションを実行

## Getting Started

Vue 用のバインディングがあります。npm (または yarn, pnpm) でインストールします。

```sh
$ npm install @css-spring-animation/vue
```

`<script setup>` を使っているシングルファイルコンポーネントでは以下のように `spring` コンポーネントを使うことができます。

```vue
<script setup>
import { ref } from 'vue'
import { spring } from '@css-spring-animation/vue'

const moved = ref(false)
</script>

<template>
  <button type="button" class="button" @click="moved = !moved">Toggle</button>

  <!-- :spring-style で指定されたスタイルに応じてアニメーションする <div> 要素を描画 -->
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

`spring.` の後のプロパティ名が描画される要素名になります。例えば、`<spring.div>` は `<div>` 要素を描画します。要素は `:spring-style` プロパティで指定されたスタイルを持ちます。`:spring-style` プロパティの値が変更されるとスプリングアニメーションが実行されます。

## Bounce と Duration

`bounce` と `duration` オプションはバウンスの度合いとアニメーションの長さを指定するために使われます。

**bounce**<br>
アニメーションのバウンス度合いを指定します。値は -1 から 1 の間で指定します。デフォルト値は 0 です。

**duration**<br>
アニメーションの長さ（ミリ秒）を指定します。デフォルト値は 1000 です。

## `disabled` と `relocating`

`<spring>` コンポーネントと `useSpring` コンポーザブルは `disabled` と `relocating` オプションを指定できます。両方とも実行中のアニメーションを止めて、以降のスタイルの変更でアニメーションを行わなくします。

`disabled` はスプリングアニメーションを無効にしながら、継続的なスタイルの値の更新で要素の移動を表現し、その値の更新で計算された速度を使って再度スプリングアニメーションを行うときに使用します。[Swipe](./demo/swipe/) デモでその例を見ることができます。要素をドラッグしている間は `disabled` が `true` になり、離したときにドラッグ中の速度を引き継いでスプリングアニメーションが行われます。

`relocating` はスプリングアニメーションを実行せずにスタイルを更新し、直後に以前のアニメーションの速度を引き継いだアニメーションを行うときに使用します。[Picker](./demo/picker/) デモでは、マウスホイールでピッカーを無限に回転させることができます。これを実現するために、回転のアニメーションを維持しながら、`relocating = true` のときにピッカーを反対方向に戻す処理を行っています。

## スタイル指定時の注意点

スタイルに含まれる数値はすべて同じ単位で、同じ順番で現れる必要があります。例えば、以下のような `:spring-style` の値は正しく動作しません。

```vue
<template>
  <!-- ❌ この例は正しく動きません -->
  <spring.div
    :spring-style="{ transform: flag ? 'translate(100px, 100px)' : 'scale(2)' }"
  ></spring.div>
</template>
```

これはライブラリがスタイル内の数値をパースして、それぞれの数値ごとにアニメーションを計算しているためです。ライブラリは `translate` や `scale` の意味を解釈しませんし、`100%` と `100px` の違いも予測できません。上記の例を正しく動作させるには、`:spring-style` に含まれる数値がすべて同じ単位、同じ順番で現れるようにする必要があります。

```vue
<template>
  <!-- ✅ :spring-style のすべての数値が同じ単位、同じ順番で現れている -->
  <spring.div
    :spring-style="{
      transform: flag
        ? 'scale(1) translate(100px, 100px)'
        : 'scale(2) translate(0, 0)',
    }"
  ></spring.div>
</template>
```

## How It Works

このライブラリはアニメーションの対象となるスタイルのプロパティに、経過時間のカスタムプロパティを含む、スプリングアニメーションの数式をセットしています（そのカスタムプロパティを `--t` とします）。そして、[`CSS.registerProperty`](https://developer.mozilla.org/en-US/docs/Web/API/CSS/registerProperty_static) を使って `--t` を登録し、そのプロパティに対して CSS トランジションを適用します。スプリングアニメーションの擬似コードは以下のようになります。

```js
// --t を登録
CSS.registerProperty({
  name: '--t',
  syntax: '<number>',
  inherits: false,
  initialValue: 0,
})

// 初期状態を設定
el.style.setProperty('--t', 0)

// --t を含むスプリングアニメーションの数式をセット
el.style.translate = 'calc(P * (A * var(--t) + B) * exp(-C * var(--t)) - Q)'

// 再描画を実行させる
requestAnimationFrame(() => {
  // アニメーションの開始
  el.style.setProperty('--t', 1)
  el.style.transition = '--t 1000ms linear'
})
```

また、このライブラリは `CSS.registerProperty` や CSS の `exp()` 関数をサポートしていないブラウザに対しては、CSS トランジションを使わず、`requestAnimationFrame` を使ったグレースフルデグラデーションでアニメーションを実行します。

## API リファレンス

### `<spring>` コンポーネント

`<spring>` コンポーネントは、プロパティ名と同じタグ名のネイティブ HTML 要素を描画します（例えば、`<spring.div>` は `<div>` 要素を描画します）。

**プロパティ**

- `spring-style`: アニメーションさせるスタイルオブジェクト
- `bounce`
- `duration`
- `disabled`
- `relocating`

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

### `<SpringTransition>` コンポーネント

`<SpringTransition>` は Vue の [`<Transition>` コンポーネント](https://ja.vuejs.org/guide/built-ins/transition.html)のスプリングアニメーション版です。enter 時には `enter-from` のスタイルから `spring-style` へ、leave 時には `spring-style` から `leave-to` のスタイルへとアニメーションを行います。

**プロパティ**

- `spring-style`: 子要素のデフォルトスタイル
- `enter-from`: enter 前の子要素のスタイル
- `leave-to`: leave 後の子要素のスタイル。指定されていない場合は `enter-from` のスタイルが使われます。
- `bounce`
- `duration`

- Vue の `<Transition>` コンポーネントから引き継いでいる props:
  - `name`
  - `mode`
  - `enterFromClass`
  - `enterActiveClass`
  - `enterToClass`
  - `leaveFromClass`
  - `leaveActiveClass`
  - `leaveToClass`

**イベント**

- `before-enter`
- `after-enter`
- `enter-cancelled`
- `before-leave`
- `after-leave`
- `leave-cancelled`

```vue
<script setup>
import { ref } from 'vue'
import { SpringTransition } from '@css-spring-animation/vue'

const isShow = ref(false)
</script>

<template>
  <button type="button" class="button" @click="isShow = !isShow">Toggle</button>

  <!-- 子要素に対してスプリングアニメーションを行う -->
  <SpringTransition
    :spring-style="{
      translate: '0',
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
    <!-- v-show の値が変わった時に .rectangle 要素がアニメーションする -->
    <div v-show="isShow" class="rectangle"></div>
  </SpringTransition>
</template>
```

### `<SpringTransitionGroup>` コンポーネント

`<SpringTransitionGroup>` は Vue の [`<TransitionGroup>` コンポーネント](https://ja.vuejs.org/guide/built-ins/transition-group.html)のスプリングアニメーション版です。`<SpringTransition>` と同じように `spring-style`、`enter-from`、`leave-to` のスタイルを指定できます。

**Props**

- `spring-style`: 子要素のデフォルトスタイル
- `enter-from`: enter 前の子要素のスタイル
- `leave-to`: leave 後の子要素のスタイル。指定されていない場合は `enter-from` のスタイルが使われます。
- `bounce`
- `duration`

- Vue の `<Transition>` コンポーネントから引き継いでいる props:
  - `tag`
  - `name`
  - `enterFromClass`
  - `enterActiveClass`
  - `enterToClass`
  - `leaveFromClass`
  - `leaveActiveClass`
  - `leaveToClass`

**Events**

- `before-enter`
- `after-enter`
- `enter-cancelled`
- `before-leave`
- `after-leave`
- `leave-cancelled`

```vue
<script setup>
import { SpringTransitionGroup } from '@css-spring-animation/vue'

const list = ref([
  // ...
])
</script>

<template>
  <!-- 子要素に対してスプリングアニメーションを行う -->
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
    <!-- リストの項目は key プロパティを指定する必要あり -->
    <li v-for="item of list" :key="item.id">
      <!-- ... -->
    </li>
  </SpringTransitionGroup>
</template>
```

### `useSpring` composable

スプリングアニメーションを適用した style オブジェクトを返す composable 関数です。また、現在のスタイル中の数値の実際の値と、速度も返します。これらは、スタイルオブジェクトと同じ形式のオブジェクトで、値が数値の配列になっています。

第一引数はアニメーションさせるスタイルを返す関数、または ref です。第二引数はオプションオブジェクトです。これも関数、または ref にすることができます。

オプションオブジェクトには以下のプロパティを指定できます。

- `bounce`
- `duration`
- `disabled`
- `relocating`

`<spring>` コンポーネントでは実装できない複雑なユースケースで使うことを想定しています。

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

`useSpring` が返す値には、現在のアニメーションが完了するまで待つ `onFinishCurrent` 関数があります。この関数には、進行中のアニメーションが完了したときに呼ばれるコールバック関数を登録できます。

```vue
<script setup>
import { ref } from 'vue'
import { useSpring } from '@css-spring-animation/vue'

const position = ref(0)

const { style, onFinishCurrent } = useSpring(() => {
  return {
    translate: `${position.value}px`,
  }
})

function move() {
  // 100px まで移動
  position.value = 100

  // 上記の position の更新によってトリガーされたアニメーションが完了するまで待つ
  onFinishCurrent(() => {
    // 0px まで移動
    position.value = 0
  })
}
</script>
```

### `v-spring-style`, `v-spring-options` ディレクティブ

`v-spring-style` ディレクティブはアニメーションさせるスタイルを指定するために使います。`v-spring-options` ディレクティブはアニメーションのオプションを指定するために使います。

`<script setup>` ではない環境（`<spring>` コンポーネントを使えない）で使うことを想定しています。

`springDirectives` としてエクスポートされているプラグインオブジェクトを使ってディレクティブを登録できます。

```js
import { createApp } from 'vue'
import App from './App.vue'
import { springDirectives } from '@css-spring-animation/vue'

createApp(App).use(springDirectives).mount('#app')
```

そして、テンプレートでディレクティブを使えます。

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
