# DRAFT — The ring has an authored-graph mode

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-09-20 |
| **Pends on** | (1) codecartographer carrying this divergence in the `Pends on` row of its own `DRAFT-rad-integration.md`, naming `rad` — the host-side half of the channel the *rad host integration standard* §5.5 names, which a record in this repository cannot write for it; (2) what a disabled wedge does to the highlight and to the open menu — the two implementations disagree (§4), and this record proposes the part they agree on and does not pick between them |
| **Principle** | `seams-on-standard-protocols`; `decisions-are-documented`; `a-check-is-evidence-after-it-fails` |

## Context

The *rad interaction contract* §1 gives the ring a standard graph-manipulation
vocabulary and says hosts may extend it and never repurpose it. Three of those
verbs assume something the contract does not say: that the graph under the
menu can be *written*. `add-node` (canvas), `reverse` and `edit-label` (edge)
create or alter graph facts. On a graph a person drew, that is what the verbs
are for. On a graph a parser found, there is nothing honest for them to do —
a node cannot be added to what the source contains, an edge's direction is a
fact about a call, and its label is derived rather than chosen.

codecartographer's `DRAFT-rad-integration.md` §5 reaches that conclusion for
its parsed code maps and omits the three verbs "as having no honest meaning for
a graph derived from parsing". The same record's §4 states the rule this
proposal rests on, for a different set of verbs: **a capability this host does
not have is offered disabled, never substituted.** `spread`, `cluster` and
`toggle-physics` keep their wedges there and come back `enabled: false`, with
a test asserting exactly that.

codecartographer now reports a second surface: a topology designer, on which
the graph is authored rather than derived. The three verbs are honest there,
in the same host, sometimes on the same screen as a parsed map. So the
question the omission answered once per host has become a question answered
per graph, and the contract has no word for it. A host that wants the verbs on
one graph and not another has today only its own resolver's private knowledge,
and nothing at the seam records which kind of graph an intent was committed
against.

The integration standard §5.5 says a behaviour a host needs that the vectors do
not cover is a proposed vector first, and `AGENTS.md`'s second rule says a
divergence is captured at the cheap tier — a vector — before the expensive one.
This record is that proposal, written on `rad`'s side: the mode, the host
obligation, and the vectors that would pin it, offered as candidates and not
applied. `conformance/vectors.json` is unchanged by this record and its version
is not bumped, because a proposal is not a change.

## Decision

### §1 A graph is authored or derived, and the host says which

`MenuContext` gains one optional field:

```
MenuContext { type, targetIds, position, graph?: 'authored' | 'derived' }
```

The host sets it when it opens a menu, because only the host knows where its
graph came from. `rad` carries it through unchanged — to `resolve`, so the
host's own resolver reads it back as data rather than from a side table, and
into the `Intent`, so an intent recorded against a derived graph says so when
it is replayed.

**Absent means the host has not said**, and nothing below applies. This is
dossier's `None` rule for availability: a host that does not know about this
clause is unchanged, and so is the reference page, whose demo graph a reader
draws on and which declares nothing.

### §2 Three standard verbs are authored-only

`add-node`, `reverse` and `edit-label` are the **authored-only** verbs of the
standard vocabulary. Their meaning does not change with the mode; whether that
meaning is available does. Every other standard verb — including `delete`,
which on a derived graph is a view operation and is honest as one — is
available in both modes, and this record does not touch it.

A host's own verbs are its own business. It may hold some of them to the same
rule in its resolver; `rad` can only know the standard ones.

### §3 On a derived graph the ring offers them disabled, never substituted and never omitted

When `graph` is `'derived'`, an authored-only verb in any ring the resolver
returns is present with `enabled: false`. Three things follow, and each is a
consequence of a rule already written rather than a new one:

1. **Never substituted** — codecartographer's §4. A wedge that says `Reverse`
   and does something else is the defect the systemization index exists to
   count, and a disabled wedge is purely testable in a way "the op body is
   meaningful" is not.
2. **Never omitted.** A wedge that is there and unavailable tells a reader the
   verb exists and where it lives, and it keeps every address after it stable
   across the mode switch: *the menu addresses nine cells* gives each item a
   name that does not move when the menu does, and dossier's own availability
   test states the same property from the terminal side — an unavailable wedge
   keeps its cell, because the cell numbers are written down. Omitting `reverse`
   on a derived edge would make one digit name two different things in one
   host.
