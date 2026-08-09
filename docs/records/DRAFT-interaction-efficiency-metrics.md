# DRAFT — Interaction efficiency metrics (IPA, abstraction ledger, systemization index)

| Status | Draft |
|---|---|
| Date | 2026-08-08 |
| Pends on | DRAFT-radial-menu-interaction-contract |
| Principle | P6 decisions documented; P9 minimal legible deliverables |

## Context

"Clicks per action" is the driving product metric for the radial menu and the
graph tooling around it. Without a shared definition it degrades into advocacy —
every implementation counts its own way. And a per-component metric says nothing
about whether the org is *systemizing*: the same verb should not cost 1 input in
one project and 4 in another, or exist in one project's vocabulary and not its
siblings'.

## Decision

### 1. IPA — inputs per action (the driving metric)

One **input** is one discrete act the user must initiate:

- one pointer **down…up envelope** (a tap, a click, a press-drag-release — a
  continuous gesture counts **1**, however long it tracks);
- one **keystroke**;
- v0 exclusion: continuous camera navigation (wheel, pinch, pan) is metered at
  L0/L1 but not charged to IPA. *Open question — targeting cost is real; revisit.*

**IPA(verb, path) = inputs from idle to committed intent.** Measured at the L3
boundary (below), so it is comparable across platforms by construction.

Budgets (normative for the radial menu):

| Path | Budget |
|---|---|
| Primary verb, release-select | **1** |
| Primary verb, tap-select | ≤ 2 |
| Submenu verb, release-select (drag-through) | **1** |
| Submenu verb, tap-select | ≤ 3 |
| Any verb, keyboard | ≤ 1 + ⌈N/2⌉ + 1 |

A verb over budget is a **resolver design error** (the mirror of the ≤8-item
rule): restructure the menu, don't relax the number. Budgets are claims;
each implementation's meter is the evidence. Conformance vectors gain an
optional `expectCost` field when this record is ratified.

### 2. Abstraction ledger (tracking function abstraction level)

Every implementation meters five levels and must reconcile at L3:

| Level | Unit | Owned by |
|---|---|---|
| L0 | raw platform events (pointermove, MotionEvent) | platform |
| L1 | recognized gestures (tap, long-press, drag, pinch, key) | input adapter |
| L2 | state-machine transitions | shared core |
| L3 | **committed intents** — the metric boundary | contract |
| L4 | workflows (named intent sequences, e.g. "prune subtree") | host app |

Rules: platforms may differ freely at L0/L1; L2 is vector-governed; **all
cross-platform and cross-project comparison happens at L3**; L4 is where future
macro/automation work attaches (an L4 workflow that recurs is a candidate for a
new L3 verb — that is the promotion path, and it lowers IPA by definition).
Code review heuristic: a function is misplaced when it reads two levels at once
(the legacy menu's `d3.selectAll` inside action handlers was an L3 function
doing L0 work).

### 3. Systemization index (across projects)

For each verb in the shared vocabulary, over the org's surfaces (radial menu,
keyboard/interaction profiles, CLI, REST API, MCP tools):

**SI(verb) = surfaces bound to the shared vocabulary ÷ surfaces implementing the
capability.**

- SI = 1: fully systemized; the verb means one thing everywhere.
- SI < 1: drift — some surface reimplements the capability outside the
  vocabulary. That surface is the work item, not the index.
- The verb table lives in the governance corpus (g0) and is append-only like
  record numbers; retiring a verb is an amendment.

### 4. Speed — TTC and grid jitter (companions to IPA)

IPA counts acts; these two count time. Both are metered at the same L3
boundary, so they compose with IPA rather than competing with it:

| Metric | Definition | Budget |
|---|---|---|
| **TTC** | committing input's timestamp → intent applied | p95 ≤ 16 ms unquantized |
| **Grid jitter** | \|actual commit − scheduled grid time\| when quantized | p95 ≤ 1 ms |
| Tempo lock | estimated BPM vs clean external MIDI clock | ±0.5 BPM |

Chords hit the floor of both metrics at once: a chord is 1 input (IPA floor),
and because the chord vocabulary is prefix-free, recognition finalizes on the
last keystroke — no window wait, so chord TTC ≈ key-event delivery time. The
250 ms burst-split window is charged only to unknown or partial words. That is
the shape of "consistent complex quick input": constant per-verb cost, near-zero
fixed latency, no menu traversal variance.
Quantized commits report `deltaMs` per intent; deliberately waiting for the
grid is not latency, so quantized TTC is reported separately from unquantized.

### 5. Reporting

Implementations expose the ledger, IPA, TTC, and jitter live (the prototype
HUD is the reference meter: `L0/L1/L2/L3 · IPA last/mean · ttc p95 · grid jit
p95`, with per-intent cost, input surface (⚡ chord / ⌨ typed), and grid delta
on each log entry). Releases claiming this record's budgets include measured
values per verb — version-tags-are-claims applied to interaction cost and
timing.

## Consequences

- IPA is comparable across Android/web/desktop because it is defined at the
  contract boundary, not at the widget.
- Systemization becomes measurable and its drift enumerable, instead of a
  sensibility.
- The meter adds a small fixed cost to every input adapter; accepted.

## Alternatives considered

- **Time-to-action for *reaching* the input (reach + think time)** — device-
  and user-dependent, unfalsifiable in CI; excluded. TTC deliberately starts at
  the committing input, which *is* mechanically measurable, so it earned a
  budget (§4) where whole-motion timing did not.
- **Fitts's-law modeling** — predictive, not observational; premature.
- **Counting all events (moves included) as cost** — punishes continuous
  gestures, which are the design's whole advantage.

## Revision triggers

- Two verbs blow budget for the same structural reason (the budget table, not
  the resolvers, is wrong).
- Targeting/navigation cost demonstrably dominates real sessions (revisit the
  v0 exclusion).
- Error rate (mis-chords, wrong-wedge commits) is proposed as a metric —
  decide whether this record generalizes or splits.
- The prefix-free vocabulary rule stops scaling (a needed verb forces a prefix
  collision), or real CharaChorder traces show back-to-back chords landing
  inside one 30 ms gap — retune the thresholds against device data.
- SI table exceeds ~40 verbs (vocabulary bloat is itself an IPA failure).
