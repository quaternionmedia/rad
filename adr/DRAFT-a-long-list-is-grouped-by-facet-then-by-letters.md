# DRAFT — A long list is grouped by facet, then by letters

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-11-19 |
| **Pends on** | A second host's lists. One host's way of grouping is a description of that host, the caution the *rad host integration standard* states of its own seam; this rule is evidenced by apothecary alone. |
| **Checked against** | rad `dda7c92` (`main`); apothecary `2ac9b34e` |
| **Principle** | `decisions-are-documented`; `minimal-legible-deliverables` |
| **Tools** | Drafted with Claude Code (Anthropic); the person who ratifies it is its contributor of record |

## Context

The *rad interaction contract* caps a ring at eight items and makes overflow a
design error: the resolver must group into a submenu, and it raises on a ninth
item rather than draw it. The same record's revision triggers name "honest
grouping" and do not say what it is. The *rad host integration standard* gives
a menu's content to the host (§1), so each host decides how a long list becomes
submenus, and nothing holds two hosts to one answer.

The answers that come first are the ones the contract's cap invites, and a
host's own lists showed what each costs. Apothecary, a rad host with a pointer
and a keyboard (its viewer, `templates/fractal_viewer.html.j2`, and its
resolver, `apothecary/menu.py`), reviewed its lists on 2026-11-19 and found
three ways of cutting one:

- **Runs named for their first entry.** A sorted list was cut into runs of
  `⌈n / 8⌉`, each named for its first item: nine names made five runs, and a
  run's name said where it began and nothing of what it held.
- **Two other functions kept a list's own order**, each cutting it its own way.
- **Truncation.** A part's presets past the eighth were left off the ring, so a
  preset the part declared could not be reached from it.

The lists that were long were long because their items were of several kinds
at once: a site's pieces (walls, furniture, two machines, the plumbing, boards
on a bench), the parts of a catalogue. The word the host grouped them by meant
two things -- a site's subsystem and what a part is -- so the same piece
was a coupon in one list and a structure in another.

## Decision

**A list longer than its ring is grouped by a facet its items carry, then cut
by letters; nothing is dropped.**

1. **A facet first.** A facet is a named property of the items -- what a part
   is, the system a site's piece serves -- with at most eight values, written
   down once by the host in an order of its choosing (a vocabulary), never the
   order the items arrived in. A list longer than its ring whose items carry a
   facet is one submenu per value present, in the vocabulary's order, each
   named for its value. A facet with more values than a ring holds is not a
   facet of that ring; the host folds its values into eight it can name.

2. **What no value holds is folded, not loose.** Items the list's facet does
   not hold are gathered under one more cell named for what they are, and
   grouped there by a second facet. No item stands beside the values
   ungrouped.

3. **A list with no facet is cut by letters, near-equal.** A plain list of
   names is cut into as few runs as fit, of near-equal length, each named for
   the letters it spans (`a–e`, `f–p`), as many leading letters as tell its
   ends from its neighbours'. A list kept in its own order -- the newest first
   -- is cut in that order, each run named for its first entry.

4. **Nothing is dropped.** A value or a run with more than eight items is cut
   again by clause 3. A list that cannot be held after that is the contract's
   revision trigger, never a list to shorten.

5. **The cell that lists a context's values keeps its address.** Where the
   values come and go with what the ring is opened on, the cell holding them
   sits at one cell wherever the ring opens, and is shown disabled with its
   reason when there are none -- the stable address *The menu addresses nine
   cells* gives an item, applied to a grouping.

**Worked example: apothecary** (`apothecary/facets.py`, `apothecary/menu.py`'s
`_fit` and `_by_facet`, held by `tests/test_facets.py` and `tests/test_menu.py`).

| Facet | Values | Holds |
|---|---|---|
| Kind, what a part is | Electronics, Cameras, Machines, Motors, Test pieces, Shop, Housings, Things | the nineteen categories its parts are filed under, each whole in one kind |
| System, what a site's piece serves | Building, Furniture, Machines, Mechanical, Electrical, Plumbing, Lighting, Scenery | a site's words for its subsystems |

A site's eighteen top-level pieces are its Systems' six cells and a seventh,
Parts, holding the pieces that stand loose in it (the boards on the bench, a
test coupon, a whiteboard) by their kinds. The catalogue's parts are its eight
kinds, and a kind holding more than eight parts is cut by letters (`a–f`,
`r–t`). The canvas ring's cell of the level's values is cell 7 wherever it
opens, greyed with its reason where a level has none.

## Consequences

- **Two hosts group alike**, so a person who has found a thing in one host's
  ring looks for it the same way in another's: by what it is, then by its
  name.
- **A host writes its facets down.** The cost is a decision the host would
  otherwise defer -- what its items are, in eight words or fewer -- and it is
  accepted: apothecary's nineteen categories became eight kinds with no
  category changed, and the second meaning of its word became a facet of its
  own.
- **A letter run's edges move as a list grows**, so an item's address in a
  plain list can change when items are added. Accepted: a facet's cut does not
  move while its vocabulary holds, and letters are the cut for what has no
  facet to stand on.
- **No conformance vector holds a host to this yet.** Grouping is content, the
  host's under the integration standard, and the contract's vectors exercise
  the core. Should rad's core offer the cut of clause 3 as a function, its
  runs become vectors (`n` names in, run names out) and the clause is checked
  in every host by the same file.

## Alternatives considered

1. **Runs of eight named for their first entry.** -- The cut the cap invites,
   and the one apothecary ran. A run's name says where it starts, not what is
   in it, so a person opens runs until the item appears; nine names made five
   runs where two would hold them.
2. **A More cell that pages the list.** -- The contract rules out scrolling,
   and a More cell is a scroll paid for in presses. An item's address would
   depend on which page it fell on, which the nine-cells record exists to
   prevent.
3. **Truncating at eight.** -- Apothecary's page offered every preset in its
   Parameters while its ring held eight, so the menu stopped being the superset
   the contract makes it (the integration standard's §5.3 puts that on the
   host), and silently: nothing said what was left off.
4. **Letters always, facets never.** -- Uniform and needs no vocabulary. Lost
   because a person looking for "the coupon" in a site's pieces is looking for
   a test piece, not for whatever falls between `p` and `t`; where items have a
   kind, the kind is what a person looks by.
5. **Each host decides.** -- The arrangement today. Lost because the contract
   already obliges grouping and asks for it to be honest without saying what
   honest is, so two hosts teach two rules and neither is wrong.

## Revision triggers

- **A second host adopts this** -- the `Pends on` resolves -- or adopts it with
  a different fold for what no value holds (clause 2).
- **A host needs a facet of more than eight values** that a person still reads
  as one property, so clause 1's fold would split something people treat as
  whole.
- **Letter runs move an address a person relies on**, reported by a host,
  which would make the letter cut a cost rather than a fallback.
- **rad's core offers a grouping function**, and clause 3 becomes vectors.

## Amendments

*None.*