3. **Refused, not obeyed, when the resolver gets it wrong.** An authored-only
   verb arriving enabled on a derived graph is a contract violation, and `rad`
   raises **wherever it asserts a ring** — at `openAt` for the root and at
   `enterSub` for every submenu — exactly as it raises on a ninth item: a
   ceiling that only a reviewer checks is a preference, and so is this. The
   root alone is not enough: an authored-only verb nested under a submenu item
   walks past a check that reads only the root ring and commits from one
   level in, which a reviewer of this record did on the first day with
   `Edit ▸ Reverse` over a derived graph. The check reads the `action` string
   and the `graph` field, both plain data, and touches nothing else in the
   spec — content stays the host's.

The cost is a wedge on every edge ring and one on every canvas ring in a host
with a derived graph, and codecartographer's canvas ring sits at the contract's
ceiling today. Grouping is the resolver's job and the contract already says so;
this record accepts that it now has to be done there.

### §4 What a disabled wedge does, and what the vectors say about it today

Every clause above rests on a disabled wedge producing no intent. **No vector
pins that.** The trace runner in `runConformanceWith` builds every ring from a
count, so no case can carry an item with `enabled: false`, and
`grep -c enabled conformance/vectors.json` returns zero at `a39d3bf`. The
reference core's `commit()` refuses a disabled item and closes the menu
cancelled — the branch in `index.html` that reads `item.enabled === false` —
and nothing has ever asked it to.

Two implementations exist, and they agree on the refusal and on nothing else
about it. Established by running the first and reading the second:

| | reference core and codecartographer's port | dossier's terminal |
|---|---|---|
| a disabled wedge produces an intent | never | never |
| a disabled item holds its wedge / cell | yes — it counts toward the ceiling | yes — `test_an_unavailable_wedge_keeps_its_cell` |
| the highlight rests on it | yes — pointer, keyboard rotate and `down` all land there, and the `highlight` effect fires | never — rotate skips it, a digit naming it is refused |
| a refused commit | closes the menu, `cancelled: true` | leaves the menu open, highlight unmoved |

The first two rows are what this record needs and what the candidates in §5
pin. The last two are a genuine disagreement between a surface with a pointer
and one without, and the contract's own text points both ways: §3 says a
highlight that cannot be committed is the interface lying about its next
state, which is dossier's reading; and the accessibility clause wants every
item's label reachable by the assistive tree, which is how a keyboard reader
on the web learns that a greyed verb exists. This record does not pick. The
candidate traces below carry the reference core's values for those two rows
because that is the only core this record could run, and they are marked.

### §5 Candidate vectors

Written in the vectors file's own schema, **not added to it**. Two of the case
shapes need a field the schema does not have: a trace case carrying `items`
in place of `n`, and a `ceiling` case carrying `disabled`. A third is a new
suite type, `authored`, which no runner has a branch for — it is the vector
written before the behaviour, per `AGENTS.md`'s second rule.

