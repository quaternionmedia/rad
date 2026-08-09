# Verification-shaped prose

| | |
|---|---|
| **Author** | Peter Kagström |
| **Date** | 2026-08-09 |
| **Status** | Perspective — non-binding opinion, binds nobody |
| **Tools** | Drafted with Claude Opus 5 under human direction; every claim of fact below was established by execution and the reproduction is quoted with it |

*Occasioned by the first full review of `rad`, whose findings are in
`REVIEW.md` and whose conflict table is §3 of the adoption record.*

---

## The thing I did not expect to find

`rad` arrived carrying more governance prose than most adopted projects: four
records with revision triggers, a conformance vector file, a metrics record
with budgets, a perspective on interpretive governance. It also arrived with no
`LICENSE`, no `REUSE.toml`, no `AGENTS.md`, no submodule, no ADR lint, and a
README whose first paragraph said it was *"governed by the records … under the
qm constitution."*

The corpus's rollout page has a category for this — *improvised* rather than
*instantiated* — and it is a good category. But the projects it was written for
are ones that carry no governance and know it. This is the opposite failure and
it is worse, because everything about the repository reads as governed. The
records use the right vocabulary. The vectors are real and they pass. Someone
auditing by looking would tick every box.

What I want to name is the specific shape of it, because I think it recurs and
I think this corpus is unusually good at producing it.

## Governance-shaped prose is cheap; verification is not

Every defect in `REVIEW.md`'s first section has the same structure: **a document
asserts a property, the machinery to check that property does not exist, and the
assertion is written in the confident register the corpus teaches.**

- The pipeline record says *"numbers in docs are measurements."* The generator
  that implements the record had the headline metric as a literal in a template
  string.
- The contract calls `conformance/vectors.json` its *"executable half."* The
  page ran an inline copy, and the two had already diverged.
- The metrics record sets grid jitter at p95 ≤ 1 ms. The gate asserted 5 ms
  while the README printed 1 ms.
- The README says accessibility is *"foundational, not bolted on"* and that two
  topics verify it. The topics counted attributes. The skip link did not work.

None of these is carelessness. Each is a document written by someone who
understood the principle well enough to state it precisely, and who then did not
build the check — because stating the principle *feels* like most of the work,
and in a corpus that values well-drafted records it is also the part that gets
reviewed.

The corpus already knows this at the org level. `governance-rollout.md` splits
"what is enforced today" from "what is written but not yet mechanical," and it is
scrupulous about the line. What I had not seen before is the same split *inside a
single project*, undeclared, with the written half pointing confidently at
machinery that does not exist.

## The asymmetry that makes it stick

An unenforced rule does not degrade gracefully. It degrades into a *claim that
the thing is already handled*, which is strictly worse than no rule, because it
suppresses the impulse to check.

The clearest instance here is the p95 figures. The README printed
`Grid jitter p95 | 0.00 ms | ≤ 1 ms` — a value, a budget, and the implication of
a distribution. The value came from a single measurement. Nobody lied; the
generator called a correct `p95` function on an array of length one. But the
table's *form* asserts a sample that its content does not contain, and a reader
checking whether the budget is met gets a confident yes from a number that could
not possibly answer the question.

I would rather have seen `Grid jitter: 0.42 ms (n=1)`. That is honest, it is
obviously insufficient, and it produces the impulse the polished version
suppressed.

## What I would ask of a record from now on

The g0 note in `perspectives/` proposes that records classify their own clauses
as *mechanical / checklist / judgment*, and be suspicious of the third pile
growing. Having now worked a project where the first pile was aspirational, I
would tighten it:

> **A clause claiming to be mechanical names the check, and the check exists
> before the clause ships.** If it does not exist yet, the clause is a checklist
> item and says so.

This is cheap. It costs one clause per rule and it makes the gap visible in the
diff where a reviewer is already looking. `rad`'s contract now carries it in the
places it matters — the ≤8 ceiling names its vector, the cancel bound names its
four vectors, the theme record names the test file. Those clauses are no longer
claims.

## The part I am least sure about

The corpus's answer to almost everything is *add a check*, and I have just spent
a session adding checks. There is a version of this that ends with a project
where the tests are the artifact and the thing itself is incidental — where every
property is asserted, nothing is designed, and the test suite is the largest
thing in the repository.

`rad` is not there, but it moved a long way in one session. The suite now covers
contract clauses, conformance drift, accessibility behaviour, contrast in three
themes, three tempo axes, and the metric definitions themselves. That is
proportionate to a project whose entire deliverable is *a contract plus evidence
that it holds* — the tests genuinely are the product here. I do not think it
generalises, and I would not want it to be read as a template.

The honest version: I do not know where the line is. I know that "the document
says so" is on the wrong side of it, and I know that a project whose thesis is
*govern the seam, not the artifact* had better be able to check its own seam —
which `rad` still cannot, because the platform-free core the contract requires
lives inside a 1,500-line file that also calls `document`. That gap is drafted,
not closed, and it is the one I would fix next.

## Two smaller things worth keeping

**A false negative is worth recording.** I suspected the submenu drag-through
left the machine in an inconsistent mode and it does not. Writing that down in
`REVIEW.md` costs two lines and tells the next reader something a list of
confirmed defects cannot: roughly how wide the net was.

**Measure your own instrument first.** My first attempt at "is the wheel
metered?" moved the mouse to position it and counted the resulting
`pointermove` as evidence. The reading was wrong in the direction that would
have cleared a real defect. The corpus's handoff contract already says to rule
out your own setup before reporting; the case it does not spell out is the one
where the harness produces a *plausible* number rather than an obvious error,
and there is nothing to alert you except re-running it differently.
