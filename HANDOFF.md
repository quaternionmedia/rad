# Handoff — `rad`

**Working against `a44f081` on `evolve/rad-v1`, 2026-08-09.** Every figure here
was true at that commit and may not be now. Re-derive before acting; do not
quote a number from this page as current.

**Read this page, then exactly one item from the queue.**

---

## Read this first: six commits exist only on this disk

```
evolve/rad-v1        a44f081   local
origin/evolve/rad-v1 1d1b2cd   ← six commits behind
```

PR #1 shows none of them. Two sessions have now built on top of that gap, and
the second could not see the first's work except by reading the same disk.

```sh
git push origin evolve/rad-v1
```

This is the highest-value action on the page and it has not been taken: the
instruction was to iterate locally, and it was given before a second session
existed. It is the same shape as the stranded governance branch the org's
rollout page records — six commits rather than nineteen days, and the same
mechanism.

**Before pushing**, note the org's incoming rule: one open PR per repository,
opened as a **draft**. PR #1 was opened ready. See R1.

---

## What is verified, and what is not

| Claim | How established |
|---|---|
| Parallel work landed in this worktree as `e880fb6` | `git log`; it is not mine and not on the remote |
| No parallel work exists on `quaternionmedia/rad` | `gh pr list --state all` → PR #1 only; `git branch -rv` → two branches |
| `qm` has no `project/rad` branch | `gh api repos/quaternionmedia/qm/branches` — eight `project/*`, none `rad` |
| The other visible work is `qm@evolve/ci-tooling-fixes` | seven commits, touching `project-seed/ci/*` and `project-seed/ide/AGENTS.md` |
| Its handoff queue covers dossier and never mentions `rad` | `git grep -i rad` over its `*.md` |

**I could not see any other working tree.** If work exists that is neither in
this repo's history nor on those remotes, nothing below accounts for it.

---

## Review of `e880fb6` — the parallel session's commit

It did two things. Both were worth doing; one needed correcting.

**Naming codecartographer a `v0.0.2` consumer.** Correct, and the reasoning
holds: the platform-plans draft already opened "modern web first (host exists:
codecartographer)" and gave that host a five-step plan, so the milestones record
naming only apothecary and benchmark was an oversight. It was careful to say
adding it does not relax the second-data-point rule, because the contract was
written with that host's legacy menu as its worked example — that integration is
partly the author marking his own homework. Left as written.

**Finding that `cancelScale` was unpinned.** Confirmed: `GEOM.cancelScale = 1.60`
failed no vector. A port could have adopted a different cancel radius and
claimed conformance truthfully.

**Corrected: the window was wider than reported.** `[1.2038, 1.8518]`, not
`[1.3043, 1.413)`. The narrower figure assumed all four `r_cancel` probes
constrained the default; the two at `r1=92` carry their own `geom` override,
which sets `cancelScale` inline, so they pin it *within the case* and constrain
the default not at all.

That correction generalises, and the general form is the useful part: **a vector
carrying a `geom` override tests the override path and cannot double as a pin on
the defaults.** Any future case that overrides geometry inherits the blind spot.

**Generalised: four constants were unpinned, not one.** A sweep over every
constant in the geometry and time blocks:

| Constant | State |
|---|---|
| `cancelScale`, `chordGapMs`, `burstSplitMs`, `topInset` | were unpinned — now pinned by boundary cases |
| `r0`, `r1`, `startDeg`, `bandMin`, `margin`, `bottomInset`, `ppqn` | already pinned to ±1% |
| `longPressMs`, `slop` | **unpinnable from core traces by construction** |

The last two are not an omission and should not be "fixed". The machine takes an
explicit `longpress` event and is otherwise time-free — the contract's own design
decision — and `slop` lives in the pointer adapter and never reaches `step()`.
They are checklist items in the contract's Conformance section.

`tests/pinning.spec.mjs` makes the sweep permanent. It perturbs every constant on
every run, requires the suite to notice, and fails when a constant is added to
the core and listed in neither category.

**The proposed vector was applied**, departing from integration standard §5.5.
The reason: §5.5 governs a *host* reporting a divergence in behaviour. This
changed no behaviour — it made an already-written clause checkable. If you
disagree, the revert is one commit and the record says which rule was weighed.

### Three defects that review found

- The chord boundary pair at 30/31 ms pinned `chordGapMs` downward but not
  upward: raising the threshold to 30.3 left both cases correct. Now 30 / 30.2.
