# DRAFT — Radial menu platform implementation plans

| Status | Draft |
|---|---|
| Date | 2026-08-08 |
| Pends on | DRAFT-radial-menu-interaction-contract |

Order of work: **modern web first** (host exists: codecartographer), **Android
second** (idioms exist: qmetronome), desktop and iOS as legs.

## 1. Modern web (first)

**Shape.** One framework-free TS package, two layers:

```
radial-menu/
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
   (`longpress/1`, right-click, `key m`) → action `open-radial-menu`; dispatch stays
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

## 2. Android native (second)

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

## 2b. Expert input + clock (both platforms)

- **CharaChorder**: HID keyboard on every platform — the chord adapter
  (burst-split + classify, pure and vector-tested) is the only new code. Web:
  `keydown` timestamps. Android: `dispatchKeyEvent` timestamps. The optional
  serial API (chord IDs, per-chord timing) is an engine behind the same
  adapter seam; Web Serial on desktop Chrome, USB-serial on Android — isolated
  to one file, grep-linted, per the Glyph-SDK precedent.
- **MIDI clock**: Web MIDI on web/desktop; on Android, **qmetronome already
  owns this ground** — `MidiClockSender`, `UsbMidiConnector`, and the
  elevated-priority `TimingDispatcher` scopes. The radial-menu core stays
  time-free; a thin `TimedDispatch` layer (port of `quantizeTime`/`estimateBpm`)
  quantizes intent application against whatever clock the host engine exposes.
  qmetronome can act as *clock master* (it already sends MIDI clock) with the
  graph surface as follower — one clock, two governed projects.
- **Scheduling discipline** (from audio practice): coarse timer to ~2 ms before
  the grid point, then spin the sub-millisecond tail. On Android, run the tail
  on a `TimingDispatcher`-style elevated dispatcher, never the main thread;
  apply the state mutation on main at the scheduled instant, stamp `deltaMs`
  from the elevated clock.

## 3. Desktop native + legs

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

## Risks

- **Vector drift**: two cores, one spec — mitigated by vectors-in-CI on both, and
  by treating any behavioral divergence as "add a vector first, then fix."
- **Text in wedges** is the hard rendering problem on both platforms (overflow was
  a legacy defect). Rule: labels ≤ 12 chars, icon + label, ellipsize never —
  resolver must shorten.
- **Meiosis state duplication** in codecartographer (two incompatible `GraphState`
  definitions) predates this work; integration targets `features/graph/state/` and
  should trigger the cleanup ADR rather than absorb the ambiguity.
