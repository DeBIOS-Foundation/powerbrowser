#!/usr/bin/env bash
# D-13 baseline. Assumes it is already running inside the `firefox` dev
# shell -- it does not enter that shell itself, so Phase 3's CI can invoke
# it from whatever shell context CI already has.
set -euo pipefail

rustc --version | grep -oE '^rustc [0-9]+\.[0-9]+\.[0-9]+' | sed 's/^rustc /rustc /'
cargo --version | grep -oE '^cargo [0-9]+\.[0-9]+\.[0-9]+' | sed 's/^cargo /cargo /'
cbindgen --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | sed 's/^/cbindgen /'
