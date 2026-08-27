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

4. **A cell addresses an item; it does not place one on a ring.** `angleToIndex`
   is unchanged and every existing conformance vector remains valid, because an
   index still identifies an item — the addition is that a cell identifies the
   same item by a name that does not move when the menu does. A pointer host
   draws item *i* at its wedge; a keyboard host reaches item *i* at its cell;
   both are looking up the same index.

   **The two agree at four items and part company above.** Cardinals-first
   placement and clockwise-from-the-top are the same order for `N ≤ 4` and a
   different one for `N > 4`: at eight items, item 3 is drawn at 45° and
   addressed as cell `4`, which points at 180° — a gap of 135°. This is the
   price of clause 3, and it is paid knowingly. The alternative is below.

   So a cell number is **not** the name of a wedge, except at `N ≤ 4` where it
   happens to coincide. `cellAgreesWithRing(N)` reports which case a host is in
   rather than leaving it to be assumed, and the vectors pin it true at 1 and 4
   and false at 5 and 8, so no port can adopt one order and claim the other.

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

**Conformance carries the cell layer**, in `conformance/vectors.json` from
`v0.6.0`: placement order, the centre holding nothing at every size,
reachability of every occupied cell by direction alone, grid movement clamping
at the edge, the chord in both orders, and the `N ≤ 4` agreement bound from
clause 4. The existing polar cases stand unchanged, which is the check on the
claim that a cell is an address and not a second geometry.

**Each of those cases has been seen to fail**, per P16. The mutation that
matters most reproduces the defect clause 5 exists for: degrading
`cellStepToItem` to a raw grid walk gives

    every cardinal is reachable by direction alone, N=4 — n=4 8 left → 7, want 4

— left from `8` landing on the empty corner rather than reaching `4`. Five
others are recorded beside the suite in `tests/conformance.spec.mjs`.

**Eight remains the ceiling** and the resolver still raises on a ninth. That
clause is not relaxed; the grid has exactly eight cells that can hold an item,
which makes the ceiling structural instead of a rule to remember.

**A pointer-only host changes nothing.** It may ignore cell numbers entirely and
remain conformant, because the mapping is derivable from the index it already
has.

**A host that renders both must pick which one it is showing.** Above four
items the ring and the grid put the same item in different places, so a surface
drawing a ring while announcing cell numbers would be telling a reader two
different things. Nothing here forbids that; the vectors make it visible.

## Alternatives considered

**Keep polar and add keyboard shortcuts.** Numbering derived from the item index
gives a position no stable name: the same key reaches a different thing when the
resolver returns a different menu, which is the failure the numbering exists to
prevent.

**Place clockwise from the top instead of cardinals first** — `8, 9, 6, 3, 2,
1, 4, 7`. Then a cell's direction is its wedge's angle at every size, the
mapping in clause 4 is total, and `cellAgreesWithRing` is a constant. Rejected,
and it is the closest call in this record: it buys identity at every `N` at the
cost of the `N ≤ 4` case, where a four-item menu would sit at up, up-right,
right and down-right — a quarter of the screen — instead of at the cardinals.
Four-item menus are the common case and the cardinals are what a reader
expects, so the divergence is priced above four rather than the crowding priced
below it. **Revisit this if a pointer host reports the divergence as a defect**;
the trade is genuine and this record picked a side.

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
