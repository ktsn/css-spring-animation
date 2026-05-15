#!/usr/bin/env node
import { readFileSync } from 'node:fs'

const [, , basePath, headPath] = process.argv

if (!basePath || !headPath) {
  console.error('Usage: bundle-size-report.mjs <base.json> <head.json>')
  process.exit(1)
}

const base = JSON.parse(readFileSync(basePath, 'utf8'))
const head = JSON.parse(readFileSync(headPath, 'utf8'))

function formatBytes(n) {
  if (n < 1024) return `${n} B`
  return `${(n / 1024).toFixed(2)} KB`
}

function formatDiff(b, h) {
  const delta = h - b
  if (delta === 0) return ' (±0)'
  const sign = delta > 0 ? '+' : ''
  const pct = b === 0 ? '' : ` / ${sign}${((delta / b) * 100).toFixed(2)}%`
  return ` (${sign}${formatBytes(delta)}${pct})`
}

function row(label, key) {
  return `| ${label} | ${formatBytes(head[key])}${formatDiff(base[key], head[key])} |`
}

const lines = [
  '## Bundle size report',
  '',
  '`@css-spring-animation/vue` (`dist/css-spring-animation-vue.js`)',
  '',
  '| Metric | Size |',
  '| --- | ---: |',
  row('Bundled', 'bundled'),
  row('Minified', 'minified'),
  row('Minified + Gzipped', 'gzipped'),
]

const baseSha = process.env.BASE_SHA
const headSha = process.env.HEAD_SHA
if (baseSha || headSha) {
  lines.push('')
  lines.push(
    `Base: \`${(baseSha ?? '').slice(0, 7)}\` · Head: \`${(headSha ?? '').slice(0, 7)}\``,
  )
}

process.stdout.write(lines.join('\n') + '\n')
