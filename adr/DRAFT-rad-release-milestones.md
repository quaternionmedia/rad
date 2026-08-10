# DRAFT — rad release milestones

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-08-09 |
| **Pends on** | the scope of the org-wide authentication/authorization effort, which fixes what §3.4 must deliver |
| **Principle** | P6 decisions documented; P8 systems over heroics |

## Context

`rad` has no version. It has a number — `0.3.0` sat in `package.json` and a tag
had never been cut — which under the org's *version tags are claims* record is a
claim nobody made. That record settles what a tag asserts and who may create
one. It deliberately does not settle what any particular project's releases are
*for*, and without that a version line degrades into a counter.

This project's releases have an obvious organising principle available, because
`rad` is a contract before it is an implementation: **a contract is only proven
by something that consumes it.** Its own suite can show the reference
implementation agrees with its own vectors. It cannot show that the contract
survives a host nobody on this project controls, or a platform with a different
gesture stack. Each of those is a different kind of evidence, and each arrives
with a named consumer.

So the milestones are ordered by the class of proof they carry, not by feature
count.

## Decision

### §1 Two version lines, never conflated

| Line | Where | Increments when | Today |
|---|---|---|---|
| **Product** | git tags `vMAJOR.MINOR.PATCH`, mirrored in `package.json` | a release is cut per §2 | **`0.0.0` — unreleased** |
| **Vectors** | `conformance/vectors.json` `version` | the executable contract changes | `0.3.0` |

These are different numbers about different things and they will not converge.
The vector line is the one the contract tells implementations to pin — "an
implementation pins the vector version it claims" — and it moved three times
before any release existed, which is correct: the contract was being written.
The product line starts at zero because nothing has been released.

`package.json` is set to `0.0.0` and stays there until a human cuts `v0.0.1`.
An unreleased package advertising `0.3.0` is the failure the org record
describes: a number asserting whatever the reader assumes.

### §2 What a `rad` tag asserts

`rad` adopts *version tags are claims* in full. Org records bind; a project may
tighten and may not relax. Two tightenings:

**§2.1 The deterministic gate is named, and it is not the whole suite.**
`npm run gate` is the automated validation a tag may rest on. It runs every
test that does not read a wall clock, with no retries, and
`scripts/check-gate.mjs` then reads the run's own report and fails on any skip,
rerun, flake, or empty result. The org record requires CI to fail a release
build reporting those; this makes it a script rather than a property of a
config file, because a config is a claim about a file and a report is evidence
about a run.

**§2.2 Measurements are published and claim nothing.** `npm run measure` runs
the latency budgets — TTC and grid jitter — alone, on one worker. They read a
clock, so under §3 of the org record they contribute nothing to a release
claim, and they are still the numbers the README prints and the metrics record
exists for. A tag annotation reports them as measurements and does not offer
them as validation. Stating this is the point: the same suite measured grid
jitter p95 at 0.0 ms and 1.8 ms depending only on how many browsers shared the
CPU.

**§2.3 The annotation names the consumer.** Every `rad` tag from `v0.0.2`
onward names the consuming project that proves it, and the commit in that
project which does so. A milestone whose consumer has not shipped is not
claimable, however finished `rad` itself looks (§4).

### §3 The milestones

Each names the class of proof it carries, what discharges it, and what it
explicitly does not claim.

#### v0.0.1 — fully tested and human-reviewed

**Claim:** the reference implementation agrees with its own contract, a human
has reviewed the whole of it, and a human has driven it on real hardware.

**Proving consumer:** `rad` itself. This is the only milestone where that is
sufficient, and it is sufficient because the claim is correspondingly narrow.

**Discharged by:**
- `npm run gate` green and deterministic — **met**: 259 tests, no skips, no
  retries, no flakes.
- `conformance/vectors.json` replayed against the page core, and the inline
  block in sync with it — **met**.
- Human review of the change set — **outstanding**, and it is the substance of
  this milestone rather than a formality: `REVIEW.md` is one reviewer's reading
  of the work, not a second reader's reading of the review.
- Human manual testing against the real runtime — **outstanding**. For `rad`
  that means a touch device and a real chorded keyboard: long-press,
  release-select, drag-through, dead-zone cancel and the outward cancel at
  `r_cancel`, each on glass. The CI runner emulates touch; it does not have a
  finger, and the gesture grammar is the deliverable.
