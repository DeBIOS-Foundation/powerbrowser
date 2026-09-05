---
phase: 09-extensions-crash-pipeline
reviewed: 2026-09-05T09:30:00Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - scripts/generate.mjs
  - scripts/lib/config-schema.json
  - scripts/verify-extension-pins.mjs
  - scripts/verify-webextensions.mjs
  - scripts/crash-collector.mjs
  - scripts/verify-crash-collector.mjs
  - scripts/verify-downstream-fixture.mjs
  - scripts/verify-platform.sh
  - powerbrowser/distribution/policies.json
  - theia/extensions/telemetry/test/telemetry-sender.test.mjs
  - docs/REBRANDING.md
  - docs/CRASH-POLICY.md
  - docs/BUILD.md
  - .planning/phases/09-extensions-crash-pipeline/fixtures/npm-kind/configuration.toml
  - .planning/phases/09-extensions-crash-pipeline/fixtures/local-path-kind/configuration.toml
  - .planning/phases/09-extensions-crash-pipeline/fixtures/openvsx-pinned/configuration.toml
findings:
  critical: 0
  warning: 10
  info: 6
  total: 16
status: findings
---

# Phase 09: Code Review Report

**Reviewed:** 2026-09-05T09:30:00Z
**Depth:** standard
**Files Reviewed:** 16
**Status:** findings

## Summary

Reviewed all Phase 09 tracked changes (plans 09-01 through 09-04: extension
schema/resolver/pin-gate, webextensions emitter + agreement gate, crash
collector + policy, fixture oracle, re-pin runbook, registry rows, BUILD.md)
plus the three committed 09 fixture manifests (a deliberate exception to the
`.planning/` filter — the prompt names the fixture matrix in scope). The three
`brand/mark.svg` fixture assets are byte-test-data SVGs and were not
line-reviewed. `node scripts/generate.mjs --self-test` (58 cases),
`verify-crash-collector --self-test`, `verify-webextensions --self-test`,
`verify-extension-pins --self-test`, and `scripts/verify-platform.sh --quick`
were all re-run green on the final tree during this review.

Hard-rule check (per CLAUDE.md): no Theia-core patch (only tree-owned
`theia/extensions/telemetry/test/` touched, no `@theia/*` framework source),
no Gecko off-stack edit (no `upstream/` or `patches/` changes), no hand-edited
patch hunk, and both new registry pairs (`crash-collector`,
`webextensions`) ship with discriminating `--self-test` rows. No Critical
finding on the hard rules.

Ten warnings remain: one real logic defect (throttle budget consumed by failed
store writes, masking outages), two gate-coverage gaps where the self-test
overclaims per-direction proof, one incomplete policy-literal pin, one
order-sensitive JSON comparison that can false-red, one float-guard bypass,
one silent-ignore validation gap, one prototype-only test assertion, one
unanchored multipart split, and one unvalidated injected-clock parameter. Six
info items are robustness/docs nits. No issue blocks shipping alone, but
WR-01 through WR-05 should be fixed before the collector and gates are relied
on operationally.

## Warnings

### WR-01: Failed store writes consume throttle budget, masking outages as soft-rejects

**File:** `scripts/crash-collector.mjs:216-219,236-243`
**Resolution:** FIXED (d5d90c1) — handleSubmit probes with wouldThrottle before the write and recordAccept runs only after the store write succeeds; checkThrottle keeps probe-and-record for direct callers.
**Issue:** `handleSubmit` calls `checkThrottle` (which records the acceptance)
before attempting the store write. A submit that then fails with 500
`store_unavailable` has already consumed one throttle slot. Under a persistent
store outage, after 60 failed submits every further submit answers 200
`Discarded=throttled_per_minute_cap` instead of 500 — the outage signal
disappears exactly when operators need it. This also contradicts
`docs/CRASH-POLICY.md:58-59` ("only accepted submits count toward the cap"):
a 500'd submit is not accepted but counts.
**Fix:** Record throttle only after a successful store write. E.g. split
`checkThrottle` into a non-mutating `wouldThrottle(state, nowMs)` probe
before the write plus a `recordAccept(state, nowMs)` after `sweepRetention`,
or roll the slot back on the 500 path:
```js
const rule = wouldThrottle(throttle, nowMs);
if (rule) return { status: 200, body: buildDiscardResponse(rule), crashId: null };
// ... store write ...
recordAccept(throttle, nowMs);
```

### WR-02: Policy-literal pin omits the per-part and total-body caps it claims to cover

