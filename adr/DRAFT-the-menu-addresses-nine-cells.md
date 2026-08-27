# DRAFT — The menu addresses nine cells

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-08-19 |
| **Pends on** | Nothing — ready for ratification |
| **Principle** | P3 seams on standard protocols; P6 decisions documented; P9 minimal legible deliverables |

## Context

The interaction contract defines the menu **polar first**: an angle origin, a
wedge span, and `angleToIndex(θ, N)`. That is a pointer's model, and it is the
right one for a finger. It is the only addressing the contract has.

The same contract states the pointer-free path as foundational — arrows rotate
the highlight, Enter commits, Escape backs out, pointer never required. But a
keyboard host given only a polar model has nowhere to stand. It can walk the
ring and nothing else, so:

- **A position has no name.** The third item is "third" only until the resolver
  returns a different menu, and an index is not something a person can aim at.
- **Every item costs a walk.** Reaching the far side of an eight-item ring is
  four presses before the one that commits, and which four depends on where the
  highlight happened to be.
- **A direction and a position are unrelated.** Pressing left moves *around* a
  ring rather than *to* the thing on the left, which is what a reader means.

A terminal implementation of this contract exists in `dossier` and made the gap
concrete rather than theoretical. It is the evidence this record rests on.

## Decision

**The menu addresses nine cells, numbered as a numeric keypad. Geometry is a
rendering of that addressing, not the addressing itself.**

```
7 8 9        up-left     up    up-right
4 5 6   =    left       BACK   right
1 2 3        down-left  down   down-right
```

1. **Eight cells hold items; the centre holds none, ever.** Cell 5 backs out one
   level, and closes at the top, at every depth in every menu. A centre that
   sometimes cancels and sometimes chooses the fifth thing cannot be used
   without looking, which is the property the whole layout exists to buy.

2. **Every cell has a stable number and a direction, and they are the same
   thing.** `7` is up-left on a keypad, up-left on a screen, and up-left in the
   contract. An implementation may not reassign them.

3. **Placement is cardinals first**, in the order `8, 6, 2, 4, 9, 3, 1, 7`, so a
   four-item menu sits at up, right, down and left — where a ring puts it — and
   the corners fill only when there are more than four.

4. **Polar geometry becomes a rendering of the cells.** A pointer implementation
   draws the eight as a ring exactly as it does today; the cell number is the
   name of a wedge rather than a replacement for it. `angleToIndex` is unchanged
   and the existing conformance vectors remain valid, because an index still
   identifies an item — the addition is that a cell also identifies it, by a
   name that does not move when the menu does.

5. **A keyboard host binds all three, and the digit is the point.**
   - a digit chooses its cell directly, from anywhere;
   - a direction moves to the nearest item *in that direction*;
   - `5` backs out.

   Movement must land on something choosable. Walking a row or column is not
   sufficient: in a four-item menu the corners are empty, and stepping left from
   the top cell reaches the edge without ever turning down — which left one
   cardinal unreachable by arrows in the most common menu size there is. That
   defect was found in implementation, and it is why this clause is stated
   rather than left to the obvious reading.

6. **Diagonals are reachable two ways, and both land in the same cell.** A
   terminal delivers one key at a time and cannot report two held together, so:
   *movement* — up then left walks to `7` whatever the delay; and *chord* — the
   same two arriving inside a short window are read as the corner. The chord is
   a shortcut over the movement, never the only route, so how fast somebody
   types changes how long it takes and not where they land.

## Consequences

**The keyboard path gets a cost floor the pointer already had.** A digit press
is one input, so any item is two from idle: open, choose. Measured in the
terminal implementation at an IPA of 2, against 3 for the first item and more
for the rest under a walk. `interaction-efficiency-metrics` is unchanged; this
gives its numbers something to improve.

**Conformance gains a cell↔angle mapping** and cases for it: placement order,
the centre holding nothing, reachability of every cell by direction alone, and
the chord window on both sides. The existing polar cases stand.

**Eight remains the ceiling** and the resolver still raises on a ninth. That
clause is not relaxed; the grid has exactly eight cells that can hold an item,
which makes the ceiling structural instead of a rule to remember.

**A pointer-only host changes nothing.** It may ignore cell numbers entirely and
remain conformant, because the mapping is derivable from the index it already
has.

## Alternatives considered

**Keep polar and add keyboard shortcuts.** Numbering derived from the item index
gives a position no stable name: the same key reaches a different thing when the
resolver returns a different menu, which is the failure the numbering exists to
prevent.

**Grid only, drop the ring.** Loses the gesture the component is named for. A
radial menu under a thumb is not improved by being a grid, and this record does
not claim it is.

**Leave the keyboard path underspecified.** It is what the contract does now,
and it produced an implementation whose every keyboard interaction was a walk.

## What this cannot do

It does not make a keypad good on a touchscreen, and it does not claim the
layout is better for a finger — the ring stays the pointer's rendering.

It does not address menus larger than eight. Overflow is still a resolver design
error, and this record does not soften that.

It says nothing about *which* items sit where beyond placement order. Whether
the most-used item belongs at `8` is the resolver's business, and no contract
can know it.

And it is evidenced by one implementation on one platform. A terminal is the
narrowest case: it has no pointer, so it shows the keyboard gap clearly and says
nothing about how the two paths feel together on a device that has both.

## Revision triggers

Revisit this record when any of these happens. Each is something that would
make the decision wrong rather than merely inconvenient.

- **A pointer-first host reports that the cell numbering constrains its
  rendering.** The claim here is that cells name what angles draw. If naming
  turns out to dictate, the layering is wrong.
- **A surface arrives with directions but no digits** — a game controller, a
  television remote, a rotary encoder. The keypad's whole argument is that a
  digit is one input; where there is no digit, only the movement half survives
  and the numbering earns nothing.
- **Menus in practice need more than eight items.** The eight-cell ceiling is
  structural here rather than a rule, so pressure against it is pressure
  against this record and not against a lint.
- **Measured IPA does not improve** on a host that adopts the digits. The
  cost floor is the reason for the change; if the numbers do not move,
  `interaction-efficiency-metrics` will say so and this should be reconsidered
  rather than defended.
- **A second implementation disagrees about placement order.** One
  implementation chose cardinals first. If another finds that wrong for its
  platform, the order is a convention this record fixed too early.
