# Handoff — `rad`, and reconciling it with the parallel qm work

**Working against `d362abd` on `evolve/rad-v1`, 2026-08-09.** Every figure on
this page was true at that commit and may not be now. Re-derive before acting;
do not quote a number from here as current.

**Read this page, then exactly one section of "The queue".** The sections are
independent unless the table says otherwise.

---

## Read this first: the branch is ahead of its remote

```
evolve/rad-v1   d362abd   local
origin/evolve/rad-v1      1d1b2cd   ← three commits behind
```

Three commits exist only on this disk. They are the whole of Phase A and Phase B
below, and PR #1 does not show them.

```sh
git -C rad push origin evolve/rad-v1
```

This is the single highest-value action on this page and it was deliberately not
taken: the session was told to keep iterating locally. With a second agent now
working, the instruction has outlived its reason — a handoff for work nobody can
see is not a handoff. **Push before doing anything else, or read the three
commits with `git log -p 1d1b2cd..d362abd` before you touch the same files.**

The same stranding is the failure this corpus keeps finding in itself: the org
rollout page records apothecary's governance work sitting nineteen days on one
disk. This is that shape, at three hours old.

## What is verified, and what is not

| Claim | How established |
|---|---|
| No parallel work exists on `quaternionmedia/rad` | `gh pr list --state all` → PR #1 only; repo events → all `subcontrabass`; `git branch -avv` → two branches; `git worktree list` → one |
| `qm` has no `project/rad` branch | `gh api repos/quaternionmedia/qm/branches` |
| The parallel work is `qm@evolve/ci-tooling-fixes` | seven commits, touching `project-seed/ci/*` and `project-seed/ide/AGENTS.md` |
| That work's own handoff queue does not mention `rad` | `git grep -i rad` over its `*.md` — no hits |

**I could not see the other agent's working tree.** If its work is local and
unpushed, everything in "Reconciliation" below is derived from
`qm@evolve/ci-tooling-fixes` alone and may be incomplete. Establish that before
trusting the table.

---

## Reconciliation with `qm@evolve/ci-tooling-fixes`

`rad` copied three things from the qm seed and cited two tools. All five have
moved on that branch. None of this is broken today; all of it is drift that will
be discovered later and more expensively.

### R1 — `AGENTS.md` is a stale copy of the seed *(do this first)*

`project-seed/ide/AGENTS.md` gained rules `rad`'s copy does not have. Two change
what an agent working here is supposed to do:

- **Pull requests open as drafts** (`gh pr create --draft`), never requesting a
  review, with the asker as **assignee**. The reasoning is specific and worth
  reading rather than paraphrasing: a ready PR against a branch carrying
  `CODEOWNERS` requests review from those owners the instant it opens, names
  nobody, and cannot be recalled.
- **One open PR per repository.**
- A new rule 7 routes explanation: inline comments carry *clarifying facts*,
  `README.md` is a shallow onramp, `docs/` is reference, and **every why goes to
  a retrospective in `perspectives/`**.

**PR #1 was opened ready, not draft.** That notification has already fired and
cannot be unfired; converting it now only stops further noise. It is a human's
call, not an agent's, and it is recorded here so it stops being invisible.

Rule 7 has a real cost here and it should be counted before anyone acts on it:
this codebase deliberately carries *why* in its comments — the scheduler's spin
lead, the cascade fight in the touch floor, the crop expression's missing comma
each explain themselves where they are. Moving all of that to `perspectives/`
would be a large, mechanical, low-value diff. **Do not do it as cleanup.** If
the rule is adopted here, adopt it forward — new comments follow it, existing
ones are left — and say so in the adoption record.

**Do:** re-copy the governance section of the seed's `AGENTS.md` verbatim once
`evolve/ci-tooling-fixes` lands on `qm@main`, keeping everything below this
repo's `<!-- Project-specific -->` marker. Not before: copying from an unmerged
branch pins `rad` to something that may still change.

### R2 — `tests/governance.spec.mjs` mirrors a lint that has been repaired

That file is a **stopgap**, and says so in its own header: it enforces the
drafting discipline locally because the real `adr_lint.py` lives in a submodule
that does not exist yet. `adr_lint.py` has since gained 82 lines on the parallel
branch, including a repair to the append-only check.

The mirrored `BANNED` regex is still character-identical — checked — so nothing
is failing. The other four checks may have diverged.

**Do not chase it.** Two copies of one check is exactly the drift the seed
arrangement exists to avoid, and the correct fix is deleting the mirror, not
syncing it. That deletion is step 5 of the adoption record's §4 and it happens
when the submodule lands.

### R3 — the figures pasted into PR #1 are stale

The PR body quotes `check_pr_base.py` as `3 commit(s), 81 file(s)` at head
`eab2dee9`. Re-run with the repaired script against `1d1b2cd2`: `4 commit(s),
84 file(s)`.

**The difference is the branch moving, not the script's ref bugs.** I pushed a
fourth commit after writing that body. I did **not** establish whether the
repaired ref handling changes the output, and the shapes agree; do not report
that it does without running both.

Re-paste after pushing, with the repaired script from
`qm/project-seed/ci/check_pr_base.py`.

### R4 — `run_workflows_locally.py` has changed

`rad`'s PR body reports a run of the pre-repair version: 9 of 11 steps passing,
`adr-lint` failing for want of the submodule and `Install ffmpeg` failing
because `sudo` is disabled on Windows. Re-run with the repaired tool before
re-reporting. Both failures are expected to persist and both are honest — one is
a named gap, one is an environment difference.

### R5 — a `project/rad` branch does not exist on `qm`

