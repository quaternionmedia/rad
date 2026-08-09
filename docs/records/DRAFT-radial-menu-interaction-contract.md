# DRAFT — Radial menu interaction contract

| Status | Draft |
|---|---|
| Date | 2026-08-08 |
| Pends on | house-stack, seams-on-standard-protocols, perspective: mobile-cross-platform-governance |
| Principle | P3 seams on standard protocols; P6 decisions documented; P9 minimal legible deliverables |

## Context

QM needs a radial menu for direct graph manipulation across Android native, modern
web, and desktop native, with legs for iOS and embedded surfaces. One
implementation already exists (`codecartographer/web/.../radial_menu.ts`) and has
known defects: no keyboard navigation, actions expressed as closures bound to one
renderer, mutations that bypass application state, stubbed edge actions. qmetronome
is the org's only other client-device project; its retrospective perspective
explicitly waits on "a second cross-platform project as the confirming data point."
This component is that data point.

The cross-platform trap is sharing *code*. The org's doctrine (build the seam, buy
the engines; replaceability test) points the other way: share a **contract**, let
each platform implement it natively. The contract — not any implementation — is the
governed artifact.

## Decision

The radial menu is defined by three platform-neutral artifacts. An implementation
is conformant iff it satisfies all three. Nothing else about it is governed.

### 1. Menu model — items are data, actions are intents

```
MenuItem   { id, label, icon?, enabled = true, destructive = false, children?: MenuItem[] }
MenuContext{ type: node | edge | canvas | selection, targetIds: string[], position: {x, y} }
MenuSpec   { items: MenuItem[] (1..8), title? }
Intent     { action: string, context: MenuContext, itemId: string }
```

- A pure **resolver** `resolve(context) → MenuSpec` builds the menu per context
  type. Item construction is data manipulation (conditional spread), never
  post-filtering of a master list.
- Committing emits an `Intent`. The menu **never mutates the scene**. Hosts route
  intents through their authoritative state layer (Meiosis actions on web,
  engine command methods behind `StateFlow` on Android). Action names are strings,
  matching `interaction_profiles.ts` bindings, so triggers and menu items share one
  action vocabulary.
- Maximum 8 items per ring. Overflow is a design error, not a scrolling problem:
  the resolver must group into a submenu.
- Standard graph-manipulation vocabulary (hosts may extend, not repurpose):
  - **node**: `pin`, `hide`, `delete`, `expand`, `collapse`, `select-neighbors`, `color:*`
  - **edge**: `delete`, `reverse`, `edit-label`
  - **canvas**: `add-node`, `fit`, `relayout`, `toggle-physics`
  - **selection**: `hide`, `spread`, `cluster`, `delete`

### 2. Geometry — one polar convention

