import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],

  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'CSSSpringAnimation',
      fileName: 'css-spring-animation',
    },
  },
})
