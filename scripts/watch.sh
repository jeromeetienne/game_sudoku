#!/usr/bin/env bash
set -euo pipefail

# resolve repo root regardless of cwd
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# full build once so dist/ has all static assets before watching
bash scripts/build.sh

# stop background watchers on exit
pids=()
cleanup() {
	for pid in "${pids[@]}"; do
		kill "$pid" 2>/dev/null || true
	done
}
trap cleanup EXIT INT TERM

echo "Watching web/ts/ -> dist/js/ (tsc)"
npx tsc -p tsconfig.build.json --watch --preserveWatchOutput &
pids+=($!)

echo "Watching static assets web/ -> dist/ (chokidar)"
npx --yes chokidar-cli "web/**/*" --ignore "web/ts/**" --initial=false --command \
	"rsync -a --exclude='ts/' --exclude='dist/' web/ dist/" &
pids+=($!)

wait
