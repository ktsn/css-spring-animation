import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'

import { build } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, '..')
const outFile = path.join(packageRoot, 'dist/ktsn-spring.js')

async function buildLib(minify: boolean): Promise<void> {
  await build({
    root: packageRoot,
    configFile: path.join(packageRoot, 'vite.lib.config.ts'),
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
      brotli: brotliCompressSync(minifiedBuf, {
        params: {
          [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
        },
      }).length,
    },
    null,
    2,
  ) + '\n',
)