- Ideally an external MIDI clock and a CC controller, since the tempo axes are
  specified against them and are tested only against synthesised messages. If
  that hardware is not available the annotation says so — an honest weak
  release rather than a blocked one.

**Does not claim:** that the contract is implementable elsewhere. One
implementation cannot demonstrate platform neutrality, and the vectors passing
against the code they were written beside is the weakest form of the evidence
this project exists to produce.

#### v0.0.2 — the integration standard, and two implementations of it

**Claim:** the contract survives contact with hosts `rad` does not control.

**Proving consumers:** **apothecary** and **benchmark**.

**Discharged by:**
- An **integration standard** that does not yet exist and is the real
  deliverable of this milestone: how a host mounts `rad`, supplies a
  `MenuContext`, receives `Intent`s, and routes them through its own state
  layer without the menu touching the scene. The contract already forbids the
  menu mutating anything; it says nothing about the seam a host attaches to.
- That standard implemented in **both** hosts. Two rather than one because the
  org's own second-data-point rule applies: one integration is an anecdote and
  cannot distinguish "the standard works" from "the standard fits apothecary".
- Each host replaying `conformance/vectors.json` in its own runner, pinning the
  vector version it claims.
- At least one divergence found by a host and captured as a **new vector**
  before any code changed. A standard that survives two integrations with no
  vector added has probably not been integrated hard enough, and the run that
  produces no finding is itself worth recording.

**Does not claim:** anything about non-web platforms. Both consumers are web.

#### v0.0.3 — the first non-web platform

**Claim:** the contract is platform-neutral in fact rather than by assertion.

**Proving consumer:** **qmetronome** (Android, Compose).

**Discharged by:**
- A Kotlin port of the core passing the same `conformance/vectors.json` in
  JUnit — the whole thesis of the contract, tested for the first time by
  something that shares no runtime code.
- The import-boundary lint the contract's Conformance clause requires, running
  in CI on both sides. **This milestone forces the open question in the *rad
  core extraction* draft**: that lint cannot exist on the web side while the
  platform-free core is a comment banner inside a file that also calls
  `document`. `v0.0.3` cannot be claimed with `C13` open, so the decision
  falls due here at the latest.
- The behavioural checklist the vectors cannot express — 44-unit targets,
  keyboard path, screen-reader labels, dead-zone cancel — verified on a device.
- qmetronome acting as MIDI clock master with `rad` following, which is the
  first test of the tempo axes against a clock this project did not write.

**Does not claim:** that the two implementations *feel* alike. Vectors govern
semantics, not feel, and this project has said so from the start; the
milestone's annotation states the boundary rather than eliding it.

#### v0.0.4 — authentication and authorization

**Claim:** `rad` resolves a menu that is correct for *who is asking*.

**Proving consumer:** to be named — part of a larger org-wide effort.

**Status of this milestone: genuinely undecided, and this record does not
decide it by stealth.** What is settled is that it covers at least three
things, which are not variations on one another:

| Strand | What it implies for `rad` |
|---|---|
| **Host-supplied identity** | `MenuContext` grows a capability set, and the resolver *omits* verbs the caller may not perform. An unauthorised verb is absent from the ring, never present-and-disabled — a disabled wedge still spends a wedge and still tells the user the verb exists |
| **Collaborative mode** | Intents cross a wire. They are already serializable data, which is why the "no closures" decision pays here, but ordering, conflict and identity-of-origin are all unspecified |
| **Offline local-LAN mode** | Peers with no internet and no central authority. This is the strand least served by an ordinary auth design and most likely to dictate the shape of the other two |

**Consequence that must be stated before the work starts:** collaborative and
LAN modes **end `rad`'s no-service property**. The adoption record's §5 answers
"none" to the service inventory and "no control plane" to the control-plane
obligation, and both answers are true only while the deliverable is a static
file that makes no network call. Reaching this milestone reopens both, plus the
licence-gate row, which currently has one package ecosystem and no image. That
is not an objection; it is the bill, and it should be read before the first
line is written.

**Does not claim:** any particular auth protocol. Whatever is chosen is reached
over a named seam and answers the replaceability test, per the org's
seams-on-standard-protocols record.

#### v0.0.5 — the native application

**Claim:** `rad` works where there is no browser at all.