Eight sibling `project/*` branches do. Until this one exists, `adr/` lives at
this repo's root, `.github/workflows/adr-lint.yml` fails by design, and the
stopgap in R2 cannot be deleted. The commands are in the adoption record §4;
creating a remote branch is a human decision.

---

## The queue

| Task | Blocks on | Where |
|---|---|---|
| [Push the branch](#read-this-first-the-branch-is-ahead-of-its-remote) | nothing | `rad` |
| [C1 — core extraction, evidence for a pending decision](#c1--core-extraction) | nothing | `rad` |
| [C2 — the seam's four open questions](#c2--the-seams-open-questions) | a real consumer | `rad` |
| [C3 — v0.0.1's two human clauses](#c3--v001) | nothing an agent can do | human |
| [R1 re-copy `AGENTS.md`](#r1--agentsmd-is-a-stale-copy-of-the-seed) | `ci-tooling-fixes` landing on `qm@main` | `rad` |
| [R5 create `project/rad`](#r5--a-projectrad-branch-does-not-exist-on-qm) | a human | `qm` |

### C1 — core extraction

**Status: `Proposed`, and the decision is explicitly a human's.**
`adr/DRAFT-rad-core-extraction.md` §3 asks one question: does the single-file
artifact remain the thing humans edit?

`v0.0.3` cannot be claimed while it is open, because the import-boundary lint the
contract *requires* cannot exist while the core shares a file with a renderer.
So this is on the critical path and has been for three milestones.

**What an agent may do without deciding it:** build the extraction as a
demonstration on a throwaway branch and report what it costs — whether the
generated `index.html` is byte-identical modulo module ordering, whether every
vector still passes, how many lines the concatenating build actually is. That
converts an argument into evidence.

**What it does not authorise:** merging it, changing `index.html`'s status to
generated, or amending the contract's Conformance clause. If the demonstration
is convincing, it is still a human who says so.

**Establish rather than assume:** that `window.rad` is not already sufficient.
The seam is reachable now (`adr/DRAFT-rad-host-integration-standard.md`), and
`tests/integration.spec.mjs` asserts no exposed function mentions the DOM. That
is a weaker, in-page form of the same lint. Whether the stronger form is worth a
build step is the actual question, and the weak form's existence changes the
answer.

### C2 — the seam's open questions

§6 of the integration standard names four: synchronous `resolve`, capabilities,
concurrent sessions, renderer replacement.

**Do not design these ahead of a consumer.** The record says one implementation
cannot settle them, and `v0.0.2` exists precisely to have apothecary and
benchmark hit them. A seam designed against no consumer is a description of its
author; that sentence is in the record because it is the failure mode.

The useful work here is the opposite: make it cheap for a host to *report*
hitting one. That is a paragraph in the standard, not code.

### C3 — v0.0.1

Both remaining clauses are human by the org's own record and no agent can
discharge either:

- **Review of the change set.** `REVIEW.md` is one reviewer's reading of the
  work, not a second reader's reading of the review.
- **Manual testing on real hardware.** Long-press, release-select,
  drag-through, and both cancel edges, on glass. CI emulates touch; it has no
  finger, and the gesture grammar is the deliverable. Ideally a real MIDI clock
  and a CC controller too, since the tempo axes are specified against hardware
  and tested only against synthesised messages. If that hardware is not
  available, the tag annotation says so.

The automated half is met and re-established on every run: `npm run gate`, then
`scripts/check-gate.mjs` fails on any skip, rerun or flake.

---

## Rules that apply to anything picked up here

**Establish, do not assume.** Every defect this project found after the first
review was found by running something, and two of them were found by tests
written to check a *documented* property. Three "findings" in this session were
wrong on first measurement — a wheel-metering test that counted its own mouse
move, a jitter budget that was measuring CPU contention, a viewport too large to
trigger the case it claimed to test. Measure, then write it down.

**A passing test is not evidence until it has been seen to fail.** New suites in
this repo carry negative controls for exactly that reason. A brand-new suite
going green first try is when to distrust it, not when to ship it.

**Vectors before behaviour.** Changing `step()` without a vector covering the
change gets sent back. `conformance/vectors.json` is the source; `index.html`'s
inline block is generated by `npm run sync:vectors` and a test fails on drift.

**The gate and the measurements are different things.** `npm run gate` is
deterministic and is the only thing a release claim may rest on. `npm run
measure` reads a wall clock and claims nothing. If a gate test starts flaking,
fix it or move it to `measure` — do not add a retry. `retries` is 0 by
construction.

**Docs are build output.** `README.md`, `docs/guide/` and `docs/media/` are
regenerated by `npm run verify` and CI fails if a fresh run disagrees
structurally. Edit `tests/topics.mjs`, never the output.

**Do not quote a figure from this page.** Including the ones above.

---

## State at `d362abd`

| | |
|---|---|
| Gate | 325 tests, 0 skipped, 0 flaky, 0 retried |
| Measurements | 5, run alone, claiming nothing |
| Vectors | read `conformance/vectors.json`; `0.4.0` on this date |
| Product version | `0.0.0` — unreleased, no tag |
| Records in `adr/` | 10 drafts, indexed in `adr/README.md` |
| Open conflicts | C11 (records not in the submodule), C13 (core extraction) |
| CI on PR #1 | `verify`, `reuse`, `check-submodule-refs` pass; `adr-lint` fails by design |

## Things deliberately not done

- **PR #1 not converted to draft.** R1. A human's call.
- **The three local commits not pushed.** The session was told to stay local.
  That instruction now costs more than it saves; see the top of this page.
- **Rule 7 not applied retroactively.** R1.
- **The `governance.spec.mjs` mirror not synced to the repaired lint.** R2 —
  the fix is deletion, and deletion has a prerequisite.
- **Core extraction not built.** C1 — it is a decision, not a task.