```json
[
  {
    "name": "an authored-only verb is refused enabled on a derived graph",
    "authored": [
      { "graph": "derived",  "items": [{ "id": "rev", "label": "Reverse", "action": "reverse" }], "expectThrows": true },
      { "graph": "derived",  "items": [{ "id": "rev", "label": "Reverse", "action": "reverse", "enabled": false }], "expectThrows": false },
      { "graph": "derived",  "items": [{ "id": "add", "label": "Add node", "action": "add-node" }], "expectThrows": true },
      { "graph": "derived",  "items": [{ "id": "lbl", "label": "Label", "action": "edit-label" }], "expectThrows": true },
      { "graph": "derived",  "items": [{ "id": "src", "label": "Source", "action": "view-source" }], "expectThrows": false },
      { "graph": "authored", "items": [{ "id": "rev", "label": "Reverse", "action": "reverse" }], "expectThrows": false },
      { "items": [{ "id": "add", "label": "Add node", "action": "add-node" }], "expectThrows": false },
      { "graph": "derived",  "items": [{ "id": "edit", "label": "Edit", "children": [{ "id": "rev", "label": "Reverse", "action": "reverse" }] }], "expectThrows": true, "at": "enterSub" }
    ]
  },
  {
    "name": "a disabled wedge is offered and commits nothing: release-select",
    "items": [
      { "id": "i0", "label": "i0" },
      { "id": "i1", "label": "i1", "enabled": false },
      { "id": "i2", "label": "i2" },
      { "id": "i3", "label": "i3" }
    ],
    "trace": [
      { "t": 0, "type": "down", "r": 0, "thetaDeg": 0 },
      { "t": 350, "type": "longpress" },
      { "t": 420, "type": "move", "r": 70, "thetaDeg": 0 },
      { "t": 500, "type": "up", "r": 70, "thetaDeg": 0 }
    ],
    "expectHighlights": [1],
    "expect": { "committed": null, "cancelled": true }
  },
  {
    "name": "a disabled wedge is offered and commits nothing: keyboard",
    "items": [
      { "id": "i0", "label": "i0" },
      { "id": "i1", "label": "i1", "enabled": false },
      { "id": "i2", "label": "i2" },
      { "id": "i3", "label": "i3" }
    ],
    "trace": [
      { "t": 0, "type": "open" },
      { "t": 100, "type": "key", "key": "ArrowRight" },
      { "t": 200, "type": "key", "key": "ArrowRight" },
      { "t": 300, "type": "key", "key": "Enter" }
    ],
    "expectHighlights": [0, 1],
    "expect": { "committed": null, "cancelled": true }
  },
  {
    "name": "a disabled item keeps its wedge: it counts toward the ceiling",
    "ceiling": [
      { "n": 8, "disabled": [1, 4, 6], "expectThrows": false },
      { "n": 9, "disabled": [0, 1, 2, 3, 4, 5, 6, 7, 8], "expectThrows": true }
    ]
  }
]
```

In the two trace cases, `expectHighlights` and `cancelled: true` are the rows
§4 marks as disputed. `committed: null` is the row both implementations
share. The `authored` case's last entry is §1's absent-means-unsaid clause,
and its `view-source` entry pins that only the standard authored-only verbs
are checked.

Applying these is a separate change: it bumps the vector version, adds the
paragraph to `notes` that every version has added, grows `runConformanceWith`
and the suite-type list in `tests/conformance.spec.mjs`, and amends the
contract's §1 — which its Conformance section says is what changing a vector
is.

### §6 What each host would do

**codecartographer (web).** Set `graph` on every context it opens: `'derived'`
over a parsed map, `'authored'` over a designed topology — its `MenuFacts`
already carries per-open facts into the resolver, so this is one more. Put
`reverse` and `edit-label` on the edge ring, which has room, and `add-node` on
the canvas ring, which does not and has to group. Its record's §5 stops
omitting and starts offering disabled, and its `Pends on` row carries this
proposal naming `rad`. Its conformance runner treats a case of unknown shape as
a behavioural trace, so it grows branches for `authored`, `items` and
`disabled` before it bumps the vector file it pins — otherwise the new cases
fall into the trace branch with no count and read as failures of the wrong
kind.

**dossier (terminal).** Has no graph, declares nothing, and its durable palette
holds none of the three verbs, so §1–§3 change nothing there. It is the second
implementation in §4's table. Its availability is a host callback rather than
`enabled` on the wedge, so its runner maps one onto the other. Until the second
`Pends on` item is settled, the two trace candidates are cases it reports
rather than passes — its own plan's rule for a case a terminal cannot express
— and the `ceiling` candidate it already asserts as a test.

**The reference page.** Declares nothing and is unchanged by §1–§3. The
applying change grows `openAt` by the refusal in §3.3 and grows the runner.

## Consequences

- The three verbs stop being a per-host omission and become a per-graph mode,
  and the mode travels with the intent. A recorded intent against a derived
  graph cannot be replayed as if it were an edit.
- A rule codecartographer's record states for its own gaps becomes a contract
  rule for the standard vocabulary, and the standard gains one check the
  vectors can see.
- The disabled-wedge path, which every host already relies on and nothing
  pins, gets its first vectors — and the disagreement between the two
  implementations is written down where the corpus collects such rows instead
  of being discovered by the third.
- Cost accepted: a wedge per edge ring and per canvas ring on every derived
  graph, and grouping on a canvas ring that is full.
