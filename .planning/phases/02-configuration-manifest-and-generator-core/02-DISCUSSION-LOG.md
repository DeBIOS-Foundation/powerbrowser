# Phase 2: Configuration Manifest and Generator Core - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-01
**Phase:** 2-configuration-manifest-and-generator-core
**Areas discussed:** Byte-identity targets, Defaults + merge, Validation failure UX, Runtime + CLI shape

---

## Byte-identity targets

**Q: Where does generated output live relative to the hand-written files?**

| Option | Description | Selected |
|--------|-------------|----------|
| Generate into generated/, diff against tree | Consumers keep reading hand-written copies; repointing is Phase 3/5 | ✓ |
| Repoint consumers now | Delete hand-written copies, point .mozconfig/--with-branding at generated/ | |
| Hybrid: repoint the cheap ones | Repoint .mozconfig and desktop files only | |

**Q: Handling of the "hand-written (plan 01-03)" comment in configure.sh?**

| Option | Description | Selected |
|--------|-------------|----------|
| Reproduce verbatim, then retire after proof | Emit exact bytes, go green, then rewrite comment in both files and emitter | ✓ |
| Reproduce verbatim, leave as-is | Keep the misleading comment until Phase 3 | |
| Update hand-written files first | Move the target before the generator exists | |

**Q: Absolute /home/chris paths in the desktop files?**

| Option | Description | Selected |
|--------|-------------|----------|
| Derive from repo root at generate time | Byte-identical here, correct elsewhere; nothing machine-specific in the TOML | ✓ |
| Configurable [build] key | Install-prefix key in configuration.toml | |
| Relative/placeholder paths | Break byte-identity deliberately | |

**Q: Which files are in the byte-identity target set?**

| Option | Description | Selected |
|--------|-------------|----------|
| Exactly the roadmap trio | Two configure.sh, .mozconfig, two .desktop (five files) | ✓ |
| Trio plus locale strings | Also brand.ftl / brand.properties (pulls GEN-01 forward) | |
| Trio plus endpoint allowlist | Also endpoint-allowlist.json (pulls Phase 4 forward) | |

---

## Defaults + merge

**Q: Defaults file layout?**

| Option | Description | Selected |
|--------|-------------|----------|
| Root configuration.toml IS the defaults | One file; downstream overlays it | ✓ |
| Separate defaults file | config/defaults.toml plus root brand file | |

**Q: How does the overlay treat identity/legal keys?**

| Option | Description | Selected |
|--------|-------------|----------|
| Defaults layer masks identity/legal | Loader strips them from defaults; one shared required-key table | ✓ |
| Defaults file simply lacks them | Only viable with a separate defaults file | |

**Q: Merge depth?**

| Option | Description | Selected |
|--------|-------------|----------|
| Recursive key-level merge, arrays replace | Leaf wins; arrays replace whole | ✓ |
| Top-level table replace | Touching a section drops the whole default table | |

**Q: Echo format for applied defaults?**

| Option | Description | Selected |
|--------|-------------|----------|
| One stderr line per key, dotted path + value | Sorted, every run including --check | ✓ |
| Summary block | Count only unless --verbose | |
| Write generated/defaults-applied.toml | File plus stderr | |

---

## Validation failure UX

**Q: Reporting when several keys fail?**

| Option | Description | Selected |
|--------|-------------|----------|
| Collect all, report all, exit non-zero | One pass fixes everything | ✓ |
| Fail on first | Stop at first failure | |

**Q: What counts as unset?**

| Option | Description | Selected |
|--------|-------------|----------|
| Missing OR empty/whitespace string | "" fails like absent | ✓ |
| Missing only | Empty string honored | |

**Q: Failure message shape?**

| Option | Description | Selected |
|--------|-------------|----------|
| Dotted key path + rule + fix hint, no internals | File, key, value, rule in plain words | ✓ |
| Key path + rule only | Terse | |
| Machine-readable JSON errors | JSON array plus human line | |

**Q: Unknown keys?**

| Option | Description | Selected |
|--------|-------------|----------|
| Hard error naming the key | Same channel as missing keys | ✓ |
| Warning only | Continue | |
| Ignore | Silent | |

---

## Runtime + CLI shape

**Q: Runtime and TOML parser? (Node 24 has no built-in TOML parser.)**

| Option | Description | Selected |
|--------|-------------|----------|
| Node .mjs + one pinned/vendored TOML parser | Runs outside a dev shell; parser is researcher's pick | ✓ |
| Nix builtins.fromTOML feeds JSON to Node | Ties every run and CI to nix | |
| Python 3 tomllib | Zero deps but a second scripting language | |

**Q: Command and flag shape?**

| Option | Description | Selected |
|--------|-------------|----------|
| scripts/generate.mjs [--check] [--self-test] | Matches the gate convention | ✓ |
| Subcommands generate/check/validate | Adds validate-only | |
| Separate check script | Two entry points | |

**Q: Gate wiring?**

| Option | Description | Selected |
|--------|-------------|----------|
| Two --quick rows in verify-platform.sh | --check row and byte-identity diff row; both in rebase-upstream.yml | ✓ |
| One combined row | Both in one row | |
| Full-suite only | Not in --quick | |

**Q: brand/ and generated/ layout in Phase 2?**

| Option | Description | Selected |
|--------|-------------|----------|
| brand/ at root holds mark.svg now; generated/ at root | PNGs stay hand-placed until Phase 3 | ✓ |
| brand/ created empty | README placeholder | |
| Defer brand/ to Phase 3 | Only configuration.toml and generated/ | |

---

## Claude's Discretion

- TOML parser package and vendoring form
- Schema table representation and the Phase 2 section list of configuration.toml
- Dev/release variant expression in the manifest
- Whether generated/ carries a committed .gitkeep

## Deferred Ideas

- brand.ftl / brand.properties emission (Phase 3)
- endpoint-allowlist.json emission (Phase 4)
- Repointing consumers into generated/ and deleting hand-written copies (Phase 3/5)
- Real logo asset swap; [urls] homepage/search (carried from Phase 1)