**File:** `scripts/verify-crash-collector.mjs:108-130`
**Resolution:** FIXED (604775f) — crash-collector exports MAX_PART_MIB/MAX_BODY_MIB deriving the byte caps; the gate pins "8 MiB"/"20 MiB" from those exports (deleting the sentence goes red naming the cap).
**Issue:** The gate header claims the policy "states every contract literal
the code exports", but `runChecks` never pins `MAX_PART_BYTES` (8 MiB/part)
or `MAX_BODY_BYTES` (20 MiB total) — `MAX_BODY_BYTES` is imported (used only
by the self-test plant) and `MAX_PART_BYTES` is not even imported. A policy
edit deleting the "8 MiB per part" / "20 MiB per whole body" sentences stays
green. (Part-count `16` and annotation `4096` are pinned; the two byte caps
are the hole.)
**Fix:**
```js
states('8 MiB', 'the per-part size cap');
states('20 MiB', 'the total-body cap');
```
Better: export MiB-denominated literals from `crash-collector.mjs` and pin
those instead of prose phrases, so code and doc cannot drift numerically.

### WR-03: Self-test has no plant for the per-part-size cap or the 500 path

**File:** `scripts/verify-crash-collector.mjs:292-349`
**Resolution:** FIXED (04f41f2) — plant 6 (one 8MiB+1 part under the total cap, want 413) and plant 7 (ENOTDIR store, want 500 plus a no-budget-consumed retry proof) added; both proven to go red with the check/budget broken.
**Issue:** The header promises "one plant per contract direction", but only
the total-body and part-count oversized directions have plants. A single part
over `MAX_PART_BYTES` (valid total size) and the `store_unavailable` 500 path
are unproven: raising `MAX_PART_BYTES` to `Infinity` or breaking the store
branch keeps the self-test green.
**Fix:** Add two plants — a multipart body under `MAX_BODY_BYTES` with one
part of `MAX_PART_BYTES + 1` bytes (want 413 `oversized_body`, store empty),
and a submit with `storeDir` pointed at an uncreatable location (e.g. a path
under a regular file; want 500 `store_unavailable`, store empty).

### WR-04: ExtensionSettings comparison is key-order sensitive and can false-red

**File:** `scripts/verify-webextensions.mjs:138,181`
**Resolution:** FIXED (384c9f0) — both per-entry comparisons use canonEntry (sorted-keys stringify); reordered keys verified equal while raw stringify differs.
**Issue:** Per-entry equality uses `JSON.stringify(tracked[id]) !==
JSON.stringify(expected[id])`. The compared values are objects
(`{installation_mode, install_url}`), and `JSON.stringify` is insertion-order
sensitive. Any key-sorting formatter applied to `policies.json`
(`install_url` sorts before `installation_mode`) produces a red gate on
semantically identical content. (`verify-extension-pins.mjs` string-compares
URL strings, where this is safe — the idiom was copied to a place where the
values are objects.)
**Fix:** Compare canonically, e.g.
```js
const canon = (o) => JSON.stringify(Object.keys(o).sort().reduce((a, k) => ((a[k] = o[k]), a), {}));
if (canon(tracked[id]) !== canon(expected[id])) { /* fail */ }
```

### WR-05: Webextensions self-test never plants stale/missing fragment ids

**File:** `scripts/verify-webextensions.mjs:305-440`
**Resolution:** FIXED (4c1985b) — plant 5 (fragment missing a declared id) and plant 6 (fragment carrying an undeclared id) added; header and PASS line now state six faults.
**Issue:** `runChecks` has explicit loops for fragment-missing-id (lines
132-145) and fragment-extra-id (lines 146-153), but the four plants cover
only drifted-tracked, drifted-fragment-value, stale-tracked, and uncovered
origin. Deleting either fragment-direction loop keeps `--self-test` green —
the "both-directions" claim is half unproven.
**Fix:** Add two plants: remove one id from the fixture fragment (want red
naming the id plus the fragment rel), and add an extra id to the fixture
fragment (want red naming the id as no-longer-declared).

### WR-06: npm float guard misses `x`-wildcards and spaceless hyphen ranges

