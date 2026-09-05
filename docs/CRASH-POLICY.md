# Power Browser Crash Collection Policy (TEL-04)

This is the reviewable source for crash handling. The collector
(`scripts/crash-collector.mjs`) enforces exactly what this page states, and
the contract gate (`scripts/verify-crash-collector.mjs --self-test`) proves
it with one planted fault per direction. If the code and this page ever
disagree, this page wins and the code is the bug.

The native crash reporter stays compiled out
(`--disable-crashreporter`), so Power Browser itself never sends a crash
anywhere. This policy covers the downstream-operated collector only. There
is no Socorro self-host and no archived mini-breakpad-server adoption: the
collector speaks the Antenna submission contract and nothing else.

## Ping versus report routing

Two paths, two destinations, never mixed:

- **Pings** — error events from the Theia sidecar ride the existing
  telemetry sender to the telemetry endpoint as JSON batches. Admitted at
  every level but `off` (so at `crash` too); usage events stay home unless
  the level is `all`. No minidump bytes ever enter that sender.
- **Reports** — minidumps are submitted as multipart POSTs to this
  collector (`POST /submit`, part name `upload_file_minidump`) and answered
  with `CrashID=<uuid>`.

## What is stored

Each accepted submit writes exactly two files under the store dir,
`<uuid>.dmp` (the minidump bytes) and `<uuid>.json` (the index record:
id, received time, annotation values, minidump size, part names).

Annotations are allowlist-only. The only submitter-supplied fields ever
stored are:

- `ProductName`, `Version`, `BuildID`, `Platform`, `ReleaseChannel`,
  `CrashTime`, `StartupTime`

Any other field is dropped before the write, and any allowlisted value
larger than 4096 bytes is dropped with it. File paths, URLs, and form
data have no allowlisted field to arrive in.

## Retention

Crash records are kept for **30 days** and then deleted. Every accepted
submit sweeps the store dir and removes records older than the window, so
deletion needs no second job and no operator step. There is no indefinite
minidump retention: a record that outlives the window is gone, not
archived.

## Throttle

The collector accepts at most **60 submits per rolling 60 seconds** per
process (the Antenna throttler shape: a named rule, a window, a cap).
Past the cap it answers HTTP 200 with `Discarded=throttled_per_minute_cap`
— the success status on purpose, so the client treats it as a soft
no and may retry rather than queuing a failure. Rejected submits
(malformed, oversized) never consume throttle budget: only accepted
submits count toward the cap.

## Rejection vocabulary

| Input | Status | Body |
|---|---|---|
| Well-formed submit | 200 | `CrashID=<uuid>` |
| Not multipart, or no boundary | 400 | `Discarded=malformed_wrong_content_type` |
| No part named `upload_file_minidump` | 400 | `Discarded=malformed_no_minidump` |
| Over part-count, part-size, or total-body cap | 413 | `Discarded=oversized_body` |
| Past the throttle cap | 200 | `Discarded=throttled_per_minute_cap` |
| Store dir unwritable | 500 | `Discarded=store_unavailable` |

Caps: 16 parts per submit, 8 MiB per part, 20 MiB per whole body.

Rejections write nothing: a rejected submit leaves no record file behind.

## Exposure

The collector binds the loopback address only and has no flag to change
that. If Power Browser cannot reach it there, check that the collector
process is running and that the submit URL points at it. Serving crash
collection beyond loopback needs token auth and is out of scope for this
setup — do not expose the port to a network.

## Operator runbook

1. Start it: `node scripts/crash-collector.mjs --port 8123 --store <dir>`.
   Records land in `<dir>`; stop with Ctrl-C.
2. Prove the loop: post one synthetic multipart submit to
   `http://127.0.0.1:8123/submit` and expect `CrashID=` back plus a
   matching `<uuid>.json` record in the store dir.
3. Prove the gate: `node scripts/verify-crash-collector.mjs --self-test`.
   A red row names its rule; fix the named cause, not the gate.
