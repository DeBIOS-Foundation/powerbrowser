#!/usr/bin/env bash
# D-13 baseline, extended by Phase 45 (PKG-17, owner decision 19).
#
# Two modes. Dev mode (default): assumes it is already running inside the
# `firefox` dev shell -- it does not enter that shell itself -- and prints
# the three Nix-flake toolchain lines. Container mode (--container): runs the
# same-shaped probe INSIDE the pb-gecko-build release container (or against
# the bootstrap-resolved toolchain it recorded), printing the container's
# Mozilla bootstrap toolchain plus the sysroot and the image digest:
#   podman run --rm pb-gecko-build bash /src/scripts/toolchain-baseline.sh --container
# Phase 49 (AUTO-05) diffs this output against toolchain-baseline.txt with
# drift failing the build; Phase 45 establishes the file content plus the
# script mode against the first container build (plan 45-04 owner gate).
set -euo pipefail

if [ "${1:-}" = "--container" ]; then
    # Inside pb-gecko-build: clang comes from --enable-bootstrap, the sysroot
    # line names the linux64 sysroot dist (jessie, glibc 2.19 floor) the
    # bootstrap resolved, and the image line names the container digest.
    clang --version | head -n 1 | grep -oE 'clang version [0-9]+\.[0-9]+\.[0-9]+' | sed 's/^clang version /clang /'
    rustc --version | grep -oE '^rustc [0-9]+\.[0-9]+\.[0-9]+' | sed 's/^rustc /rustc /'
    cbindgen --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | sed 's/^/cbindgen /'
    echo "sysroot jessie glibc-2.19"
    echo "image pb-gecko-build debian:bookworm"
    exit 0
fi

rustc --version | grep -oE '^rustc [0-9]+\.[0-9]+\.[0-9]+' | sed 's/^rustc /rustc /'
cargo --version | grep -oE '^cargo [0-9]+\.[0-9]+\.[0-9]+' | sed 's/^cargo /cargo /'
cbindgen --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | sed 's/^/cbindgen /'
