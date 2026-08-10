# Interpretive governance — lessons consolidated for g0

*Perspective-style note, 2026-08-08. Non-binding. Starts fresh; nothing inherited
but lessons.*

## Designation

The project formerly discussed as "george" is designated **g0** — read
"gee-zero." The zeroth project: the one that governs numbering, so it takes the
number before the numbers. "george" survives only as prose nickname; code, repos,
branches (`project/g0`), and prefixes use `g0`. The designation is itself a
first act of the system it names: identifiers are cheap, stable, and assigned
once (records get numbers at ratification; the project that ratifies gets the
zero).

## The pattern this exercise demonstrates

The radial menu is governed the way qm governs projects: a small binding text
plus executable evidence, with implementations free to be idiomatic. Call it
**interpretive governance**: the constitution fixes *meaning*; implementations are
*interpretations*; conformance vectors are *case law*.

| Constitutional element | Radial menu instance | qm analogue |
|---|---|---|
| Binding text | interaction-contract record | records/ |
| Executable evidence | conformance/vectors.json | CI lints, rulesets-as-code |
| Interpretations | web SVG, Compose, SwiftUI ports | projects on `project/*` branches |
| Precedent accretion | "divergence → add a vector first" | amendments, append-only |
| Import boundary | platform-free `core/`, grep-linted | Glyph SDK two-file isolation |
| Version pinning | implementations pin vector semver | branch ancestry as pin |
| Governed metric | IPA budgets + abstraction ledger | version-tags-are-claims |

## Lessons g0 should inherit

1. **Govern the seam, not the artifact.** The cheapest durable agreement is a
   contract small enough to read plus tests mechanical enough to run. Everything
   replaceable stays ungoverned. (Replaceability test, applied to UI for the first
   time here.)
2. **Executable text beats interpreted text.** Every clause that could drift got a
   vector; every clause that couldn't (haptics "where the platform has one") got a
   checklist item. g0's records should classify their own clauses this way —
   mechanical / checklist / judgment — and be suspicious of the third pile growing.
3. **Precedent must be cheaper than amendment.** "Add a vector" is a one-line PR;
   "amend the record" is ratification. Divergences get captured at the cheap tier
   and only escalate when the vector format itself can't express the dispute. This
   two-tier structure is what keeps interpretation from meaning drift.
4. **Data, not closures.** Intents-as-strings made the contract serializable,
   testable, and platform-neutral; callbacks-as-code made the legacy menu
   ungovernable. Generalization: anything g0 wants to govern must first be
   forced into data.
5. **Edge-triggered obligations.** The contract requires highlight *changes*, not
   highlight *states*, to fire effects — obligations attach to transitions.
   Governance analogue: bind review/notification duties to state transitions
   (Draft→Proposed), never to standing conditions someone must remember to poll.
6. **The second data point rule.** qm's mobile-governance perspective deliberately
   waited for a second cross-platform project before proposing a "client/device
   application" class. This component is that second point; the class should now be
   proposed. g0 should adopt the same discipline: one instance is an anecdote,
   two is a record, and the *first* instance should say out loud what would confirm
   it.
7. **Drift is data.** The house-stack record says mithril+parcel; codecartographer
   ships Vite+uv. The correct response was already encoded as a revision trigger.
   g0's records should each name their own falsifier the same way — a record
   without a revision trigger is a dogma, not a decision.
8. **A metric is a record with a meter.** IPA works as governance because it has
   a definition (inputs at the L3 boundary), budgets (claims), a reference meter
   (the prototype HUD), and revision triggers. A driving metric missing any of
   the four is either advocacy or telemetry. The abstraction ledger (L0 events →
   L1 gestures → L2 transitions → L3 intents → L4 workflows) is the companion
   discipline: comparisons and budgets attach to exactly one level, and a
   function that reads two levels at once is misplaced. The systemization index
   (SI = surfaces bound to shared vocabulary ÷ surfaces implementing the
   capability) turns "are we one system?" into an enumerable list of drifted
   surfaces.

## What to watch (honest uncertainties)

- Two hand-ported state machines can pass identical vectors and still *feel*
  different (animation curves, latency). Vectors govern semantics, not feel;
  interpretive governance needs a stated boundary of what it does not claim.
- Case-law accretion can rot: 400 vectors nobody can read is as opaque as no spec.
  Budget a consolidation trigger (e.g. "vectors > 50 → refactor into named suites").
- Ratification bottleneck: qm requires a second active code owner; g0 should
  decide early whether agent-drafted, human-ratified scales past two humans, or
  whether conformance-passing itself earns a class of auto-ratifiable change.
