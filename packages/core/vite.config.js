import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, '../../src/core/index.ts'),
      name: 'CSSSpringAnimationCore',
      fileName: 'css-spring-animation-core',
    },
  },
})
