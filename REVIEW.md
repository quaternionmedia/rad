# Review — `rad` at import (commit `eaefd2e`)

Reviewer's note: every finding below was **reproduced by execution** before it
was written down, per `adr/README.md`'s verification obligations. Where I could
not reproduce something I suspected, it is recorded as *not reproduced* rather
than dropped, because the absence is also information. The reproduction for each
finding is quoted with it.

I am reviewing a prototype that is unusually well built for its stage. The state
machine is genuinely platform-free, the intents-as-data decision is correct and
load-bearing, and the topic registry is a real idea. That is exactly why the
review is blunt: the weak parts are hidden behind confident prose, and confident
prose is the failure mode this corpus exists to catch.

---

## The headline

**The repository claims a governance it has not adopted, and a verification it
does not perform.**

The README's first paragraph says the work is *"Governed by the records in
docs/records under the qm constitution."* At import the repository had no
`LICENSE`, no `REUSE.toml`, no `AGENTS.md`, no `governance/qm` submodule, no
adoption record, and no ADR lint — none of the eight obligations
`project-seed/adr/README.md` enumerates. It was not a QM project that had
drifted; it was a project that had never been forked. By the corpus's own
distinction it was *improvised*, not *instantiated*.

The second claim is narrower and more serious, because it is the claim the whole
design rests on: **"a red test means a stale page never ships."** That guarantee
holds for the deployed Pages artifact and for nothing else. `pages.yml` triggers
only on `push` to `main`, so no pull request is ever verified — the gate fires
strictly after the merge it exists to gate. And because CI regenerates the README
and media into the runner's filesystem and uploads them without ever comparing
them to what is committed, the `README.md` and `docs/media/*` that a human reads
on GitHub can be arbitrarily stale while every check is green. The unified
artifact pipeline record's central promise — *"staleness = redness"* — is
enforced for the audience that reads the website and not for the audience that
reads the repository.

---

## Severity 1 — claims that are not true as stated

### 1.1 The conformance file is not what the reference implementation runs

`conformance/vectors.json` is described by the contract record as *"the
executable half of this record"* and by the README as the artifact ports are
judged against. The page does not read it. `index.html` carries a hand-maintained
inline `VECTORS` object, and the two have **already diverged**:

```
inline copy deep-equals the file: false
equal ignoring trace timestamps:  false
file cases=21 inline cases=21
```

The file's traces carry per-event `t` timestamps; the inline copy dropped them.
Nothing in the repository compares the two. The governed artifact and the
executed artifact are different files, which makes "conformant" unfalsifiable
for the reference implementation itself — the one implementation everyone else
is supposed to be measured against.

*Disposition: fixed.* `conformance/vectors.json` is now the single source;
`scripts/sync-vectors.mjs` generates the inline block from it, and
`tests/conformance.spec.mjs` fails on any drift and replays the **file's** cases
through the page's core rather than the page's copy of them.

### 1.2 "Measured (this run)" contains a hand-typed number

`tests/run.mjs` builds the README's measurement table. Two rows interpolate
values read out of the running page. The first row does not:

```js
| IPA, chord verbs | 1 | 1 |
```

That is a literal in the template string. The unified-artifact-pipeline record
states the rule it breaks in its own words: *"Numbers in docs are measurements.
Any figure a document claims … is read out of the artifact during the run."* The
one number a reader is most likely to check — the headline product metric — is
the one that was typed.

*Disposition: fixed.* IPA is now measured per path and per verb, and the row is
generated. A verb over budget fails the build rather than printing.

### 1.3 The published percentiles are computed from one and two samples

`p95` is called on arrays containing a single element:

```
p95([0.42]) = 0.42   → the README's "Grid jitter p95" is one measurement
```

