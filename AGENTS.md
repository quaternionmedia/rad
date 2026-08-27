# AGENTS.md

This project is governed by the Quaternion Media constitution, vendored at
`governance/qm` (a submodule pinned to this project's `project/rad`
branch of that repo). If you are an AI coding agent opening this repo with
no other briefing, read this file fully before your first commit or edit.

## Before you do anything

1. Read `governance/qm/README.md` and `governance/qm/PRINCIPLES.md` in full
   — the namespaces/precedence rules and the charter. Both are short.
2. This project's own decision records live in `governance/qm/adr/` — inside
   the submodule, on this project's own branch, not at this repo's root — as
   `ADR-NNNN` (numbered locally, at ratification) or `DRAFT-*.md` before
   ratification. A human ratifies; you draft.
3. **Everything you produce arrives as a pull request.** Work on a branch and
   open a PR for human review — in this repo, and in the `governance/qm`
   submodule when you touch this project's records there. Never commit to,
   merge into, or push a shared branch directly, and never merge your own
   work, however small or mechanical the change looks. If you cannot open a
   PR, hand the branch back rather than merging it.
4. **Human-only contributorship applies to every commit you make here** (see
   `governance/qm/records/DRAFT-human-only-contributorship.md`): do not add
   yourself, your model name, or any co-author trailer naming an unmonitored
   address (e.g. a vendor `noreply@` address) to any commit. If your default
   tooling normally appends a `Co-Authored-By:` trailer, suppress it for
   this repo. Tool involvement is disclosed as a `Tools:` note where the
   artifact calls for one, never as a byline.
5. Follow the drafting-session handoff contract in
   `governance/qm/adr/README.md` before writing or amending any record.
6. A QM record may be tightened by this project's own records, never
   relaxed — see `governance/qm/README.md`'s "Namespaces and precedence."
7. Banned in any pre-ratification `DRAFT-*.md` record: "previously",
   "originally", "earlier draft", "re-review", "renumber", "retroactive",
   "supersedes the ... (stance|finding)", "corrected". Drafts are rewritten
   in place, not narrated. The ADR lint enforces this over prose only, so
   quoting the list in a code span is fine.

## One-time setup on a fresh clone (Windows)

`CLAUDE.md` and `.github/copilot-instructions.md` are real symlinks to this
file, not copies — POSIX checkouts resolve them with no setup. On Windows,
enable Developer Mode (Settings → For developers) and run `git config
core.symlinks true` once per clone, then `git checkout -- .` if the files
were already checked out before that. Skipping this doesn't break
anything — the files degrade to one-line pointers containing just the
target path — but it isn't the intended, tested experience; see the
IDE-integrated governance discovery record in `governance/qm/records/` for
what was actually verified.

<!-- Project-specific setup commands, test commands, and conventions belong
     below this line; this seed only carries the governance-discovery part. -->

---

## Start here if you are picking this up cold

`HANDOFF.md` at this repo's root states which commit the last session worked
against, what is unpushed, what has drifted against the qm seed, and what is
queued. Read it before the sections below — several of them describe a state
that a pending reconciliation changes.

## Where this project's governance actually is, today

**`adr/` is at this repository's root, not inside `governance/qm`, and that is
a supported configuration rather than the deviation this page used to call it.**
The seed's own `adr-lint.yml` offers two models in its header and puts both
behind one knob: leave `RECORDS_DIR` empty for records on `project/<name>` in
the corpus, or set it to a local path when a project keeps `adr/` in its own
repository. This repository sets `RECORDS_DIR: adr`. The lint runs, and it runs
against these records.

The submodule is mounted. `.gitmodules` pins `governance/qm` to `project/rad`,
that branch exists on the qm remote, and `python governance/qm/project-seed/ci/adr_lint.py
--records-dir adr --index adr/README.md --base-ref origin/main` is clean —
which is what the paragraph above once said could not happen yet.