**File:** `scripts/generate.mjs:472`
**Resolution:** FIXED (98a6b75) — exact-version allowlist NPM_EXACT_VERSION replaces the char class (deliberate deviation: spaceless `1.2.3-2.0.0` is an exact prerelease per semver, not a range, so it stays accepted; partials/wildcards/tags now fail); x-wildcard and partial plants added; REBRANDING.md wording updated.
**Issue:** `NPM_FLOAT_CHARS = /[\^~*|<>=,\s]/` is documented as rejecting
"every range character", but `1.2.x` / `1.x` (x-wildcards) and spaceless
hyphen ranges (`1.2.3-2.0.0`) pass both the schema shape
(`^[A-Za-z0-9][A-Za-z0-9._-]*$`) and this guard while still floating. Impact
is muted (the composed tarball URL 404s rather than resolving, and the hash
pin catches drift at the gate), so the failure mode is a confusing late
error, not a silent unpinned install — but the comment overclaims.
**Fix:** Extend the guard, e.g.
```js
const NPM_FLOAT_CHARS = /[\^~*|<>=,\s]|(?:^|[.-])x(?:$|[.-])/i;
if (entry.version === 'latest' || NPM_FLOAT_CHARS.test(entry.version)
    || /^\d+\.\d+\.\d+-/.test(entry.version)) { /* fail as floating */ }
```
or narrow the comment to the characters actually rejected.

### WR-07: Source-irrelevant keys are silently ignored instead of rejected

**File:** `scripts/generate.mjs:626-755` (`validateExtensionElements`)
**Resolution:** FIXED (7307703) — EXTENSION_SOURCE_KEYS allowlist rejects dead keys naming the entry; two plants added and proven to stay green-without-branch (the silent-ignore hole).
**Issue:** A `url`-source entry carrying `version`, an `npm` entry carrying
`path`/`url`, or an `openvsx` entry carrying `url` validates clean and the
extra key is silently dropped by the resolver dispatch. An operator who
believes the ignored key is operative (e.g. a `version` on a direct-URL
entry they think pins it) gets no signal. (Genuinely unknown keys like
`verison` are still caught by `rejectUnknown` — this is only about valid
keys on the wrong source.)
**Fix:** After the conditional-pin checks, reject keys the entry's source
does not read, naming the entry, e.g. a per-source allowlist
`{ openvsx: ['version'], url: ['url'], npm: ['version','integrity'],
local-path: ['path'] }` plus `id/source/sha256` always allowed.

### WR-08: Ping/report separation test inspects the prototype only

**File:** `theia/extensions/telemetry/test/telemetry-sender.test.mjs:288-299`
**Resolution:** FIXED (8337589) — test also scans an instance's own properties (null-interval instance, disposed) and the module's exports; both scans proven red with decoy members.
**Issue:** The "no report path in the ping sender" assertion enumerates
`Object.getOwnPropertyNames(PowerBrowserTelemetrySender.prototype)`. A report
path added as an instance field (class-field arrow function — the common
modern TS idiom, lives on the instance, not the prototype) or as a
module-scope export would pass this test while violating the separation
claim the test exists to pin.
**Fix:** Also scan an instance's own properties and the module's exports:
```js
const inst = new PowerBrowserTelemetrySender({ endpoint: 'https://example.org/x', getLevel: () => 'off', fetchFn: async () => ({ ok: true }) });
const names = [...Object.getOwnPropertyNames(PowerBrowserTelemetrySender.prototype), ...Object.keys(inst)];
assert(!names.some(m => /minidump|upload|dump|report/i.test(m)), ...);
```
plus a scan of `Object.keys(await import('../src/browser/telemetry-sender.ts'))`.

### WR-09: Multipart parser splits on the bare boundary and under-counts the part cap

**File:** `scripts/crash-collector.mjs:129-156`
**Resolution:** FIXED (0c8ec25) — splits on the CRLF-anchored delimiter (CRLF prepended so the first matches with no special case); raw delimiter count capped at MAX_PARTS+1 before parsing, so headerless floods trip oversized.
**Issue:** Two related parser weaknesses: (a) `splitBuffer(body,
Buffer.from('--' + boundary))` splits on the bare boundary string without
the CRLF-prefix anchoring the multipart grammar requires, so minidump bytes
that happen to contain the boundary sequence mis-parse a valid report into a
400 (collision probability is negligible with client-random boundaries, but
the parser is needlessly fragile); (b) chunks without a parseable
`Content-Disposition` are `continue`d before the `MAX_PARTS` / per-part-size
checks, so the count and size caps count only well-formed parts — a body of
many headerless sections evades `MAX_PARTS` (total memory stays bounded by
the 20 MiB body cap, and the server is loopback-only, so this is robustness
debt, not an exposed DoS).
**Fix:** Split on `Buffer.from('\r\n--' + boundary)` (handling the first
delimiter specially), and enforce `MAX_PARTS` on the raw delimiter count
before parsing individual parts.

