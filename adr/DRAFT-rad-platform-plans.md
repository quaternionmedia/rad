# DRAFT — rad platform implementation plans

| | |
|---|---|
| **Status** | Draft |
| **Date** | 2026-08-09 |
| **Pends on** | the *rad interaction contract* draft |

## Context

The *rad interaction contract* draft fixes what an implementation must do; it
deliberately says nothing about who builds what, in which order, or against
which host. Two hosts already exist and pull in different directions:
codecartographer is a live web application with a graph surface and a legacy
radial menu carrying known defects, and qmetronome is the org's only shipped
client-device project and owns the MIDI and timing ground this component needs.
Without a stated order, both get started, neither gets finished, and the first
port becomes the de-facto spec — which is exactly what the contract exists to
prevent.

This record is the plan. It binds sequencing and per-platform architecture; it
does not restate the contract, and where the two disagree the contract wins.

## Decision

Order of work: **modern web first** (host exists: codecartographer), **Android
second** (idioms exist: qmetronome), desktop and iOS as legs.

### 1. Modern web (first)

**Shape.** One framework-free TS package, two layers:

```
rad/
  core/        geometry.ts, machine.ts, resolve.ts   ← platform-free, vector-tested
  dom/         svg_view.ts, pointer_adapter.ts, keyboard_adapter.ts
```

- `core/` is pure functions + a reducer-style state machine
  (`step(state, event) → [state, effects]`). Vitest runs `conformance/vectors.json`
  directly against it. Grep lint: `core/` may not mention `document|window|HTMLElement`.
- `dom/` renders SVG wedges (`d3.arc`-style path math hand-rolled — no d3 runtime
  dependency), consumes Pointer Events (unifies mouse/touch/pen), and maps effects
  (`highlight(i)`, `commit(intent)`, `announce(label)`) to DOM. Theme via the
  existing CSS custom properties (`--c-primary`, `--c-secondary`, `--c-accent`);
  `@media (pointer: coarse)` bumps stroke and type sizes.

