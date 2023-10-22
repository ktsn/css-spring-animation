/// <reference types="vitest" />
import { defineConfig } from 'vite'
import fs from 'node:fs'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],

  server: {
    open: '/demo/',
  },

  build: {
    rollupOptions: {
      input: [
        './demo/index.html',
        ...fs.readdirSync('./demo').flatMap((file) => {
          if (file.endsWith('.html')) {
            return []
          }
          return [`./demo/${file}/index.html`]
        }),
      ],
    },
  },

  test: {
    environment: 'jsdom',
  },
})
