# DSH-BLOCKED: Phase 45 Task 3 owner gate (blocking-human)

**Phase:** 45-portable-linux-release-build-c, plan 45-04 Task 3
(`checkpoint:human-action`, gate `blocking-human`)
**What:** Safe Browsing keyfile + first container bootstrap build on legion.
**Why blocked:** Obtaining the Google Safe Browsing API key, writing the
keyfile to a legion path outside the repo, and running the multi-hour
container bootstrap build (podman + tier-3 Gecko build + MAR + live-update
observation) are owner actions per CONTEXT owner gates and REQUIREMENTS
External Gates. Autonomous execution must stop here per the skill's
checkpoint handling and the plan's `autonomous: false`.

## Owner steps (exact)

From a space-free work dir on legion with the keyfile outside the repo:

1. Obtain the Google Safe Browsing API key in the Google Cloud console; write
   the one-line keyfile to a legion path OUTSIDE any repo (e.g.
   `/var/lib/powerbrowser-release/sb-gapi.key`). Record only the directory
   path in your reply, never the key value.
2. `podman build -t pb-gecko-build -f powerbrowser/packaging/Containerfile .`
3. `podman run --rm -v "$PWD:/src:rw" -v <legion-keydir>:/keys:ro -w /src pb-gecko-build bash -c 'MOZCONFIG=/src/powerbrowser/packaging/mozconfig.release ./mach build'`
4. `podman run --rm -v "$PWD:/src:rw" -w /src pb-gecko-build bash powerbrowser/packaging/package-linux.sh`
5. `MAR=objdir-release/dist/host/bin/mar MOZ_PRODUCT_VERSION=<built-ver> MAR_CHANNEL_ID=powerbrowser-default bash upstream/tools/update-packaging/make_full_update.sh <out>.mar <stage-dir>` then `LD_LIBRARY_PATH=objdir-release/dist/bin objdir-release/dist/bin/signmar -T`
6. Prove every staged gate: `scripts/verify-platform.sh --only portable-elf`,
   `--only sidecar-no-symlinks`, `--only package-target-natives`, `--only
   ng063-packaged-launch`, `--only packaged-identity`.

## Resume signal

Reply with: keyfile directory (path only), build commands run, tarball + MAR
sizes with tree/host/toolchain attribution, each full-tier row PASS line, the
SB live-update observation (`safebrowsing.googleapis.com` 200s + refreshed
classifier files), and the `toolchain-baseline.sh --container` output. A reply
without the evidence does not resume the plan. Do not paste the key value
into the tree, the SUMMARY, or the reply — path only.

## Staged state (all committed on branch dsh/phase-45)

- Plans 45-01/45-02/45-03 complete with SUMMARies; 45-04 Tasks 1-2 complete
  with SUMMARY (`45-04-SUMMARY.md` records the MAR/signmar blocked lines).
- `scripts/verify-platform.sh --quick` PASS (commit gate green after every
  commit). Full-tier rows FAIL naming the missing container tarball by
  design; full green waits on this gate.
