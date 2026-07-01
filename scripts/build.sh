#!/usr/bin/env bash
set -euo pipefail

# resolve repo root regardless of cwd
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Cleaning ./dist"
rm -rf dist

echo "Copying static assets web/ -> dist/"
rsync -a --exclude='ts/' --exclude='dist/' web/ dist/

echo "Compiling TypeScript -> dist/js/"
npx tsc

echo "Build complete: ./dist"
