#!/bin/sh

set -e

vp run typecheck
vp test --run
vp run build