- `vectors.json` declares `geometry.maxItems`; the core exposes `MAX_ITEMS`. The
  declared-vs-running check read the core as `undefined`.
- **In my own audit script**, and it is the one to remember. It computed
  "detected within ±1%" with `deltas.filter(...).every(d => d.fails > 0)`.
  Floating point made the filter empty, `[].every()` is `true`, and every
  constant reported as pinned — including the two that are not. A check that
  reported success while enforcing nothing, in the tool built to find checks
  that report success while enforcing nothing. Assertions in
  `pinning.spec.mjs` are written to fail on an empty set for that reason.

---

## Reconciliation with `qm@evolve/ci-tooling-fixes`

Nothing here is broken today. All of it is drift that gets discovered later and
more expensively.

### R1 — `AGENTS.md` is a stale copy of the seed, and PR #1 breaks its new rule

`project-seed/ide/AGENTS.md` gained rules this repo's copy lacks:

- **PRs open as drafts** (`gh pr create --draft`), never requesting review, asker
  as **assignee**. The reason is specific: a ready PR against a branch carrying
  `CODEOWNERS` requests review from those owners the instant it opens, names
  nobody, and cannot be recalled.
- **One open PR per repository.**
- A new rule routing explanation: inline comments carry *clarifying facts*,
  `README.md` is a shallow onramp, `docs/` is reference, **every why goes to a
  retrospective in `perspectives/`**.

**PR #1 was opened ready.** The notification has fired and cannot be unfired;
converting to draft now only stops further noise. A human's call.

Rule 7 has a real cost here, and it should be counted before anyone acts:
this codebase deliberately carries *why* next to the code it explains — the
scheduler's spin lead, the cascade fight in the touch floor, the crop
expression's missing comma, the `[].every()` note above. Relocating all of it
would be a large mechanical diff that makes the code harder to read. **Do not do
it as cleanup.** If adopted, adopt it forward: new comments follow it, existing
ones stay, and the adoption record says so.

**Do:** re-copy the governance section verbatim once that branch lands on
`qm@main` — not before. Copying from an unmerged branch pins `rad` to something
still moving.

### R2 — `tests/governance.spec.mjs` mirrors a lint that has been repaired

`adr_lint.py` gained 82 lines on that branch, including a repair to the
append-only check. The mirrored `BANNED` regex is still character-identical —
checked — so nothing is failing. The other checks may have diverged.

**Do not chase it.** Two copies of one check is the drift the seed arrangement
exists to avoid. The fix is deleting the mirror, which is step 5 of the adoption
record's §4 and waits on the submodule.

### R3 — the figures in PR #1 are stale

The body quotes `3 commit(s), 81 file(s)` at head `eab2dee9`. The branch is now
`a44f081` with six unpushed commits on top of that. Re-run
`check_pr_base.py` from the repaired seed and re-paste after pushing.

The difference is the branch moving. I did **not** establish whether the
repaired ref handling changes the output; do not report that it does without
running both.

### R4 — `run_workflows_locally.py` has changed

The PR reports a run of the pre-repair version: 9 of 11 steps passing,
`adr-lint` failing for want of the submodule and `Install ffmpeg` failing
because `sudo` is disabled on Windows. Both are expected to persist — one is a
named gap, one an environment difference. Re-run with the repaired tool.

### R5 — `project/rad` does not exist on `qm`

Eight sibling `project/*` branches do. Until it exists, `adr/` lives at this
repo's root, `.github/workflows/adr-lint.yml` fails by design, and R2's mirror
cannot be deleted. Commands are in the adoption record §4. A human decision.

---

## The queue

