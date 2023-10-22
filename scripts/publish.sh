#!/bin/sh

pnpm run typecheck --run
pnpm run test --run
pnpm run dts
pnpm run -r build
cp packages/core/dist/css-spring-animation-core.umd.cjs packages/core/dist/css-spring-animation-core.umd.js
cp packages/vue/dist/css-spring-animation-vue.umd.cjs packages/vue/dist/css-spring-animation-vue.umd.js

#pnpm -r publish --access public
