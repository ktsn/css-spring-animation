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

`<script setup>` を使っているシングルファイルコンポーネントでは以下のように `spring` 高階コンポーネントを使うことができます。

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

## スタイル指定時の注意点

スタイル値に含まれる数値はすべて同じ単位で、同じ順番で現れる必要があります。例えば、以下のような `:spring-style` の値は正しく動作しません。

```vue
<template>
  <!-- ❌ この例は正しく動きません -->
  <spring.div
    :spring-style="{ transform: flag ? 'translate(100px, 100px)' : 'scale(2)' }"
  ></spring.div>
</template>
```

これはライブラリがスタイル値内の数値をパースして、それぞれの数値ごとにアニメーションを計算しているためです。ライブラリは `translate` や `scale` の意味を解釈しませんし、`100%` と `100px` の違いも予測できません。上記の例を正しく動作させるには、`:spring-style` に含まれる数値をすべて同じ単位、同じ順番で現れるようにする必要があります。

```vue
<template>
  <!-- ✅ :spring-style のすべての数値が同じ単位、同じ順番で現れている -->
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

このライブラリはアニメーションの対象となる CSS 値に、経過時間を表すカスタムプロパティを含むスプリングアニメーションの数式をセットしています（そのカスタムプロパティを `--t` とします）。そして、[`CSS.registerProperty`](https://developer.mozilla.org/en-US/docs/Web/API/CSS/registerProperty_static) を使って `--t` を登録し、そのプロパティに CSS トランジションを適用できるようにします。スプリングアニメーションの数式の擬似コードは以下のようになります。

```css
.target {
  /* カスタムプロパティ --t に対して CSS トランジションを適用 */
  --t: 0;
  transition: --t 1000ms linear;

  /* --t を含むスプリングアニメーションの数式をセット */
  translate: calc(P * (A * var(--t) + B) * exp(-C * var(--t)) - Q);
}
```

また、このライブラリは `CSS.registerProperty` や CSS の `exp()` 関数をサポートしていないブラウザに対しては、CSS トランジションを使わず、`requestAnimationFrame` を使ったグレースフルデグラデーションでアニメーションを実行します。

## API リファレンス

### `<spring>` 高階コンポーネント

`<spring>` 高階コンポーネントは、プロパティ名と同じタグ名のネイティブ HTML 要素を描画します（例えば、`<spring.div>` は `<div>` 要素を描画します）。

**プロパティ**

- `spring-style`: アニメーションさせるスタイルオブジェクト
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

### `useSpring` composable

スプリングアニメーションを適用した style オブジェクトを返す composable 関数です。また、現在のスタイル中の数値の実際の値と、速度も返します。これらは、スタイルオブジェクトと同じ形式のオブジェクトで、値が数値の配列になっています。

第一引数はアニメーションさせるスタイルを返す関数、または ref です。第二引数はオプションオブジェクトです。これも関数、または ref にすることができます。

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

### `v-spring-style`, `v-spring-options` ディレクティブ

`v-spring-style` ディレクティブはアニメーションさせるスタイルを指定するために使います。`v-spring-options` ディレクティブはアニメーションのオプションを指定するために使います。

default export でエクスポートされているプラグインオブジェクトを使ってディレクティブを登録できます。

```js
import { createApp } from 'vue'
import App from './App.vue'
import plugin from '@css-spring-animation/vue'

createApp(App).use(plugin).mount('#app')
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