- Cost accepted: one more optional field at the seam. It is plain data and it
  is optional. The standard's §4 lets a host extend `MenuContext.type` with its
  own values and says nothing about a new field, so this is an extension of the
  standard rather than a use of it — which is what a proposal is for.
- Cost accepted: two of the candidate traces will not pass on dossier until the
  second `Pends on` item is decided, and if it is decided dossier's way they
  are rewritten and the reference core changes — a vector first, then the core.

**The runnable candidates have been seen to fail.** Run against the reference
core at `a39d3bf` — `index.html` lines 492–817, the geometry through `step()`,
evaluated in node with a scratchpad runner that mirrors `runConformanceWith`'s
trace and ceiling branches plus the two schema extensions — the three runnable
cases pass and the `authored` case is reported as not runnable. Two mutations,
each in a scratch copy of the core and each restored:

    commit() no longer refuses enabled:false
      FAIL  a disabled wedge is offered and commits nothing: release-select — committed 1
      FAIL  a disabled wedge is offered and commits nothing: keyboard — committed 1

    assertRing counts only enabled items
      FAIL  a disabled item keeps its wedge: it counts toward the ceiling — n=9 disabled=[0,1,2,3,4,5,6,7,8] threw false

The `authored` case has not been seen to fail, because nothing implements what
it names. That is the honest state of a vector proposed before its behaviour,
and the applying change owes the mutation.

## Alternatives considered

1. **Leave it to each host's resolver** — no field, no check; a host sets
   `enabled` as it likes. Rejected: it is what exists today, and it produced a
   host omitting three verbs on one surface and needing them on the next with
   no word at the seam for the difference. Nothing would pin it and an intent
   would not know which graph it was committed against.
2. **Declare the mode per session** — `createSession({ graph })`. Simpler, and
   wrong for the host that raised it: codecartographer can show a parsed map
   and a designed topology in one surface, so the mode is a property of the
   graph under the pointer and not of the session.
3. **`rad` rewrites the spec** — set `enabled: false` on authored-only verbs
   itself when the graph is derived. Rejected: content is the host's by the
   standard's §1, and the contract's §1 forbids post-filtering a ring for the
   same reason. Refusing is the ceiling's idiom; rewriting would be a second
   place that decides what a menu holds.
4. **Omit rather than disable on a derived graph** — codecartographer's §5 as
   it stands. Rejected for the address argument in §3.2: omission moves every
   item after it, and a menu whose digits mean different things on two edges of
   one host cannot be documented.
5. **Pick the highlight and close behaviour here** — decide §4's disputed rows
   so the candidates are whole. Rejected: two consumers disagree and the
   contract's own text supports both; that is exactly the input the standard's
   §6 says one implementation cannot settle, and now two have produced it.
   Deciding it inside a record about three verbs would be deciding it by
   stealth.

## What this cannot do

It cannot make a host declare. A host that says nothing is unchanged, which is
the point of the absent clause and also its limit: a parsed graph offered with
`add-node` enabled and no `graph` field passes every vector. The obligation is
the host's, checked in the host's tests, as the standard's §5 obligations are.

It cannot check that a verb is *present*. `rad` does not know a host's
vocabulary, so §3.2 is a host obligation with the same standing as §5.3 of the
standard — asserted by the host, as codecartographer already asserts it for
`spread` and `cluster`.

It cannot say what a disabled wedge does to the highlight. §4 states the
disagreement and this record pends on it.

And it is evidenced by one core that this record could run and two ports read
rather than executed under the candidates. codecartographer's port mirrors the
reference `commit()` line for line; dossier's does not, and the table in §4 is
built from its source at `bd322d3` and its own tests, not from replaying these
cases against it.

## Revision triggers

- The second `Pends on` item is decided. The trace candidates are then
  finished one way or the other, and this record's §4 table becomes a clause.
- codecartographer's topology designer ships without needing one of the three
  verbs, or needs a fourth. The authored-only set was drawn from three verbs
  the contract already had; a designer that authors more than nodes, edge
  direction and labels will say what else is authored-only.
- A host arrives whose graph is neither — generated by a layout, say, or
  imported and then edited — and two values do not cover it.
- A host sets `graph` and its runner shows the intent arriving without it: the
  carry-through is the property §1 rests on.
- A third implementation of a disabled wedge behaves a third way.

## Amendments

*None.*
