#!/bin/sh

set -e

pnpm run typecheck --run
pnpm run test --run
pnpm run build