**codecartographer integration** (fixes the legacy menu's defects):

1. Triggers land in `config/interaction_profiles.ts` as bindings
   (`longpress/1`, right-click, `key m`) → action `open-rad`; dispatch stays
   in `interaction_manager.ts`. No hardcoded listeners.
2. Mount as a `BaseExtension` receiving `ExtensionContext` — that seam already
   provides `selectedNodes`, `zoom`, and `onGraphChange`.
3. Intents route through `features/graph/state/graph_actions.ts` (Meiosis
   patches). Delete the `d3.selectAll(...)` direct-mutation paths; visual state
   derives from app state so it survives re-render.
4. Keep the legacy `getNodeMenuItems`-style pure builders as the `resolve()`
   implementation; convert `RadialMenuCallbacks` closures to string actions.
5. ARIA: menu container `role="menu"`, wedges `role="menuitem"`, `aria-label`
   per item, live-region announcement on highlight change; `:focus-visible` ring
   (benchmark ADR-001) and hand-rolled focus trap (ADR-003).

**Definition of done.** Vectors pass in Vitest; Playwright drives one
release-select and one keyboard path end-to-end; legacy `radial_menu.ts` deleted.

### 2. Android native (second)

**Shape.** Library module `:radialmenu`, app-agnostic; qmetronome is the first host.

```
radialmenu/
  core/     Geometry.kt, Machine.kt, Resolve.kt      ← pure Kotlin, no android.*
  compose/  RadialMenu.kt, WedgeCanvas.kt, Haptics.kt
```

- `core/` is a line-for-line port of the same state machine; JUnit parses
  `vectors.json` (checked in as a test resource) and replays it. CI grep lint:
  `import android.` and `import androidx.` are banned from `core/` (qmetronome's
  Glyph-SDK boundary pattern).
- `compose/RadialMenu.kt`:
  - Rendering: Compose `Canvas` — `drawArc` per wedge, labels via `drawText`
    (or a `Layout` of rotated composables if text metrics demand it). Angle math
    reuses the −90°/clockwise convention already in `QueueOverlay.kt`.
  - Gestures: **one** `pointerInput` with `awaitEachGesture`:
    `awaitFirstDown → awaitLongPressOrCancellation → machine.step(LongPress) →
    track moves (toPolar(center, pos)) → up commits/cancels`. No layered tap
    detectors (house rule: one detector per gesture family).
  - Callbacks read authoritative state fresh (`currentContext: () -> MenuContext`),
    with `rememberUpdatedState` in long-lived loops — the documented qmetronome
    bug class.
  - Thresholds from dp via `LocalDensity` (`36.dp.toPx()` dead zone, etc.).
  - Haptics: `LocalHapticFeedback.performHapticFeedback(SegmentTick|TextHandleMove)`
    on edge-triggered highlight change.
  - Accessibility: each wedge a semantics node (`contentDescription = label`,
    `role = Role.Button`); TalkBack path = tap-select mode; `Modifier.testTag`
    on hub and every wedge.
- Host wiring (qmetronome style): committed `Intent` → command method on the
  host's engine object; menu holds no engine reference, just an `onIntent` lambda.
- Tests: JUnit vector replay; Robolectric + Roborazzi screenshots of open menu,
  highlight, submenu (regenerated on every unit-test run, tracked in docs);
  a `VisualizerRenderTest`-style contract test asserting every resolved item has a
  content description and ≥44 dp arc target.
- Build: version catalog entry, config cache, 8-minute test timeout, alpha-release
  workflow — all inherited qmetronome conventions. minSdk 33 until a host needs lower.

### 2b. Expert input + clock (both platforms)

- **CharaChorder**: HID keyboard on every platform — the chord adapter
  (burst-split + classify, pure and vector-tested) is the only new code. Web:
  `keydown` timestamps. Android: `dispatchKeyEvent` timestamps. The optional
  serial API (chord IDs, per-chord timing) is an engine behind the same
  adapter seam; Web Serial on desktop Chrome, USB-serial on Android — isolated
  to one file, grep-linted, per the Glyph-SDK precedent.
- **MIDI clock**: Web MIDI on web/desktop; on Android, **qmetronome already
  owns this ground** — `MidiClockSender`, `UsbMidiConnector`, and the
  elevated-priority `TimingDispatcher` scopes. The rad core stays
  time-free; a thin `TimedDispatch` layer (port of `quantizeTime`/`estimateBpm`)
  quantizes intent application against whatever clock the host engine exposes.
  qmetronome can act as *clock master* (it already sends MIDI clock) with the
  graph surface as follower — one clock, two governed projects.
- **Scheduling discipline** (from audio practice): coarse timer to ~2 ms before
  the grid point, then spin the sub-millisecond tail. On Android, run the tail
  on a `TimingDispatcher`-style elevated dispatcher, never the main thread;
  apply the state mutation on main at the scheduled instant, stamp `deltaMs`
  from the elevated clock.

### 3. Desktop native + legs

- **Desktop, near term**: codecartographer's web build already runs on desktop
  browsers; the `dom/` layer with hover + right-click + keyboard *is* the desktop
  experience. Ship nothing new.
- **Desktop, native (when a native host exists)**: Compose Multiplatform reuses
  `:radialmenu:core` unchanged and most of `compose/`; only invoke bindings differ
  (right-click instead of long-press). This is the cheapest true-native leg and
  needs an org record only if CMP enters a shipped deliverable.
- **iOS**: SwiftUI port of `core/` (the machine is ~200 lines of pure logic);
  vectors run in XCTest. No shared runtime, same contract — the point of the design.
- **Embedded / odd surfaces** (Glyph-style hardware, TUI): the machine is
  renderer-free; a Textual or LED-ring front end consumes the same vectors. Not
  planned, but nothing forbids it — that is the test that the seam is real.

### Risks

- **Vector drift**: two cores, one spec — mitigated by vectors-in-CI on both, and
  by treating any behavioral divergence as "add a vector first, then fix."
- **Text in wedges** is the hard rendering problem on both platforms (overflow was
  a legacy defect). Rule: labels ≤ 12 chars, icon + label, ellipsize never —
  resolver must shorten.
- **Meiosis state duplication** in codecartographer (two incompatible `GraphState`
  definitions) predates this work; integration targets `features/graph/state/` and
  should trigger the cleanup ADR rather than absorb the ambiguity.


## Consequences

- The web port lands first and becomes the reference *implementation*, never
  the reference *specification* — the vectors keep that role. If a divergence
  is ever settled by reading `index.html` rather than the vectors, this
  separation has failed.
- codecartographer's legacy menu is deleted rather than adapted. That is a
  breaking change to a live surface and it is accepted: adapting it would
  carry forward the callbacks-as-closures shape the contract rejected.
- Each platform costs one state-machine port plus one renderer. The port is
  small (≈200 lines of pure logic) and the renderer is not; the honest split
  is roughly a day for the core and a week for idiomatic wedges, per platform.
- Two hand-ported cores can pass identical vectors and still feel different.
  The vectors govern semantics, not feel, and this record does not pretend
  otherwise — the boundary is stated in the interpretive-governance note.
- No cross-platform framework enters the house stack. That is the point, and
  the cost is real: zero code sharing between the web and Android renderers.

## Alternatives considered

1. **Android first.** qmetronome is the more mature host and owns the timing
   work, so the hardest integration would be proven earliest. Rejected on
   feedback speed: the web port has a live host with an existing graph surface
   and a defective menu to replace, so it produces a user-visible improvement
   and a second opinion on the contract in the least time.
2. **Both at once, one contributor each.** Fastest to two data points, and the
   second-data-point rule wants two. Rejected: with one active maintainer it
   is two half-finished ports, and a contract validated by two implementations
   written in parallel by the same person is validated by one perspective
   twice.
3. **A shared TypeScript core compiled to Kotlin/Swift.** Real code sharing,
   one place for the state machine. Rejected on the replaceability test — the
   compiler becomes the seam, and it is a permanent dependency on every
   platform at once, which is the trap the contract's own alternatives section
   already rejected in its stronger forms.
4. **Ship the web port as a published npm package before any second platform.**
   Tempting for reuse. Rejected as premature: one consumer, and publishing
   turns every core edit into a release. Revisit when a second web host exists.

## Revision triggers

- The web port completes and the contract needed amending to accommodate it —
  the sequencing worked, and the contract was underspecified in a way worth
  recording.
- The web port completes and the contract needed **no** amendment. That is
  also information: it suggests the vectors are underpowered rather than the
  contract complete, and the vector suite gets a hostile review.
- A host appears for a platform not named here (embedded, TUI, XR) before
  Android starts — the ordering is about hosts, not platforms.
- qmetronome's timing work turns out not to transfer, breaking the assumption
  in §2b that the Android clock ground is already owned.
- Any port needs more than 8 items after honest grouping, or needs a verb the
  menu cannot hold — both are contract revision triggers reached from here.
- Text-in-wedge rendering defeats the ≤12-character rule on either platform.
