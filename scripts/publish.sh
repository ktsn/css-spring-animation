#!/bin/sh

if [ -z $1 ]; then
  echo "Please provide a version number" 1>&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Working directory is not clean" 1>&2
  exit 1
fi

pnpm run typecheck --run
pnpm run test --run
pnpm run dts
pnpm run -r build
cp packages/core/dist/css-spring-animation-core.umd.cjs packages/core/dist/css-spring-animation-core.umd.js
cp packages/vue/dist/css-spring-animation-vue.umd.cjs packages/vue/dist/css-spring-animation-vue.umd.js

(cd packages/core; npm version $1 --git-tag-version false)
(cd packages/vue; npm version $1 --git-tag-version false)

cp README.md packages/vue/README.md
cp README.ja.md packages/vue/README.ja.md
conventional-changelog -p angular -i CHANGELOG.md -s

git add .
git commit -m "v$1"
git tag v$1

pnpm -r publish --access public
