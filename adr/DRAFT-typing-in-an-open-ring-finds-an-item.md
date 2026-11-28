# DRAFT — Typing in an open ring finds an item by the keys that reach it

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-11-27 |
| **Pends on** | A second host. One host's search describes that host, the caution the *rad host integration standard* states of its own seam; this rule is evidenced by the reference and by apothecary alone. |
| **Checked against** | rad `dda7c92` (`main`); apothecary `538daf70` (`main`) |
| **Principle** | `decisions-are-documented`; `minimal-legible-deliverables`; `seams-on-standard-protocols` |
| **Tools** | Drafted with Claude Code (Anthropic); the person who ratifies it is its contributor of record |

## Context

*The menu addresses nine cells* gives every item an address: the digits of its
cells, pressed through the rings that hold it. Its cost floor -- any item two
inputs from idle -- holds for a person who knows the address. A person who does
not know it walks rings looking, and the deeper a host's tree, the longer the
walk: apothecary's rings run four deep (`Device › Control › Jog › Y+` is `4728`
on a node ring), and *a long list is grouped by facet, then by letters* puts a
site's pieces two levels under its canvas ring.

What a person has instead of the address is the word on the wedge. Both
implementations of the ring leave that word unused while a ring is open:

- the reference page, while a menu is open, acts on the arrows, Enter and
  Escape and drops every other key, and traps Tab (the *rad interaction
  contract*'s focus trap, `index.html`'s keydown handler);
- apothecary's ring (`apothecary/static/ring.js`, `keyDown`) acts on the digits,
  the arrows, Enter, Space, Backspace and Escape, and takes every key while it
  is open so nothing else on the page sees one.

So in an open ring the letters and Tab are free in both, and a query typed
there takes no key from anything. While a ring is closed the letters are not
free -- the reference reads them as chord words, apothecary as the page's
shortcuts -- and nothing here touches them.

## Decision

**Letters typed while a ring is open search the ring's whole tree. Each result
shows the keys that reach it; Tab completes the query to a result, and Enter
presses that result's keys. A choice made by searching is followed by the keys
that would have made it.**

1. **The query has its own keys, and they are none of the ring's.** While a
   ring is open, a key that prints one character -- not a digit, not a space,
   and pressed with no Ctrl, Alt or Meta -- begins a query or extends it. Once
   a query has begun, Space extends it, Backspace takes its last character, Tab
   completes it (clause 5) and Enter chooses (clause 5); Escape lets it go.
   With no query, each of those keys does what it does in the ring. A key of the
   ring's own -- a digit, an arrow, a press on a wedge -- lets the query go and
   does what it does. A modifier pressed alone (Shift, to type a capital) is no
   key and changes nothing. So typing never changes what a ring's key does, and
   a person who never types loses nothing.

2. **What matches.** A query and an item's path are read as **tokens**: each
   run of letters and digits is one token, and each other character that is
   not a space is a token of its own, all lower-cased. An item's path is the
   labels from the root ring down to it, joined by ` › `. An item matches when
   every token of the query is the start of some token of its path. `bed`
   finds `Heat › Bed on`; `y-` finds `Jog › Y-` and not `Jog › Y+`. Every item
   of the tree is searched, wherever the ring stands: a submenu as well as a
   leaf, and one that cannot be chosen as well as one that can.

3. **The order is the tree's, and nothing else.** Matches come in three keys
   of order: first those whose own label holds every token of the query, then
   those that needed their path; within each, fewer keys first; then the tree's
   own order, an item before its children and a ring's items in their order.
   No frequency, no recency, no score: the same query on the same tree gives
   the same results every time, which is what lets a vector hold it.

4. **A result shows the keys that reach it.** They are the keys pressed from a
   closed ring: the host's key that opens this ring, then the item's address --
   the cell of each item on its path, from the root, each cell the one
   *the menu addresses nine cells* places that item in. The core gives the
   address; the opening key is the host's. A host may list keys of its own
   among the results -- a shortcut outside the ring, matched by the words it is
   known by -- each showing its key. A result that cannot be chosen is shown as
   such, with its reason where the host has one.

5. **Tab completes; Enter presses.** Tab replaces the query's text with the
   first result's path; pressed again, the next result's, and round; the
   results stay those of the text typed. Typing again carries on from the text
   shown. Enter chooses the result Tab is on, or the first: it **presses the
   result's address from the root**, one cell at a time, with the effects
   pressing those cells has. A submenu is entered and the ring stays open
   there; a leaf is committed; one that cannot be chosen is refused as a press
   on it is; one the host asks to be pressed twice asks. A host's own key is
   pressed as that key. With no result, Tab and Enter do nothing.

