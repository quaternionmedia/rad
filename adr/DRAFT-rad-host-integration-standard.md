# DRAFT — rad host integration standard

| | |
|---|---|
| **Status** | Draft |
| **Date** | 2026-08-09 |
| **Pends on** | the *rad interaction contract* draft; named as the deliverable of `v0.0.2` by the *rad release milestones* draft |
| **Principle** | `seams-on-standard-protocols`; `minimal-legible-deliverables` |

## Context

The interaction contract says what a conformant menu *does*. It is silent on
how an application gets one. That gap has a cost the release milestones draft
made concrete: `v0.0.2` is proven by apothecary and benchmark integrating
`rad`, and there was nothing for them to integrate against — only a page that
happened to contain a menu, with every seam an accident of where a function was
declared.

The legacy menu this project replaced failed at exactly this seam rather than at
the geometry. Its actions were closures bound to one renderer, so it could not
be serialized, tested, or driven by anything but the application it grew inside.
Intents-as-data fixed the *outbound* half. The inbound half — how a host says
"a menu belongs here, and here is what goes in it" — was still undefined.

An honest constraint shaped what follows: this contract has one implementation,
and a seam designed against one consumer is a description of that consumer. The
standard is therefore small, and §6 says plainly which parts are guesses.

## Decision

### §1 The division of ownership

| Owns | Party |
|---|---|
| Geometry, the state machine, the committing band, hit resolution | **rad** |
| Menu **content** for a context | **the host** |
| **Applying** an intent to application state | **the host** |
| The scene, its coordinates, its lifecycle | **the host** |
| Rendering the ring | either — rad ships one, a host may replace it |

`rad` never reaches the host's scene. This is not a promise about discipline;
after the seam exists it is a property of the surface, because nothing in it
takes a scene, an element, or a store.

### §2 A session is the unit of integration

A host creates a **session** and holds it for the lifetime of the surface. The
session is the whole inbound API:

```
createSession({ resolve, onIntent, onEffect?, geometry? }) → Session

Session {
  isOpen: boolean
  view: RingView | null          // read-only; what a renderer needs
  openAt(context, viewport, mode) // mode: 'idle' | 'tracking'
  input(event)                    // down | move | up | key | longpress | close
  close()
}
```

Two host callbacks are **required**, and the requirement is the design:

- **`resolve(context) → MenuSpec`** — the host owns the vocabulary for its own
  domain. `rad` calls this once per open and never caches it, so a menu is
  always current with host state.
- **`onIntent(intent)`** — the host applies it. `rad` has already forgotten the
  menu by the time this is called, so an intent cannot be mistaken for a live
  handle on one.

`onEffect(effect)` is optional and carries `highlight`, `open`, `submenu`,
`back` and `cancel` — everything a renderer, a haptic, or a live region needs.
Per the contract, a `highlight` effect carries its own resolved `label` and
`id`; a host must never re-resolve the index against live state.

### §2b A host with no pointer addresses cells, and the seam carries them

Written after *the menu addresses nine cells*, which this standard predates. §3
below says input is polar, and that is right for a finger and unusable for a
surface that has no finger: a terminal delivers keys, not angles, and converting
a keystroke into an angle so the seam will accept it is a fiction the host has
to maintain.

So the seam takes a **cell** as an alternative address for the same item:

```
input({ t: 'cell', cell: 1..9 })          choose the item at that cell; 5 backs out
input({ t: 'cellDir', dir: 'up'|... })    move to the nearest item in that direction
```

Three constraints, all of them consequences of that record rather than new
decisions:

1. **A cell and an angle name the same item, by index.** Nothing is added to
   `MenuItem` and no host stores a cell. `placeCells(N)` derives it, and §5.4's
   obligation covers the derivation because the `cells` cases are governed
   vectors from `v0.6.0`.
2. **Cell `5` is not an item and is never delivered as one.** It backs out at
   every depth, so a host that maps it to an item is refused rather than
   obeyed.
3. **A cell-addressing host is not thereby a ring-rendering host.** Above four
   items the two put the same item in different places, by up to 135°, and
   `cellAgreesWithRing(N)` is how a host finds out which it is doing. See that
   record's clause 4; the divergence is priced there and not re-argued here.

**What this does not settle.** Whether a host that renders a ring *and* accepts
cells should re-address its wedges, label them, or refuse the combination. One
implementation has no pointer and the other two have no cells, so there is no
evidence to decide it on.

### §3 Coordinates are polar and relative

`input()` takes events in **ring-polar** coordinates: `r` in
density-independent units from the menu centre, `thetaDeg` in the contract's
screen convention where −90° is up.

The host converts. This is deliberate and is the clause most likely to be
questioned, so the reason is stated: a host has a viewport, a camera, a zoom, a
scroll offset and possibly a transformed canvas, and `rad` cannot know about
any of them without acquiring a dependency on the host's scene graph — which is
the exact coupling that made the legacy menu unportable. Polar input keeps the
seam free of every coordinate system in the world but one.

`openAt` takes a `viewport` of `{width, height}` so the ring can be fitted per
contract §2. The host passes the space the menu may occupy, which is not always
the window.

### §4 What travels across the seam

Everything is plain data. No functions, no class instances, no host objects.

```
MenuContext { type: 'node'|'edge'|'canvas'|'selection', targetIds: string[], position: {x,y} }
MenuItem    { id, label, enabled?, destructive?, swatch?, action?, children? }
MenuSpec    { title?, items: MenuItem[] }          // 1..8 items, enforced
Intent      { action: string, context: MenuContext, itemId: string }
Effect      { t: 'highlight'|'open'|'submenu'|'back'|'cancel', … }
```

