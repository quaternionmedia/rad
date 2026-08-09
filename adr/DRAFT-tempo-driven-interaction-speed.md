# DRAFT — Tempo-driven interaction speed

| | |
|---|---|
| **Status** | Draft |
| **Date** | 2026-08-09 |
| **Pends on** | the *rad interaction contract* draft §5 |
| **Principle** | P3 seams on standard protocols; P6 decisions documented |

## Context

The contract already puts *commits* on a clock: quantized intents land on the
beat and carry `grid: { beat, deltaMs, bpm, src }`. Everything else about the
page's pacing was hardcoded milliseconds — the ghost finger's leg duration, the
dwell before a menu opens, the gap between tour steps, the settle time after a
commit. Twenty-odd literals, tuned for a reader who already knows what the
gesture is.

Two problems follow, and they are different problems.

The first is pedagogical. The page's whole claim is that it teaches itself, and a
demonstration paced for its author teaches nothing: the ghost finger arrives, the
menu opens, and a wedge commits inside a second. A first-time reader sees the
outcome and not the gesture. Fast is the wrong default for a tutorial, and it is
the wrong default even though it is the right *goal* for the product — the
contract's entire point is that an expert reaches a verb in one input. Those are
not in tension; they are different audiences, and only one of them was served.

The second is that a page which advertises itself as clock-driven, and which
already accepts MIDI clock for its commit grid, was running its own demonstration
off `setTimeout` literals that no clock could reach. The clock governed the least
visible thing on the page and none of the most visible ones.

## Decision

### §1 Three axes, not one dial

Speed is not one number. `bpm`, `div` and `aps` are defined in the contract's §5;
this record decides how they are *exposed and driven*.

- **`bpm`** — the beat grid. Default **60**.
- **`div`** — subdivision per beat (½, 1, 2, 3, 4). Default **1**.
- **`aps`** — actions per second for scripted playback. **Linked** by default to
  `bpm/60 · div`, freeable to any value in 0.25–8.

At the defaults: one beat per second, one action per second. Deliberately slow.

### §2 Every scripted duration derives from the axes

No literal milliseconds in the demo driver or the tour. One derivation:

```
actionPeriod = 1000 / aps
```

and every scripted duration is a named fraction of it — a finger leg, a dwell, a
settle, a hold. The fractions are the choreography and are the only tuned numbers
left; they are unitless and survive any tempo. Setting `aps` to 4 makes the whole
tour four times faster with the same shape, and the shape is what a reader is
learning.

`prefers-reduced-motion` continues to collapse every duration to zero. It
composes with this rather than competing: the axes scale a duration, and reduced
motion sets it to nothing.

### §3 The axes are reachable over MIDI, on the same footing as the clock

| Source | Binds |
|---|---|
| Clock ticks `0xF8` (24 PPQN) | `bpm`, via the existing median-filtered estimator |
| Start `0xFA` | Play scripted playback from the first step |
| Continue `0xFB` | Resume from the current step |
| Stop `0xFC` | Halt playback, leave state intact |
| CC 20 | `bpm`, mapped over 30–300 |
| CC 21 | `aps`, mapped over 0.25–8; **setting it frees the link** |
| CC 22 | `div`, quantized to the five legal values |
| CC 23 | quantize mode, `off | beat | bar` |

Controller numbers are a **host binding, not contract**. What the contract fixes
is that the axes are reachable over the same transport as the clock; a surface
whose tempo can be driven externally and whose action rate cannot is not on the
clock in any useful sense.

`0xFA` resets phase, as it already did. Transport messages drive playback and
never mutate the graph — a stopped transport leaves committed intents committed.

### §4 What the axes must not touch

`longPressMs`, the slop radius, `chordGapMs` and `burstSplitMs` are
conformance-governed constants and do **not** scale with tempo.

The temptation is real: a "slow mode" that lengthens the long-press would make
the gesture easier to follow. It is refused because the vectors that define the
state machine would become tempo-dependent, and every port would have to replay
them at N tempos to claim conformance. The gesture grammar is not a musical
parameter. Tempo governs *when* things are scheduled and *how fast a script
issues them*; it never governs what counts as a gesture.

This is the boundary that keeps the core time-free apart from `longPressMs`, and
it is worth more than the affordance it costs.

### §5 Controls are real form elements

`bpm`, `aps` and `div` are exposed as native `<input type="range">` and
`<select>`, labelled, in the tab order, keyboard-operable, with live values
announced. Not chips that cycle.

A cycling chip is cheaper and is the pattern the rest of the header uses, but it
gives no way to know the available range without pressing it repeatedly, no way
to reach a value directly, and nothing for a screen reader to report but the
current state. A page that argues accessibility is foundational does not ship its
newest control as the least accessible thing on it. Settings persist in
`localStorage`.

## Consequences

- The tour is roughly four times slower out of the box and demonstrably
  legible. That is the intended cost, and it is a cost: a returning reader must
  raise `aps` to move at their own pace, and the control is one slider away.
- Test wall-clock rises with the same factor. The suite drives the tour at an
  explicit high `aps` rather than the default, so the timing topics stay fast —
  which is also a better test, because it exercises the axis instead of the
  default.
- Choreography fractions replace millisecond literals: the same count of tuned
  numbers, now tempo-independent and named.
- An external clock now visibly drives the page rather than only its commit grid.
  qmetronome as clock master and `rad` as follower is a two-project demonstration
  the platform-plans draft anticipated.
- Cost accepted: MIDI CC handling is untested against hardware in CI. The mapping
  functions are pure and vector-tested; the transport binding is not, and cannot
  be without a device. Named rather than hidden.

## Alternatives considered

1. **One "speed" multiplier over the existing literals.** One control, one
   concept, trivial to implement. Rejected: it cannot express the configuration
   that motivated the work — a slow clock with dense actions, or the inverse —
   and it leaves the demo pacing unrelated to the clock the page advertises.
2. **Derive `aps` from `bpm` with no free mode.** Simpler and always honest about
   being clock-driven. Rejected: demonstration pace and musical pace are
   genuinely different requirements, and forcing a reader to slow the *grid* to
   slow the *tour* corrupts the thing being demonstrated.
3. **Scale the interaction constants too** (§4). Rejected on conformance grounds
   above. It is the alternative most likely to be proposed again, which is why the
   reason is written out rather than asserted.
4. **Keep 120 bpm as the default and expose the axes.** Preserves the existing
   feel. Rejected: the default is what almost everyone experiences, and the
   measured problem was that the default taught nothing. Exposing a control does
   not fix a default.
5. **Web Audio clock instead of `performance.now()` plus a spin.** More accurate
   in principle. Rejected here: it requires a user gesture to start, it does not
   remove the need to schedule DOM mutations on the main thread, and the measured
   grid jitter already meets the record's 1 ms budget.

## Revision triggers

- 60 bpm measures as slower than first-time readers tolerate, or a returning
  reader's first act is reliably to raise it — the default is wrong.
- A host needs the axes over a transport that is not MIDI-shaped (OSC, Ableton
  Link). The axes should absorb it; if they cannot, amend.
- Someone presents a case for §4 strong enough that tempo-dependent vectors look
  cheaper than the affordance lost.
- Choreography fractions grow past roughly a dozen, meaning the tour is
  hand-animating rather than pacing.
- A second QM surface adopts the three-axis model — promote toward an org record
  under the second-data-point rule.

## Amendments

*None.*