`quantized-commit` commits exactly one quantized intent, so `meters.jits` has
length 1; `chord-input` yields two TTC samples. The README prints `0.00 ms` and
`0.3 ms` under a column headed **Budget**, which reads as a distribution meeting
a threshold. It is one number wearing a percentile's clothes. The `p95` function
itself is a correct nearest-rank implementation — the defect is the sample size,
not the statistic.

*Disposition: fixed.* The timing topics now drive enough commits for the
percentile to mean something, and `scripts/build-docs.mjs` refuses to print a
percentile derived from fewer than 20 samples — it prints the sample count and
fails instead.

### 1.4 The quantize test passes at five times the governed budget

The contract and the metrics record both set grid jitter at **p95 ≤ 1 ms**, and
the README prints `≤ 1 ms` in the Budget column. The assertion that guards it:

```js
return Math.abs(g.deltaMs) <= 5 ? [] : [`grid delta ${g.deltaMs}ms, budget ≤5ms in CI`];
```

A silently relaxed budget is worse than a missing one: the README advertises the
strict number while the gate enforces a loose one, so the project cannot detect
the regression it claims to be measuring. If 1 ms is unachievable on a CI runner
that is a real finding about the budget and belongs in the record as a revision
trigger — the record even anticipates it ("Grid jitter budget proves unmeetable
on some platform's timer floor"). Quietly testing at 5 ms uses the record's
escape hatch without telling anyone.

*Disposition: fixed, and named.* The suite asserts the record's number. Where a
CI timer floor cannot meet it, the run reports the measured distribution and
fails, rather than passing against a private threshold.

### 1.5 "Accessibility as foundation" is verified by existence checks

The README devotes a section to accessibility and says the `a11y-foundation`
topic verifies it on every run. What that topic actually asserts:

```js
nodes: document.querySelectorAll('.node[role="button"][aria-label]').length,
live:  !!document.getElementById('sr-live') || !!document.querySelector('[aria-live]'),
skip:  !!document.querySelector('.skip'),
```

Three existence checks. None of them exercises the behaviour. The skip link is
the clean demonstration — it exists, and it does not work:

```
after activating "Skip to tour": activeElement is the panel = false, panel tabindex = null
```

`#tour-panel` has no `tabindex`, so following the fragment moves the scroll
position and leaves focus on the link. A keyboard user who takes the skip link
lands nowhere. The test that "verifies" the skip link passes.

Related, and also unmeasured: the page ships **three** competing live regions.

```
3 aria-live regions: ["conf-btn","log","tour-prog"]
```

`#log` is `aria-live="polite"` and receives a child on every single intent, so a
screen-reader user running the tour is read a stream of log entries competing
with the highlight announcements from `#sr-live` (a fourth region, created
lazily). This is a standard anti-pattern and no test looks for it.

*Disposition: fixed.* The skip link now moves focus and is asserted by
activation, not by presence; announcements are consolidated behind one polite
region with the log demoted to `aria-hidden` status text; and `tests/a11y.spec.mjs`
drives the keyboard path end-to-end instead of counting attributes.

### 1.6 The destructive action's label fails contrast

Measured from the shipped tokens:

```
dangerOnWedge:     4.17     ← "Delete", 12px, on the wedge fill
accentInkOnAccent: 4.69     ← highlighted wedge label
inkDimOnSurface:   5.65
inkOnWedge:       13.56
```

WCAG AA for normal-size text is 4.5:1. `--danger` on `--wedge` is **4.17:1**, and
it is the label on the one wedge where misreading is expensive. The highlighted
wedge at 4.69:1 passes by 0.19. The README's accessibility section lists
"Contrast … rules are in the stylesheet, not an afterthought"; there is no
contrast rule in the stylesheet and nothing measures one.

*Disposition: fixed.* Every theme's token set is now contrast-tested in
`tests/theme.spec.mjs` against the surface it is actually painted on, at the AA
threshold for its rendered size, and the palettes were adjusted until they pass
with margin rather than by 0.19.

---

## Severity 2 — real defects in the governed core

These are in the platform-free core, which means every port inherits them and
the conformance vectors bless them.

### 2.1 A press outside the painted ring commits

The ring is drawn to `r1 = 108`. `outFar()` only cancels beyond `r1 × 1.35 =
145.8`. Between those two radii, a press-and-release commits an action the user
never saw a target for:

```
CONFIRMED  press at r=130 (22px outside the painted ring) commits item 1
```

### 2.2 Release-select has no outer bound whatsoever

```
CONFIRMED  release at r=900 (off-screen) commits item 1
```

`up` in tracking mode tests `inRing(r)`, which is `r > r0` with no upper limit. A
finger dragged clear off the menu — a natural "I changed my mind" motion — commits
the last highlighted wedge. The dead-zone cancel is documented and discoverable;
the outward cancel does not exist.

### 2.3 The two commit styles disagree about the same point

```
r= 30  release-select → null   tap-select → null
r= 60  release-select → i1     tap-select → i1
r=120  release-select → i1     tap-select → i1
r=200  release-select → i1     tap-select → null
```

Identical geometry, opposite outcomes, depending on how the menu was opened.
This is a contract gap before it is a code defect: §3 gives release-select
"release outside `r₀` commits" with no ceiling, and tap-select an outside-tap
cancel with one. Nobody chose the asymmetry.

*Disposition for 2.1–2.3: fixed, with the contract amended and vectors added
first.* A single `r_cancel = r1 × 1.35` bound now governs both styles; the
behaviour is specified in `adr/DRAFT-rad-interaction-contract.md` §3 and pinned
by four new cases in `conformance/vectors.json`, following the corpus's
"add a vector first" rule.

### 2.4 The highlight effect is resolved against the wrong ring

`step()` emits effects; `feed()` consumes them *after* `step()` has returned. When
a drag-through crosses the rim, the batch contains a `highlight` effect carrying
an index into the **parent** ring, followed by a `submenu` effect that replaces
the stack. `feed()` then resolves that index against the ring that is current
after the whole batch:

```
parent ring = ["Pin","Neighbors","Color","Hide","Delete"]
crossing the rim on index 2 ("Color") pushes a highlight effect carrying index 2,
but by the time feed() reads it the stack already holds the 5-item swatch ring
announced: [""]  → the label announced belongs to the wrong ring
```

Today it mis-announces. It throws whenever a parented item's index exceeds its
own child count — a two-child submenu on the fourth wedge is enough. Effects that
carry indices into mutable state are the defect; the index is meaningless without
the ring it was computed against.

*Disposition: fixed.* Highlight effects now carry the resolved `label` and `id`
alongside the index, so consumers never re-resolve against post-batch state.

### 2.5 The hub-press-then-drag path highlights and then does nothing

```
CONFIRMED  hub-press then drag to a wedge and release: menu closes, nothing commits
```

In tap-select, pressing in the dead zone latches `pressIndex = 'hub'`. Dragging
outward highlights wedges under the finger — visibly, with haptics — and release
runs `back()`, which closes. The highlight actively lies about what will happen.

*Disposition: fixed*; the highlight is suppressed while a hub press is latched,
and a vector pins it.

### 2.6 The ≤8-item ceiling is normative and unenforced

```
current ring sizes {"node":5,"canvas":4,"selection":5,"hasGuard":false}
```

Contract §1 calls overflow *"a design error, not a scrolling problem."* Nothing
fails when a ninth item is added — the wedges just get thinner than the 44-unit
touch target the same section mandates. A rule with no check is a preference.

*Disposition: fixed*; `resolveMenu` asserts the ceiling and `tests/contract.spec.mjs`
asserts it for every context type the resolver can produce.

### 2.7 `render()` destroys keyboard focus

```
focused node before render(): qm → after: null (activeElement is now <BODY>)
```

`render()` clears and rebuilds every node element on every call, including every
frame of a node drag. The roving-focus contract survives only because the
arrow-key handler calls `focusNode()` again immediately afterwards — a workaround
that documents the problem. Any other path that renders while a node holds focus
drops the user out of the graph silently.

*Disposition: fixed*; `render()` preserves and restores the focused node, and the
arrow-key handler's compensating second call is removed.

---

## Severity 3 — metrics that do not measure what they say

The metrics record is the most ambitious document here, and the meter does not
yet live up to it. This matters more than usual because the record's own thesis
is that *"a metric is a record with a meter"* — the meter is the evidence, so a
sloppy meter invalidates the argument rather than merely the number.

### 3.1 Selection intents bypass the scheduler entirely

```
with Q=beat, a node tap produced: action=select grid=undefined ttc=undefined
```

`pointerup` calls `applyIntent()` directly instead of `dispatchIntent()`. Two
consequences, both silent: selection is never quantized despite the tour stating
*"With Q on, intents are scheduled to the next beat"*, and selection never
contributes a TTC sample — so every latency figure the README prints excludes the
most frequent interaction on the page. The demo driver's `tapNode()` makes the
same call, so the tour cannot reveal it either.

*Disposition: fixed*; all four call sites route through `dispatchIntent()`.

### 3.2 The wheel is handled but never metered

```
before {"l0":1,"l1":0,"k":0.694}  after {"l0":1,"l1":0,"k":0.777}
zoom changed: true   L0 delta: 0   L1 delta: 0
```

(My first attempt at this measurement was wrong — I moved the mouse to position
it and counted the resulting `pointermove` as a wheel event. Re-run with the
pointer settled first, the delta is zero.) The metrics record explicitly says
continuous navigation *"is metered at L0/L1 but not charged to IPA"*. It is
metered at neither.

*Disposition: fixed.*

### 3.3 L2 counts effects, not transitions

`meters.l2 += fx.length` counts emitted effects. The abstraction ledger defines
L2 as *"state-machine transitions"*. One transition can emit two effects
(`highlight` + `submenu`), and a transition that emits none is not counted at
all. The number displayed under `L2` is a different quantity from the one the
record defines, which makes the cross-platform comparison the ledger exists to
enable meaningless at that level.

*Disposition: fixed*; transitions and effects are metered separately.

---

## Severity 3 — the harness

The topic-registry idea is sound and worth keeping. The harness around it is a
single 197-line script doing eight jobs, and it fails in the ways a bespoke
runner fails.

### 3.4 It deletes tracked output before it knows it can regenerate it

Run on this machine, unmodified:

```
REAL exit code of tests/run.mjs: 1
--- damage left behind by that crash ---
     16 D
      7 M
```

`run.mjs` empties `docs/media/` and `docs/guide/` at line 21, before launching a
browser. `ffmpeg` is absent here, so the run crashed at the GIF step and left
sixteen tracked files deleted and seven modified. The exit code is correct; the
working tree is destroyed. A contributor without `ffmpeg` — which nothing
documents as a prerequisite — discovers this by losing their docs directory.

### 3.5 It hardcodes a POSIX path

```
recordVideo: { dir: '/tmp/rmvid' }
```

On Windows this resolves to `C:\tmp\rmvid`, confirmed in the crash output above.

### 3.6 Missing measurements degrade to placeholders instead of failing

The live-truth snapshot is taken with `.catch(() => null)`, and every consumer
defaults: `${meta ? meta.vectorsVersion : '?'}`, `${meta?.vectorCount ?? '?'}`,
`ttcP95 != null ? … : '–'`. If the page throws, the README renders `?` and `–`
**and the build still passes**. This is the same rule as 1.2, failing in the
other direction: a number that could not be measured is printed as a dash rather
than stopping the run.

### 3.7 Failures are reported as one line with no stack

```js
catch (e) { failures = ['harness error: ' + e.message]; }
```

### 3.8 Serial, no isolation reporting, no retries, no trace

Ten topics, one browser, one process, no per-test artifacts beyond the
screenshots the topic chose to take. Playwright's runner supplies all of this and
the project already depends on Playwright.

### 3.9 The CI gate runs after the merge it gates

`pages.yml` triggers on `push: branches: [main]` and `workflow_dispatch`. There
is no `pull_request` trigger, which means the governance model ("everything
arrives as a pull request") and the verification model do not meet. Combined with
no drift check between the regenerated and committed artifacts, and
`npm install playwright` with no version pin or lockfile in the step that gates
the deploy.

*Disposition for 3.4–3.9: fixed.* The harness is now a Playwright project —
`tests/*.spec.mjs` with the registry preserved as `tests/topics.mjs` — and
`scripts/build-docs.mjs` regenerates docs from test artifacts only after the run
succeeds, writing to a staging directory and swapping. `ffmpeg` is optional and
its absence downgrades a GIF to a still with a stated note rather than crashing.
CI gained a `pull_request` trigger, a pinned lockfile install, and a
structural drift gate (`build-docs --check`) that fails when the committed
README or any guide page disagrees with a fresh run. It masks measured values
and excludes screenshots — the first change every run by design, the second
render differently on every OS, and a byte gate over either would fail
permanently and train people to ignore it.

---

## Severity 4 — governance and naming

- **Code cites record numbers that do not exist.** `index.html` carries
  `/* touch-target floor (ADR-002) */` and `/* focus trap (ADR-003) */`. This
  project has no ADR-002 or ADR-003; the numbers belong to a different project's
  records. Numbers are assigned at ratification, and citing an unassigned or
  foreign number in code is the exact failure the numbering discipline exists to
  prevent. *Fixed*: citations are by title.
- **A governed vector's name states the wrong threshold.**
  ```
  name="burst split at gap > 80ms" but time.burstSplitMs=250 and the split gap in the data is 290ms
  ```
  Cosmetic, but it is in the file ports are judged by. *Fixed.*
- **Records live at `docs/records/`,** which is not where the corpus puts project
  records. They belong in `adr/`, on a `project/rad` branch of the qm repo,
  reached through a `governance/qm` submodule. *Restructured to `adr/`; the
  submodule step is human-only and is named in the adoption record.*
- **Record status is `Draft`** in a table shaped differently from
  `project-seed/adr/TEMPLATE.md`. *Fixed to the template's header shape.*
- **The name.** The artifact called itself `radial-menu` in the README title, the
  page title, the header, the workflow name, and as a node inside its own demo
  graph. It is now `rad` throughout.

---

## What I checked and did **not** find

Recording these because a review that only lists problems tells you nothing about
coverage.

- **The chord vocabulary is genuinely prefix-free.** All sixteen words check out,
  so the "commits on its last keystroke" claim holds today. But nothing asserts
  it: adding `de` alongside `del` would silently reintroduce the 250 ms wait and
  every TTC number would quietly get worse. *A vector now asserts it.*
- **`angleToIndex` is correct**, including the wrap case the vectors probe at
  269.9°.
- **IPA accounting for the pointer path is right.** `pointerdown` charges one
  input and `pointerup` charges none, so a press-drag-release envelope costs
  exactly 1, matching the record's definition. The chord refund arithmetic is
  also correct.
- **`p95` is a correct nearest-rank implementation** — index 18 of 0..19 for
  n=20. The problem in 1.3 is the sample size, not this function.
- **No page errors** during any interaction I drove, across ten topics and the
  additional paths above.
- **The `release-select` IPA assertion is a real test.** `it.cost !== 1` checks
  the product's headline metric against its budget through the real code path. It
  is the strongest test in the original suite and the model the rest now follow.
- **I could not reproduce a suspected submenu mode-leak.** I expected
  drag-through to leave `mode` inconsistent such that release committed the wrong
  item; it does not — `enterSub` clears the highlight, so a release without an
  intervening move correctly cancels. Recorded as not reproduced.

---

## Found by the new tests, after the review was written

Three defects that no reading produced. They are listed separately because
their provenance is the point: each was found by an assertion written to check
a *documented property*, and none of them was visible in the code.

### A stale selection crashed the chord adapter

`tests/metrics.spec.mjs` drives the entire chord vocabulary in sequence. Four
words in, it stopped committing. `hide` and `delete` remove nodes and prune the
selection, but `select-neighbors` on an empty target ran
`store.selection.add(undefined)` — so the *next* chord's `chordContext()` did
`store.nodes.get(undefined).x` and threw, ending the burst silently. Two fixes:
`select-neighbors` with no target is a no-op rather than a corrupt selection,
and `chordContext()` resolves the selection against the store instead of
trusting the set.

Nobody would have hit this by hand. It needs a specific four-verb sequence, and
the failure is a silent stop rather than an error the user sees.

### The grid-jitter budget was measuring the commit queue

The first honest measurement of `p95 ≤ 1 ms` failed at **4.9 ms**, and still
failed at **2.0 ms** after the scheduler was improved. Before relaxing anything,
I measured whether it was the machine or the design:

```
grid=62.5ms  click gap=30ms   n=30  intents sharing a grid point=25  p95=2.800ms
grid=250.0ms click gap=300ms  n=24  intents sharing a grid point=0   p95=0.000ms
```

Neither. **Several intents quantized to the same instant serialize by
construction** — the second waits on the first's application — so their measured
"jitter" is the commit queue's cost, not the scheduler's. The budget was always
about one intent per grid point; nothing had ever said so, and my first test
cheerfully mixed the two and would have justified relaxing a budget that was
correct.

The contract now states the qualification, and the test asserts that no two
intents shared a grid point — so it cannot silently drift back into measuring
the wrong thing. The scheduler improvement is kept on its own merits: the coarse
timer is re-armed on each hop rather than trusted once, because a spin cannot go
backwards and a single overshoot costs the whole budget.

### The touch-target floor lost a specificity fight

`button.chip { min-height: 44px }` under `(pointer: coarse)` was outranked by
`#tour-panel .t-head button { min-width: 34px }`, so the two icon-only chips
(`×` and `■`) were **35 × 44** — a 44px-tall box that is not a 44px target. The
rule existed, was correct, and did not apply. This is the same failure mode as
the skip link: the artifact was present and the behaviour was absent.

Also worth recording as method: the first version of the chord test asserted
that all sixteen bursts were classified as *chorded*. That assertion measures
**CDP keystroke delivery**, not the product — inter-key gaps have to stay under
`chordGapMs` (30 ms), which the harness cannot guarantee under parallel load. It
now asserts what the product owns (every word resolves to its verb, every
chorded burst costs 1) and treats classification statistically. A test that
fails for reasons the code cannot control teaches people to ignore it.

## The one structural recommendation

Everything above is fixable and most of it is fixed on this branch. The
structural issue is not on the list because it is not a defect:

**`index.html` is 1,514 lines holding a platform-free core, a conformance runner,
an application store, an SVG renderer, four input adapters, a motion library, a
demo driver, and a tour.** The contract record requires the core to be
platform-free *"enforced by a grep lint in CI"*, and that lint cannot exist while
the core is a comment header inside a file that also calls `document`. The
single-file property is genuinely valuable — it is why the demo has zero
dependencies and runs from `file://` — so the answer is not to give it up. It is
to make the single file a **build output** of a small `core/` directory, so the
import boundary the record demands becomes mechanically checkable and the core
becomes unit-testable in Node without a browser.

I have not done this, because it is a larger change than the mandate I was given
and it deserves its own record and its own review. It is drafted as
`adr/DRAFT-rad-core-extraction.md` with status `Proposed`, pending your decision.
