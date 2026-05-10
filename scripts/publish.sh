#!/bin/sh

if [ -z $1 ]; then
  echo "Please provide a version number" 1>&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Working directory is not clean" 1>&2
  exit 1
fi

./scripts/build.sh

npm version $1 --git-tag-version false

conventional-changelog -p angular -i CHANGELOG.md -s

git add .
git commit -m "v$1"
git tag v$1

git push --follow-tags