### WR-10: `handleSubmit`/`checkThrottle` accept an undefined clock and silently disable throttling

**File:** `scripts/crash-collector.mjs:176-181,209`
**Resolution:** FIXED (7fc6b9a) — handleSubmit defaults nowMs ?? Date.now() and refuses non-finite clocks with 500 store_unavailable; wouldThrottle fails closed on a non-finite clock.
**Issue:** `nowMs` is a required injected parameter with no default and no
validation. Called with `nowMs === undefined`, `nowMs - THROTTLE_WINDOW_MS`
is `NaN`, the filter `t > NaN` drops every entry, and the throttle never
fires — while `new Date(undefined).toISOString()` on the accept path throws
`RangeError` (caught as a 500 over HTTP, uncaught in-process). The HTTP layer
always passes `Date.now()`, so this bites only future direct callers, but an
exported contract function should fail loud, not degrade silently.
**Fix:** Default and validate at the top of `handleSubmit`:
```js
const at = nowMs ?? Date.now();
if (!Number.isFinite(at)) return { status: 500, body: buildDiscardResponse(REASON_STORE_UNAVAILABLE), crashId: null };
```

## Info

### IN-01: Submitter-controlled part names stored unbounded in the index record

**File:** `scripts/crash-collector.mjs:222-234`
**Issue:** `partNames` (every part's `name=`, extracted by an unbounded
`([^"]*)` match) is persisted into the `.json` index with no length cap; a
single record's index can approach the 20 MiB body cap and is retained 30
days. Bounded by the body cap and loopback-only, so not a vulnerability —
just trim the stored surface.
**Fix:** Cap stored names (e.g. skip names over 256 chars, or store only
allowlisted names plus a count), mirroring the existing
`MAX_ANNOTATION_BYTES` rule.

### IN-02: Numeric policy pins are bare-substring checks

**File:** `scripts/verify-crash-collector.mjs:122-126`
**Issue:** `states(String(THROTTLE_WINDOW_MS / 1000), ...)` checks the policy
contains `"60"` — satisfied by the budget sentence even if the window
sentence is deleted. Same single-substring weakness, lesser degree, for
`"30"` (retention) and `"16"` (part cap).
**Fix:** Pin sentence-anchored phrases (`'60 submits per rolling 60
seconds'`, `'kept for **30 days**'`, `'16 parts per submit'`) instead of bare
numbers.

### IN-03: Stale comment on the empty-array exemption

**File:** `scripts/generate.mjs:281-289`
**Issue:** The comment frames the `value.length === 0` exemption as
EXT-01/`extensions = []`-specific, but the code is generic
(`k.startsWith(path + '[].')`) and already covers `webextensions = []`.
A reader may wrongly conclude the webextensions empty case is unhandled.
**Fix:** Reword to name both arrays (or neither — "any declared array of
tables").

### IN-04: BUILD.md drill transcript is schematic, not verbatim

**File:** `docs/BUILD.md` (Extension tier-3 drill, transcript step 1)
**Issue:** The section advertises a "Verbatim drill transcript" but the curl
lines carry `<open-vsx-file-url>` / `<linux-x64-open-vsx-file-url>`
placeholders — an operator cannot copy-paste-run it as written.
**Fix:** Label it "schematic (URLs redacted; pins in the hash record are the
source of truth)" or inline the real versioned file URLs.

### IN-05: No idle/body timeout on the collector HTTP server

**File:** `scripts/crash-collector.mjs:254-294`
**Issue:** Connections trickling a body hold a socket indefinitely up to the
20 MiB cap (no `requestTimeout`/`headersTimeout`/idle timer). Acceptable for
a loopback-only ops tool behind no network, but worth one line if the
collector is ever exposed.
**Fix:** `server.requestTimeout = 30_000; server.headersTimeout = 35_000;`
when constructed, and note it in `docs/CRASH-POLICY.md` exposure section.

### IN-06: Retention sweep keys off file mtime, not the record's received time

**File:** `scripts/crash-collector.mjs:184-200`
**Issue:** `sweepRetention` expires by `statSync().mtimeMs` while each record
carries `receivedAt`. A store restored from backup without timestamp
preservation lives a second 30 days (retention over-hold, not data loss);
conversely a backdated copy expires early. For just-written files the two
agree, so this only matters to migrated stores.
**Fix:** Read each `.json`'s `receivedAt` (fall back to mtime on parse
failure) for the cutoff comparison.

---

_Reviewed: 2026-09-05T09:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
