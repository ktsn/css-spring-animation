#!/bin/sh

set -e

pnpm run typecheck --run
pnpm run test --run
pnpm run dts
pnpm run build
cp dist/ktsn-spring.umd.cjs dist/ktsn-spring.umd.js
