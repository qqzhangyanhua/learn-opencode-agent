#!/usr/bin/env sh
set -eu

echo "Harness check"
echo "Running verified release gate: bun run build:strict"

bun run build:strict
