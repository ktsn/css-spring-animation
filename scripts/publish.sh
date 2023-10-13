#!/bin/sh

pnpm run typecheck --run
pnpm run test --run
pnpm run dts
pnpm run -r build

pnpm -r publish --access public
