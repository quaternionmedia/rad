# DRAFT — rad adoption and scope

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-08-09 |
| **Pends on** | creation of `project/rad` on the qm remote, and of a remote for this repository — both human decisions (§4) |

## Context

`rad` is QM's default radial menu: a platform-neutral interaction contract, a set
of executable conformance vectors, and a zero-dependency web reference
implementation that teaches itself. It exists because the org needs direct graph
manipulation on Android native, modern web and desktop native, and because
sharing a *contract* rather than *code* is what the house doctrine ("build the
seam, buy the engines") demands. The interaction contract, the metrics record and
the platform plans are the substance; this record is the project's adoption of the
QM constitution and the statement of what it is and is not.

The project predates its adoption of the corpus. It was written as a prototype
with governance-shaped prose — records in `docs/records/`, a README asserting it
was "governed by the records … under the qm constitution" — and none of the
machinery that assertion refers to: no `LICENSE`, no `REUSE.toml`, no `AGENTS.md`,
no submodule, no ADR lint, no adoption record. Under the decision-record-discipline
record's adoption clause, the substance of this record is therefore the **conflict
table** in §3: every known conflict with an org record, what it violates, and what
compliance would look like. Enumerating a conflict is not waiving it; scope is
frozen per conflict while it stays open.

## Decision

### §1 Scope

`rad` owns three artifacts and nothing else:

1. **The contract** — `adr/DRAFT-rad-interaction-contract.md`: menu model,
   geometry, state machine, chord adapter, and the time/tempo layer.
2. **The vectors** — `conformance/vectors.json`: the executable half of the
   contract, semver-versioned, replayed by every implementation in its own native
   test runner.
3. **The reference implementation** — `index.html`: a single-file, dependency-free
   web build that is simultaneously the demo, the tutorial, and the artifact the
   vectors are proven against.

Explicitly **not** in scope: any host application's state layer, any graph
library, any renderer beyond the reference SVG one, and any platform port. Ports
are separate work judged by the same vectors; the platform plans draft describes
them and governs none of them.

### §2 Adoption

`rad` adopts the QM constitution by reference. Org records bind it; this project's
records may tighten them and may not relax them. Its decision records live in
`adr/`, follow the seed's lifecycle and numbering, and are linted by the seed's
ADR lint.

**The seam protocols this project reaches its dependencies over**, per the
seams-on-standard-protocols record:

| Dependency | Protocol | Replaceability |
|---|---|---|
| Chorded input devices (CharaChorder class) | **USB HID keyboard** | Any HID keyboard emits the same bursts. The device is replaceable with a keyboard and a fast typist; the adapter has no vendor code. The vendor serial API is deliberately *not* used at this layer |
| External clock | **MIDI clock, 24 PPQN** (`0xF8`/`0xFA`/`0xFB`/`0xFC`) and MIDI CC | Any MIDI source works, hardware or software. qmetronome is a clock master rather than a dependency |
| Browser runtime | **Web MIDI, Pointer Events, SVG, CSS custom properties** — all W3C | Replaceable by any conformant browser. No framework, no polyfill, no CDN |
| Test runner | **Playwright** | Replaceable: it drives a standard browser over CDP and the topic registry is runner-agnostic. A port swaps in JUnit or XCTest against the same vectors |

### §3 Conflict table

Each row was established by execution, not by reading. The reproduction is named;
the full transcript is in `REVIEW.md` at this repository's root.

| # | Conflict | Org record violated | Established by | State |
|---|---|---|---|---|
| C1 | The governed conformance file was not the file the reference implementation ran; the two had already diverged | version-tags-are-claims — an implementation pinning vector `v0.2.0` was claiming a file it did not execute | Deep-compare of `conformance/vectors.json` against the page's inline `VECTORS`: unequal, with and without trace timestamps | **Closed.** The JSON is the source; `scripts/sync-vectors.mjs` generates the inline block; `tests/conformance.spec.mjs` fails on drift and replays the file's cases |
| C2 | The README's "Measured (this run)" table carried a hand-typed value for the headline metric | unified-artifact-pipeline — "numbers in docs are measurements" | Literal `\| IPA, chord verbs \| 1 \| 1 \|` in the generator's template string | **Closed.** IPA is measured per path and per verb; a verb over budget fails the build |
| C3 | Published `p95` figures were computed from one and two samples | interaction-efficiency-metrics §5 — releases claiming the budgets "include measured values" | `p95([0.42]) = 0.42`; `meters.jits.length === 1` after the quantize topic | **Closed.** The timing topics drive ≥20 commits and the generator refuses to print a percentile below that count |
| C4 | The grid-jitter gate asserted 5 ms while the record and the README both state p95 ≤ 1 ms | interaction-efficiency-metrics §4 | Assertion `Math.abs(g.deltaMs) <= 5` against a documented budget of 1 | **Closed.** The suite asserts the record's number |
| C5 | The deploy gate ran only on push to `main`, so no pull request was ever verified | decision-record-discipline; the corpus's "everything arrives as a pull request" | `pages.yml` triggers: `push: branches: [main]`, `workflow_dispatch` | **Closed.** `pull_request` trigger added; the pinned lockfile install replaced an unpinned `npm install` |
| C6 | Committed `README.md` and `docs/media/` could be arbitrarily stale with CI green | unified-artifact-pipeline — "staleness = redness" | No comparison between regenerated and committed artifacts anywhere in CI | **Closed, with a stated limit.** `build-docs --check` fails the build when the committed README or any guide page disagrees with a fresh run. It compares *structure*: measured values are masked, because "numbers are measurements" means they change every run, and screenshots are excluded, because CI renders on Ubuntu and a contributor does not. Media staleness remains a review question, which is what the pipeline record already assumes |
| C7 | The harness deleted tracked output before establishing it could regenerate it | P9 minimal legible deliverables; general repository hygiene | Running `tests/run.mjs` on a machine without `ffmpeg`: exit 1, sixteen tracked files deleted, seven modified | **Closed.** Generation writes to a staging directory and swaps on success; `ffmpeg` is optional |
| C8 | Accessibility claims were verified by existence checks; the skip link did not move focus | P9; the contract's own accessibility checklist | `activeElement === #tour-panel` is `false` after activating the skip link; panel has no `tabindex` | **Closed.** Behavioural assertions replace presence assertions |
| C9 | The destructive action's label failed WCAG AA contrast | the contract's behavioural checklist | Computed 4.17:1 for `--danger` on `--wedge`; AA for normal text is 4.5:1 | **Closed.** Contrast is a test, over every theme, at the threshold for the rendered size |
| C10 | Code cited record numbers belonging to another project's corpus (`ADR-002`, `ADR-003`) | decision-record-discipline — numbers are assigned at ratification and are local to a project | Two comments in `index.html` | **Closed.** Citations are by title |
| C11 | Project records sat at `docs/records/`, not in `adr/` on a `project/rad` branch of the governance submodule | the corpus's branch-per-project model | Directory layout | **Open — shape closed, location open.** Records are in `adr/` with the seed's lifecycle. The location depends on §4 |
| C12 | No `LICENSE`, no `LICENSES/`, no `REUSE.toml` | outbound-licensing | Absence | **Closed and blocking.** `reuse lint` is the verbatim seed workflow, left blocking rather than started in reporting mode, because it passed on its first run: 72/72 files carry copyright and licence, all four declared licences are used, no unused licences (2026-08-09, `python project-seed/ci/run_workflows_locally.py`) |
| C13 | The platform-free core is a comment header inside a 1,514-line file that also calls `document`, so the import-boundary lint the contract requires cannot exist | the contract's own Conformance clause §2 | `index.html` structure | **Open.** Drafted separately as *rad core extraction*; it is a larger change than a compliance fix and deserves its own decision |

### §4 What only a human can do

These are named rather than done, because each is a decision about a remote:

1. **Create `https://github.com/quaternionmedia/rad`** and push `main`.
2. **Create branch `project/rad`** from `main` on the qm remote, and copy
   `project-seed/adr/` onto it as `adr/`.
3. **Add the submodule** at `governance/qm` pinned to that branch, with
   `branch = project/rad` in `.gitmodules` and the **canonical https remote** —
   never a filesystem path, which is the enabling mechanism behind two of the
   pin failures the org's rollout page records.
4. **Move `adr/` into the submodule** and delete the root copy, closing C11.
5. **Delete `tests/governance.spec.mjs`**, whose only purpose is to enforce the
   drafting discipline while the real ADR lint cannot run.

Until step 3, `.github/workflows/adr-lint.yml` fails by design: it is the verbatim
seed workflow and the lint it invokes lives in the submodule. That failure is this
gap reporting itself, and the workflow is not to be edited to silence it.

### §5 Obligations from the org records

The eight rows `adr/README.md` requires, answered honestly.

| Obligation | State |
|---|---|
| **Baseline component audit** | §6 below. One runtime dependency, one dev dependency |
| **Licence gates, cumulatively** | This project ships no image and one package ecosystem (npm). The npm path is gated by `package-lock.json` plus `reuse lint`, green and blocking since 2026-08-09. There is no SBOM-per-image obligation because there is no image; if a container ever ships, that obligation attaches then |
| **Service inventory** | **None.** `rad` reaches no third-party service at runtime. It is a static file; there is no network call in `index.html`. This row is satisfied by the inventory being empty and by that being verifiable |
| **Quarterly upstream scan** | **Gap.** Not scheduled. With one pinned upstream (`@playwright/test`, MIT) the cost of the gap is low, and low is not zero. Compliance is a scheduled workflow watching the pin's licence file and archive status |
| **Seam protocol named** | §2 table |
| **Control-plane instance record** | **This project has no control plane, and that is the answer.** `rad` is a contract, a vector file and a static page; nothing orchestrates anything. The size smell that would change this: if `index.html` acquires a server, a persistence layer, or any runtime that has to be operated, the seam has stopped being a seam |
| **Risk register** | §7 below |
| **Carried patches registered** | **None.** `package-lock.json` resolves entirely to registry release artifacts — no `git+` URL, no vendored fork, no build-time patch |

### §6 Baseline component audit

| Component | Version | Licence | Runtime path | Disposition |
|---|---|---|---|---|
| `@playwright/test` | 1.55.0 | Apache-2.0 | Dev only — never shipped | Permitted. Replaceable seam (§2) |
| Chromium (via Playwright) | pinned by the above | BSD-3-Clause and others | Dev only | Permitted; test host, not a dependency of the deliverable |
| `ffmpeg` | system, optional | LGPL/GPL depending on build | Dev only, optional | Permitted. Not linked, not distributed, invoked as a process. Its absence degrades a GIF to a still |
| **The deliverable itself** | — | — | `index.html` | **Zero runtime dependencies.** No framework, no CDN, no font, no analytics, no network call |

The deliverable's row is the point of the table: the licence surface of what ships
is empty, which is what makes the open-license record cheap to satisfy here and
expensive to satisfy elsewhere.

### §7 Risk register

| Risk | Likelihood | Consequence | Mitigation |
|---|---|---|---|
| **Vector drift between ports** — two cores, one spec, silently diverging | High, over time | The contract stops meaning anything, which is the whole thesis | Vectors run in every port's own runner; any divergence adds a vector before it changes code |
| **Single maintainer** | Certain today | Ratification is blocked org-wide for the same reason; no bus factor | Named, not mitigated. The corpus's own ratification gate waits on the identical condition |
| **`index.html` growth** — the file is 1,514 lines and every feature adds to it | High | The import-boundary lint stays impossible (C13); review quality falls | The core-extraction draft. The single-file property is the constraint, not the goal |
| **Playwright as the only test runner** | Low | A runner change rewrites the harness | The topic registry is runner-agnostic by construction; `tests/topics.mjs` has no Playwright import |
| **Web MIDI availability** | Medium | The clock's external path is unavailable in Firefox and Safari | Internal clock is the default and is fully functional; MIDI is an enhancement and the UI says so when it is absent |
| **Governance stranded on one disk** | Medium | The exact failure the org's rollout page found in three of nine projects | §4 is written as commands with checks, so the gap is visible rather than assumed closed |

## Consequences

- `rad` is **instantiated rather than improvised**: it carries the machinery and
  names two open conflicts (C11, C13). The corpus distinguishes projects carrying
  governance from those that do not — never compliant from non-compliant.
- Eleven of thirteen conflicts closed on the adopting branch rather than being
  scheduled. That is possible because they were small; it is not the general case
  and should not set an expectation for the next brownfield adoption.
- The zero-dependency deliverable makes most of the open-license machinery
  trivially satisfiable here. This is a property of *this* project's shape and
  transfers to no other.
- Cost accepted: `adr/` at the repository root is the wrong location, and stays
  wrong until a human creates two remote branches. The alternative — waiting to
  write records at all — would have meant adopting nothing.

## Alternatives considered

1. **Wait for the remotes before adopting anything.** Every artifact would be
   correct on the first day it existed. Rejected: the conflicts in §3 were real
   defects shipping to a live Pages deployment, and holding thirteen fixes behind
   two GitHub decisions trades working software for tidy sequencing. The corpus's
   own rollout page makes this argument for running machinery ahead of
   ratification.
2. **Vendor `adr_lint.py` into this repository** so the ADR lint runs today.
   Rejected explicitly by the seed: the lint runs from the submodule so that one
   fix reaches every project on its next pin bump, and a copy is a fifth thing to
   keep in sync. The local stopgap in `tests/governance.spec.mjs` is a test rather
   than a copy of the lint, and §4.5 deletes it.
3. **Keep records in `docs/records/` and describe the deviation.** Rejected: the
   directory name is the smallest part of the model, but `adr/` is what every
   other tool and reader expects, and the eventual move is a `git mv` either way.
   Doing it now makes the remaining gap purely about location.
4. **Treat the reference implementation as ungoverned prototype code.** Rejected:
   it is the artifact the vectors are proven against. An ungoverned reference
   implementation makes "conformant" mean "agrees with whatever the prototype does
   today", which is the failure the contract exists to prevent.

## Revision triggers

- Any step in §4 completes — the record is amended to reflect it, and C11 closes.
- A second implementation of the contract ships, making this project a spec
  provider rather than a spec-plus-implementation. Scope (§1) is then wrong.
- `index.html` acquires a runtime dependency, a network call, or a server —
  §6 stops being nearly empty and the control-plane answer in §5 changes.
- The core-extraction draft is decided either way (closes or entrenches C13).
- A second package ecosystem or a container image enters the project — the
  licence-gate row in §5 becomes two obligations rather than one.
- A third conflict class is found that none of C1–C13 anticipated, suggesting the
  review that produced this table was structurally incomplete rather than merely
  finite.

## Amendments

*None.*