- Angle origin **−90° (12 o'clock), clockwise**, matching qmetronome. With N items,
  item *i* is **centered** at `−90° + i·(360/N)`; its wedge spans ±180/N around
  that. `angleToIndex(θ, N) = round(norm(θ + 90) / (360/N)) mod N` — a pure
  function shared by the conformance vectors.
- Radii in density-independent units: dead zone `r₀ ∈ [28, 40]`; ring band
  `r₁ − r₀ ≥ 56` so every wedge at N=8 exceeds a 44-unit touch target at mid-band
  (benchmark ADR-002). Clamp the whole ring to the viewport by shifting the center
  inward, never by shrinking below minimums (qmetronome safe-radius lesson).
- Submenus **replace the ring in place** (parent label in the hub, back affordance =
  hub tap / inward move / Escape / Back). No nested popovers.

### 3. Interaction — one state machine, two commit styles

States: `CLOSED → PENDING → OPEN → TRACKING → (SUBMENU→OPEN…) → COMMITTED | CLOSED`

- **Invoke**: touch long-press (350 ms, ≤10 unit slop), pointer right-click /
  secondary, keyboard `m` on focused element. Long-press must fire while the finger
  is still down.
- **Release-select** (touch-first): the invoking press continues — moving past `r₀`
  highlights `angleToIndex(θ)`; release outside `r₀` commits, release inside `r₀`
  cancels. One continuous gesture, no second tap.
- **Tap-select**: menu opens idle; hover/move highlights; tap/click a wedge
  commits; outside-tap or Escape cancels.
- **Submenu entry**: commit on a parented item enters SUBMENU; in release-select,
  crossing `r₁` outward on a parented wedge also enters it (finger stays down).
- **Keyboard**: Left/Right (or Up/Down) rotate the highlight ±1; Enter commits;
  Escape backs out of a submenu, then closes. Every item exposes `label` to the
  accessibility tree; highlight changes are announced; highlight change on touch
  emits a light haptic where the platform has one.
- Highlight changes are edge-triggered (fire once per index change) — required for
  haptics and announcements.

### 4. Expert input — chords are the same vocabulary

The menu is the *discoverable* surface; it is not the fast one. For consistent
complex quick input, implementations may bind **chords** — CharaChorder-class
devices, or any multi-key press emitting a word — directly to action strings:

- A chord adapter is an **L1 gesture recognizer**: it buffers key events,
  splits bursts at >250 ms gaps, and classifies a burst as *chorded* when every
  inter-key gap ≤30 ms (machine-fast; CharaChorder emits whole words this way
  over plain HID — no driver, no special transport). The same word typed slowly
  still resolves, flagged `typed`. **The chord vocabulary must be prefix-free**;
  an exact match therefore finalizes on its last keystroke — recognition adds
  zero latency to a known word, and the split window only delays unknowns.
- Chord words map to the **same L3 verbs** the resolver uses — never to private
  functions. Rule: *every chord-bound verb must also be reachable in the menu*
  (the menu is the superset; chords are accelerators). This is the
  systemization index enforced structurally: SI(verb) can't drop below the menu
  surface.
- Targets: chords act on the current selection (selection → node → canvas
  fallback). Select with one surface, act with another — that composition is
  the "complex quick input" path.
- IPA accounting: a chorded burst is **one input** regardless of word length;
  IPA(any verb, chord) = 1 by construction. Unrecognized bursts are refunded,
  not charged.
- Deeper CharaChorder integration (its serial API, chord-id events) is an
  *engine selection* behind the same adapter seam; HID words are the portable
  baseline.

### 5. Time — timestamped intents, quantized commits

Graph manipulation in live contexts (ShowRunner, qmetronome's world) needs
intents that land **on time**, not merely fast.

- Every intent carries `t` (high-resolution platform timestamp of its
  committing input) and, when quantized, `grid: { beat, deltaMs, bpm, src }`.
- **Clock sources**: an internal metronome, or **MIDI clock** (24 PPQN `0xF8`
  ticks; `0xFA` resets phase). Tempo is the **median inter-tick period** over a
  sliding window (robust to USB jitter); the beat phase re-anchors on every
  24th tick. Web MIDI / Android MIDI timestamps share the platform's
  high-resolution clock, so no cross-clock translation is needed.
- **Quantize policies**: `off | next-beat | next-bar` (`nearest` defined for
  step-editing surfaces). The scheduler commits at `max(now, gridT)` — a
  coarse timer to ~2 ms early, then a sub-millisecond spin.
- **Budgets**: unquantized input→commit (TTC) p95 ≤ 16 ms (one frame);
  quantized grid jitter |commit − gridT| p95 ≤ 1 ms; tempo estimate within
  ±0.5 BPM of a clean external clock. Meters are mandatory (see the
  interaction-efficiency-metrics record).
- The state machine remains time-free except `longPressMs`; clocks and
  schedulers live beside the core, not inside it, and are pure-function
  testable (`quantizeTime`, `estimateBpm`).

### Conformance

`conformance/vectors.json` (v0.2.0) is the executable half of this record:
interaction traces (down/move/up/key events with polar coordinates and
timestamps → required highlight sequence and outcome) plus pure suites for
`quantizeTime`, `estimateBpm` (median over jittered ticks), `classifyBurst`,
and `splitBursts`. A conformant implementation:

1. runs every vector against its own state machine and geometry in its native test
   runner (Vitest/pure TS on web, JUnit/pure Kotlin on Android) and passes;
2. keeps state machine + geometry in a **platform-free core** (no DOM, no
   `android.*` imports), enforced by a grep lint in CI (qmetronome's import-boundary
   pattern);
3. passes the behavioral checklist: 44-unit targets, keyboard path, screen-reader
   labels, dead-zone cancel, ≤8 items.

Vectors are versioned with semver; implementations pin the vector version they
claim (version-tags-are-claims). Changing a vector is amending this record.

## Consequences

- Platforms ship idiomatic UIs (Compose arcs, SVG wedges) with zero shared runtime
  code; what is shared is small, legible, and testable — the seam.
- The existing codecartographer menu becomes the first *non-conformant legacy*
  implementation; migration = adopting the core + routing intents through
  `graph_actions.ts` (fixing its known state-bypass defect).
- Adding a platform costs one state-machine port + one renderer, judged by the
  same vectors — no cross-platform framework dependency enters the house stack.

## Alternatives considered

- **Kotlin Multiplatform / Flutter / React Native shared UI** — buys code sharing at
  the price of a permanent out-of-house-stack dependency on every platform at once;
  fails the replaceability test (the framework becomes the seam).
- **Web view embedded in native shells** — fastest, but long-press/haptics/scroll
  interop is exactly where radial menus live; qmetronome shows native gesture
  quality is the point of going native.
- **Share the existing radial_menu.ts contract as-is** — its callbacks-as-closures
  shape is unserializable and renderer-bound; rejected in favor of intents-as-data.

## Revision triggers

- A third commit style (e.g. dwell-select for accessibility) is requested.
- Any implementation needs >8 items after honest grouping.
- A chord surface needs a verb the menu can't reasonably hold (breaks the
  menu-as-superset rule — decide whether the rule or the vocabulary bends).
- A clock source that isn't MIDI-shaped (Ableton Link, LTC/SMPTE) is requested
  — the grid abstraction should absorb it; if it can't, amend.
- Grid jitter budget proves unmeetable on some platform's timer floor.
- Vectors fail to catch a divergence users notice (add a vector; if the format
  can't express it, amend).
- A second component adopts the contract-plus-vectors pattern (promote the pattern
  itself to an org record).