6. **A choice made by searching says its keys.** When Enter has made a choice,
   the host says once, where it says other things, the keys that would have
   made it (`m 8 2`), so the next time is pressed rather than typed. It never
   waits, blocks or asks.

7. **A search seats nothing.** Results are listed, never placed in cells: the
   ring's cells, its addresses and its drawing are the same with a query as
   without one.

**Where it is checked.** `conformance/vectors.json` carries a `search` suite:
`find` cases (a query on a tree, the results in order, each with its address),
`type` cases (keys in, the query's text and the choice out, with which keys the
query let pass to the ring) and `walk` cases (an address pressed into the
machine, the effects out). The reference's core holds the suite with
`searchMenu`, `typeQuery` and the machine's `cell` input, which is the
*rad host integration standard*'s §2b cell, choosing the item placed at that
cell and backing out at `5`.

## Consequences

- **The address is taught where it is used.** A result's keys are on screen as
  the person reads the word they came for, and the reminder repeats them after
  the choice. Whether that moves people from typing to pressing is what
  *interaction efficiency metrics* can measure; this record claims the
  opportunity, not the effect.
- **A digit cannot be searched for.** Digits are cells (clause 1), so a label's
  digits are never part of a query: `Hotend 200` is found by `hot`, never by
  `200`. Accepted, because the alternative takes the digits away exactly when
  a result has just shown them.
- **The reference's machine takes cells.** Walking an address is pressing it,
  so the machine needed the cell input §2b names; the `walk` cases hold it. The
  reference still draws its wedges by angle, so above four items a pressed cell
  and the wedge it lights point different ways -- *the menu addresses nine
  cells*' clause 4, priced there, and §2b's unsettled question of whether a
  ring that takes cells should label its wedges. Search does not settle it.
- **The public seam grows by two functions**, `searchMenu` and `typeQuery`,
  both pure. They hold no state between calls; a host keeps the query.
- **The vector coordinate moves** from `0.0.1` to `0.0.2`, unclaimed until the
  implementations on the surface replay it (*rad release milestones* §1).
- **A host whose ring takes letters for something else must choose.** None is
  known. A ring that underlines an accelerator letter per item would collide
  with clause 1, and this record would lose to it only by a revision.

## Alternatives considered

1. **A search window beside the ring** -- a command palette. A second surface,
   opened by a key of its own, that teaches the palette rather than the ring:
   the keys it would remind of are keys the palette does not use. A host may
   still offer one; it is not the ring's.
2. **Filtering the ring to its matches.** The matches would be seated afresh,
   so the cells shown would not be the cells that reach the item next time.
   Holding an address still is what *the menu addresses nine cells* exists for,
   and clause 7 keeps it.
3. **Digits join a query once it has begun.** A result shows its digits, and a
   person who reads `8 2` and presses it mid-query should be choosing, not
   typing `82`. Shadowing the address while a query is up shadows it at the
   moment it is being taught.
4. **Fuzzy matching with scores** (letters in order, gaps allowed). A score is
   a number a second implementation computes differently, and the order would
   be the scorer's rather than the tree's. Token prefixes are exactly
   reproducible, and they are how people type words they have just read.
5. **Ranked by use.** Two opens of the same tree would list different results,
   no vector could hold them, and the reminder exists so that the items used
   most stop being searched for.
6. **Enter enters submenus only.** The *rad host integration standard*'s
   proposed §2c lets a session open entered at an item and refuses to enter a
   leaf, so that an open never chooses on a person's behalf. Here the person
   chose, by pressing Enter on a result they read; nobody chooses for them.

## Revision triggers

- **A second host searches its ring** -- the `Pends on` resolves -- or searches
  it by a different match or order.
- **A host's tree is one where token prefixes find too much or too little**,
  reported with the queries, which would make clause 2 the wrong rule.
- **A host needs digits in a query**, which reopens clause 1 and alternative 3.
- **A ring takes letters while open for something else**, in any host.
- **Measured inputs per action do not fall** for people who search, after the
  reminder: the keys are shown and not learnt, and clause 6 is decoration.
- **A tree large enough that searching it on every key is slower than a
  frame**, which would make the whole-tree search a cost rather than free.

## Amendments

*None.*