| Task | Blocks on | Where |
|---|---|---|
| [Push the branch](#read-this-first-six-commits-exist-only-on-this-disk) | nothing | `rad` |
| [C1 — core extraction, evidence for a pending decision](#c1--core-extraction) | nothing | `rad` |
| [C2 — the seam's open questions](#c2--the-seams-open-questions) | a real consumer | `rad` |
| [C3 — v0.0.1's two human clauses](#c3--v001) | nothing an agent can do | human |
| [R1 re-copy `AGENTS.md`](#r1--agentsmd-is-a-stale-copy-of-the-seed-and-pr-1-breaks-its-new-rule) | that branch landing on `qm@main` | `rad` |
| [R5 create `project/rad`](#r5--projectrad-does-not-exist-on-qm) | a human | `qm` |

### C1 — core extraction

**`Proposed`, and the decision is explicitly a human's.**
`adr/DRAFT-rad-core-extraction.md` §3 asks one question: does the single-file
artifact remain the thing humans edit?

`v0.0.3` cannot be claimed while it is open, because the import-boundary lint the
contract *requires* cannot exist while the core shares a file with a renderer.

**An agent may** build the extraction on a throwaway branch and report what it
costs — whether the generated `index.html` is byte-identical modulo module
ordering, whether every vector still passes, how many lines the concatenating
build is. That turns an argument into evidence.

**It does not authorise** merging it, changing `index.html`'s status to
generated, or amending the Conformance clause.

**Establish rather than assume** that `window.rad` is not already sufficient. The
seam is reachable now, and `tests/integration.spec.mjs` asserts no exposed
function mentions the DOM — a weaker, in-page form of the same lint. Whether the
stronger form is worth a build step is the actual question, and the weak form's
existence changes the answer.

### C2 — the seam's open questions

§6 of the integration standard names four: synchronous `resolve`, capabilities,
concurrent sessions, renderer replacement.

**Do not design these ahead of a consumer.** `v0.0.2` exists precisely to have
apothecary and benchmark hit them. A seam designed against no consumer is a
description of its author. The useful work is making it cheap for a host to
*report* hitting one — a paragraph, not code.

### C3 — v0.0.1

Both remaining clauses are human by the org's record:

- **Review of the change set.** `REVIEW.md` is one reviewer's reading of the
  work, not a second reader's reading of the review.
- **Manual testing on real hardware.** Long-press, release-select, drag-through,
  and both cancel edges, on glass. CI emulates touch; it has no finger, and the
  gesture grammar is the deliverable. Ideally a real MIDI clock and CC
  controller, since the tempo axes are specified against hardware and tested
  only against synthesised messages. If that hardware is unavailable, the tag
  annotation says so.

The automated half is met and re-established every run: `npm run gate`, then
`scripts/check-gate.mjs` fails on any skip, rerun or flake.

---

## Rules for anything picked up here

**Establish, do not assume — including about the other session.** `e880fb6`'s
finding was real and its magnitude was wrong, and the difference only appeared
by re-measuring. Four claims in these two sessions were wrong on first
measurement: a wheel-metering test that counted its own mouse move, a jitter
budget measuring CPU contention, a viewport too large to trigger its own case,
and an audit script that passed vacuously on an empty array.

**A passing test is not evidence until it has been seen to fail.** New suites
here carry negative controls. A brand-new suite going green first try is when to
distrust it.

**Vectors before behaviour.** Changing `step()` without a covering vector gets
sent back. `conformance/vectors.json` is the source; the inline block is
generated by `npm run sync:vectors` and a test fails on drift.

**The gate and the measurements are different things.** `npm run gate` is
deterministic and is the only thing a release claim may rest on. `npm run
measure` reads a wall clock and claims nothing. If a gate test flakes, fix it or
move it to `measure` — never add a retry. `retries` is 0 by construction.

**Docs are build output.** `README.md`, `docs/guide/`, `docs/media/` come from
`npm run verify`. Edit `tests/topics.mjs`, never the output.

**Do not quote a figure from this page**, including the ones above.

---

## State at `a44f081`

| | |
|---|---|
| Gate | 359 tests, 0 skipped, 0 flaky, 0 retried |
| Measurements | 5, run alone, claiming nothing |
| Vectors | read `conformance/vectors.json` — `0.5.0`, 47 cases on this date |
| Product version | `0.0.0` — unreleased, no tag |
| Records in `adr/` | 10 drafts, indexed in `adr/README.md` |
| Open conflicts | C11 (records not in the submodule), C13 (core extraction) |
| CI on PR #1 | last run green except `adr-lint`, which fails by design |

## Deliberately not done

- **Six commits not pushed.** The instruction was local; it now costs more than
  it saves.
- **PR #1 not converted to draft.** R1. A human's call.
- **Rule 7 not applied retroactively.** R1, with the cost stated.
- **The `governance.spec.mjs` mirror not synced.** R2 — the fix is deletion, and
  deletion has a prerequisite.
- **Core extraction not built.** C1 — a decision, not a task.
- **`longPressMs` and `slop` not pinned.** They cannot be, from core traces.
  Checklist items, said out loud rather than papered over.
