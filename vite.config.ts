import fs from 'node:fs'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite-plus'

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
    setupFiles: ['./test/setup-waapi.ts'],
    typecheck: {
      checker: 'vue-tsc',
      tsconfig: './tsconfig.test.json',
    },
  },

  pack: {
    entry: { 'ktsn-spring': './src/vue/index.ts' },
    format: ['esm', 'cjs', 'umd'],
    globalName: 'KtsnSpring',
    dts: true,
    tsconfig: './tsconfig.lib.json',
    outputOptions(outputOptions, format) {
      if (format === 'umd') {
        outputOptions.globals = { vue: 'Vue' }
      }
      return outputOptions
    },
  },

  fmt: {
    semi: false,
    singleQuote: true,
    sortPackageJson: true,
    sortImports: true,
    ignorePatterns: ['pnpm-lock.yaml', 'CHANGELOG.md'],
  },

  lint: {
    plugins: ['oxc', 'eslint', 'typescript', 'unicorn', 'vitest', 'vue'],
    options: {
      typeAware: true,
    },
  },

  staged: {
    '*': 'vp check --fix',
  },
})
