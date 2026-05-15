#!/usr/bin/env node
import { build } from 'vite'
import { readFileSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, '../packages/vue')
const outFile = path.join(packageRoot, 'dist/css-spring-animation-vue.js')

async function buildLib(minify) {
  await build({
    root: packageRoot,
    configFile: path.join(packageRoot, 'vite.config.ts'),
    logLevel: 'warn',
    build: {
      minify: minify ? 'oxc' : false,
      emptyOutDir: true,
    },
  })
}

await buildLib(false)
const bundled = statSync(outFile).size

await buildLib(true)
const minifiedBuf = readFileSync(outFile)

process.stdout.write(
  JSON.stringify(
    {
      bundled,
      minified: minifiedBuf.length,
      gzipped: gzipSync(minifiedBuf).length,
    },
    null,
    2,
  ) + '\n',
)
