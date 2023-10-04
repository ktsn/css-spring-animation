import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'CSSSpringAnimation',
      fileName: 'css-spring-animation'
    },
  },
})