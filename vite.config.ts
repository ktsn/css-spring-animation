/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],

  root: 'demo',

  test: {
    environment: 'jsdom',
  },
})