`Effect.t` gains no cell variant. A highlight names an item, and a host that
addresses cells looks the cell up from the index it is given — the same
direction of derivation §2b requires, so there is one place that knows the
placement order and it is `rad`.

`position` is in the **host's** coordinates and `rad` only carries it through —
it is there so the host can place a new node where the menu was opened without
keeping a side table. A host may extend `MenuContext.type` with its own values;
`rad` treats an unknown type as opaque and passes it to `resolve` unchanged.

### §5 Obligations on a conformant host

1. **Route intents through the authoritative state layer.** Applying an intent
   by mutating the rendered scene directly is the defect this project's own
   history records; the visual state must derive from application state or it
   will not survive a re-render.
2. **Extend the vocabulary, never repurpose it.** `delete` means delete. A host
   needing different semantics uses a different verb, because the systemization
   index counts verbs across surfaces and a repurposed verb makes it lie.
3. **Every chord-bound or shortcut-bound verb is also reachable in the menu.**
   The contract's menu-as-superset rule is a host obligation, since the host
   owns both surfaces.
4. **Replay `conformance/vectors.json` in the host's own test runner** and pin
   the vector version claimed. Integrating without this makes "conformant" a
   description of intent.
5. **Report divergences as a vector first, in a row somebody reads.** A
   behaviour the host needs that
   the vectors do not cover is a proposed vector, not a local patch.

   **Where the report goes**, because an obligation with no channel is a
   preference. A host writes it as the `Pends on` row of one of its own
   records, naming `rad`. That row already exists — the seed template requires
   it of every `Proposed` record and the ADR lint enforces it — and the corpus
   collects those rows across the estate, so a divergence written there is read
   without anybody remembering to look.

   The channel is in use before this clause was written: codecartographer's
   `DRAFT-rad-integration.md` pends on `quaternionmedia/rad` PR #1, and reading
   the collected rows is how it surfaces that the pull request it waits on
   merged some time ago. That is the mechanism working — it makes a stale
   dependency visible without asking anybody to audit for one.

### §6 What this standard does not yet settle

Named rather than decided, because one implementation cannot settle them:

- **Nested and dynamic content.** `resolve` is synchronous. A host whose menu
  depends on a network round trip has no way to express that, and adding a
  promise to the seam is a decision about latency policy rather than a
  mechanical extension.
- **Capabilities.** `v0.0.4` will add identity to `MenuContext` so the resolver
  can omit verbs a caller may not perform. The shape is reserved and not
  designed here.
- **Multiple concurrent sessions.** One session per surface is assumed. A host
  with two graphs side by side is expected to hold two sessions; nothing
  verifies that they do not interfere.
- **Renderer replacement.** `view` exposes what a renderer needs, and no host
  has yet written one, so the shape is a guess informed by exactly one
  renderer — the reference implementation's.

## Consequences

- `v0.0.2` has something to integrate against, and its two consumers can
  disagree with it in a way that produces a vector or an amendment rather than
  a fork.
- The seam is testable without a browser host: `tests/integration.spec.mjs`
  drives a session from a synthetic host with its own scene and its own state
  layer, and asserts that a full release-select commits an intent while the
  host's scene remains byte-identical. That test is the standard's own
  conformance evidence.
- The public surface is one frozen object. Anything not on it is private, and
  a host reaching past it is relying on a coincidence.
- Cost accepted: polar input pushes coordinate conversion onto every host, and
  every host will write nearly the same twenty lines. That duplication is the
  price of not knowing about any host's camera, and it is the right side of the
  trade for a component that must reach Compose and SwiftUI.
- Cost accepted: this does not close the core-extraction question. The seam is
  reachable, and the import boundary is still unenforceable while the core
  shares a file with a renderer. `v0.0.3` still forces that decision.

## Alternatives considered

1. **A DOM custom element (`<rad-menu>`)** — idiomatic on the web, one line to
   mount. Rejected: it is a web answer to a cross-platform question, and the
   first Compose port would have to invent a second seam. The contract's whole
   claim is that the seam outlives the platform.
2. **rad owns the scene and the host registers node types** — the framework
   shape. Rejected on the replaceability test: it inverts the dependency, so a
   host cannot adopt `rad` for one surface without adopting it for its scene
   graph, and it puts back the state-bypass defect the legacy menu had.
3. **Screen coordinates at the seam, with rad doing the conversion** — fewer
   lines in each host. Rejected: `rad` would need the host's transform, camera
   and scroll state, which is a dependency on the host's scene by another name.
   The twenty duplicated lines are cheaper than that coupling.
4. **Asynchronous `resolve`** — solves §6's first open question immediately.
   Rejected as premature: it forces every host to reason about a menu that is
   open but empty, and no consumer has asked for it. Adding it later is
   additive; removing it would not be.
5. **A message protocol (postMessage / JSON-RPC) rather than a call API** —
   would carry across an iframe or a worker for free, and is the most
   "standard protocol" answer. Rejected for now and worth revisiting: no
   consumer needs process isolation, and the shapes in §4 are already the wire
   form, so the protocol is a transport away rather than a redesign.

## Revision triggers

- Either `v0.0.2` consumer needs something §6 lists as unsettled — that item
  gets decided rather than staying open.
- A host writes its own renderer and `view` proves insufficient, which is the
  concrete test of §6's last bullet.
- A second platform implements this seam, and the shapes in §4 need changing to
  fit it. That is the signal the standard was written against one language.
- Two hosts write materially different coordinate-conversion code, suggesting
  §3's duplication is not the trivial twenty lines it is assumed to be.
- A host is found routing intents around its state layer, or shipping a chord
  verb with no menu path — §5 needs a check rather than a clause.

## Amendments

*None.*