Two things follow, and neither is done:

- **`tests/governance.spec.mjs` has outlived its own stated condition.** Its
  first line says to delete it when the submodule lands. It has landed. Until
  somebody does, this repository runs two copies of one check — the drift that
  file's own header says the seed arrangement exists to avoid. Deleting it is a
  decision about coverage, because the lint and the spec do not assert
  identical properties; read both before removing either.
- **The org's status document reports this project with zero records.**
  `governance-status.yaml` counts a project's `adr/` on its corpus branch, and
  `project/rad` carries only the seeded `README.md` and `TEMPLATE.md`. The
  records here are invisible from the org side, so this project reads as having
  decided nothing while holding more drafts than most. The generator now also
  reports the `RECORDS_DIR` a project declares, so the zero can be read; the
  census itself still counts one place.

## Working in this repository

```sh
npm ci                      # pinned; the lockfile is the claim
npx playwright install chromium
npm run gate                # the deterministic release gate (see below)
npm run measure             # the latency budgets, alone
npm test                    # gate, then measure
npm run verify              # suite, then regenerate docs/ + README from its artifacts
npm run sync:vectors        # regenerate index.html's inline vector block from conformance/vectors.json
```

`ffmpeg` is optional, and `scripts/build-docs.mjs` looks for it before
concluding it is missing: `FFMPEG_PATH`, then `PATH`, then the places
applications bundle it (kdenlive, Ardour, Blender, winget/scoop/chocolatey
shims). "Not on PATH" is not "not installed" — on Windows it routinely is not.
If none is found the motion topics record a still frame and say so in the
generated page; they do not fail and they do not delete anything.

**The gate and the measurements are different things, and only one of them can
support a release.** `npm run gate` runs every test that does not read a wall
clock, with no retries, and then `scripts/check-gate.mjs` reads the run's own
report and fails on any skip, rerun or flake. `npm run measure` runs the latency
budgets alone — they are real, they are published in the README, and under the
org's version-tags-are-claims record §3 they contribute nothing to a release
claim, because a test that depends on wall-clock timing is not validation.

A latency budget also cannot be measured while seven other browsers compete for
the CPU: the same assertion measured p95 0.0 ms at three workers and 1.8 ms at
eight, on identical code. `npm run test:all` runs everything in one parallel
pass and will intermittently fail those tests; that is the harness being
measured, not a regression.

If a gate test starts skipping or flaking, fix it or move it to `measure`.
Do not add a retry — `retries` is 0 by construction and §7 requires CI to fail
a release build that reports a rerun.

### The public seam

`window.rad` is what a host integrates against, and it is the whole of it — a
frozen object holding the platform-free core plus `createSession`. Anything not
on it is private, and a host reaching past it is relying on a coincidence. The
shape is specified in `adr/DRAFT-rad-host-integration-standard.md` and proven by
`tests/integration.spec.mjs`, which drives a synthetic host with its own scene,
reducer, vocabulary and camera.

Adding to that surface is a decision, not a convenience: it is the thing the two
`v0.0.2` consumers will pin against. Anything with a DOM reference in it fails
`tests/integration.spec.mjs` outright.

### Three rules specific to this repository

1. **`conformance/vectors.json` is the source of truth for the core's
   behaviour.** `index.html` carries a generated inline copy so the page runs
   from `file://` with no server. Never hand-edit the inline block — run
   `npm run sync:vectors`. `tests/conformance.spec.mjs` fails on drift.
2. **Changing the state machine means adding a vector first.** The corpus's
   precedent rule is that a divergence is captured at the cheap tier (a new
   vector) before the expensive one (amending the record). A pull request that
   changes `step()` without a vector covering the change will be sent back.
3. **`README.md`, `docs/guide/` and `docs/media/` are build output.** They are
   regenerated by `npm run verify` and CI fails if the committed copies differ
   from a fresh run. Edit `tests/topics.mjs`, never the output.