**Proving consumer:** a native shell — Compose Multiplatform is the cheapest
leg, since `v0.0.3` will already have produced `:radialmenu:core`, but the
milestone is about the *class* rather than that toolkit.

**Discharged by:** the core reused unchanged from the Android port, a native
renderer, vectors green in the platform's own runner, and invoke bindings that
differ from touch — right-click and hover rather than long-press — which is the
first time the contract's two commit styles are exercised by a platform whose
primary pointer is not a finger.

**Does not claim:** feature parity with the web reference. The web build
carries the tour, the meters and the conformance runner; a native shell is not
obliged to.

### §4 A milestone is claimed when its consumer ships

`rad` being ready is not the milestone. `v0.0.2` is claimable when apothecary
and benchmark have shipped the integration, not when `rad` has published a
standard for them to adopt. The version line therefore measures **proof
accumulated**, and the honest consequence is that `rad` may sit at `v0.0.1`
while a great deal of work happens in it. Intermediate artifacts use
pre-release identifiers — `v0.0.2-rc.1` — which the org record already provides
for exactly this.

### §5 What these numbers do not promise

All of `0.y.z`. Semver already permits any break at any time below `1.0.0`, and
nothing here narrows that. The diligence the org record requires is identical
at `v0.0.1` and `v4.2.0`; only the compatibility promise differs, and below 1.0
there is none. `1.0.0` is not scheduled and is not this record's business.

## Consequences

- The version line becomes a statement about evidence rather than about effort,
  and the gap between "finished" and "proven" becomes visible instead of
  arguable.
- Two milestones create work that does not exist yet: the integration standard
  (`v0.0.2`) and the core extraction the import-boundary lint needs
  (`v0.0.3`). Naming them here is the point — both were implicit and neither
  was scheduled.
- `v0.0.4` reopens three obligations the adoption record currently answers with
  "none". Accepted, and written down before the work rather than discovered
  during it.
- The suite is now split into a gate and a set of measurements. Cost accepted:
  two commands where there was one, and a standing invitation to move an
  inconvenient test out of the gate. The mitigation is that `check-gate.mjs`
  reports the count, so a shrinking gate is visible in every run.
- Cost accepted: `rad` may sit at one version for a long time. A version line
  that only moves when someone else's project ships is not a progress
  indicator, and should not be read as one.

## Alternatives considered

1. **Version by feature completeness** — increment when `rad` gains a
   capability. Rejected: it is the reading that produced an unreleased
   `0.3.0`. For a project whose deliverable is a contract, "we added a thing"
   is precisely the claim that cannot be checked, and the number would move
   fastest when the least was proven.
2. **Version by vector version** — one number for both lines. Rejected: the
   vectors move when the contract is edited, which is most frequent when
   nothing is proven, and implementations pin the vector version they claim.
   Collapsing them makes "pinned to 0.3.0" ambiguous between a contract and a
   release.
3. **Start at `v0.1.0` and treat the existing `0.3.0` as real** — cheaper, no
   reset. Rejected: it preserves a number no tag ever asserted, which is the
   defect rather than an inconvenience.
4. **Milestones by date** — a quarterly train. Rejected: it decouples the
   version from evidence entirely, and the whole argument here is that a
   version tag is the one signal that leaves the org and reaches someone who
   cannot see how it was made.
5. **Let `rad` tag when it is ready and let consumers tag their own
   integrations** — the conventional split. Rejected for this project
   specifically: a contract that tags itself as proven before anything consumes
   it is asserting the exact thing it cannot know, and this project's whole
   claim is that the seam is real.

## Revision triggers

- The org's auth/auth scope is settled — `v0.0.4` gains a decided §3.4 and this
  record moves to Draft, or splits if the three strands prove to be three
  milestones.
- A consumer named here is cancelled or replaced, or a fourth host wants to be
  the proving instance for `v0.0.2`.
- `v0.0.2` completes with no vector added by either host — the integration was
  not adversarial enough, or the vectors already cover more than expected.
  Either reading is worth recording.
- The core-extraction question is decided before `v0.0.3` needs it, releasing
  the dependency in §3.3.
- A measurement in `npm run measure` becomes deterministic enough to join the
  gate, or a gate test is found to read a clock — §2.1's split is wrong in one
  direction or the other.
- Someone proposes tagging a milestone whose consumer has not shipped. §4 is
  the clause most likely to be argued with, and the argument is the signal.

## Amendments

*None.*
