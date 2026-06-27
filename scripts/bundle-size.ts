import { spawnSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, '..')
const outFile = path.join(packageRoot, 'dist/ktsn-spring.mjs')

function buildLib(minify: boolean): void {
  const args = ['pack', '--format', 'esm']
  if (minify) args.push('--minify')
  const result = spawnSync('vp', args, {
    cwd: packageRoot,
    stdio: ['ignore', 'ignore', 'inherit'],
  })
  if (result.status !== 0) {
    throw new Error(`vp pack failed with status ${result.status}`)
  }
}

buildLib(false)
const bundled = statSync(outFile).size

buildLib(true)
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
