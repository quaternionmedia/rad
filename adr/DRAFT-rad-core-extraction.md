# DRAFT — rad core extraction

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-08-09 |
| **Pends on** | a human decision on whether the single-file deliverable becomes a build output (§3) |
| **Principle** | P3 seams on standard protocols; P9 minimal legible deliverables |

## Context

The *rad interaction contract* draft's Conformance clause requires a conformant
implementation to keep state machine and geometry in a platform-free core "*(no
DOM, no `android.*` imports), enforced by a grep lint in CI*". The reference
implementation does not satisfy the clause it defines. `index.html` is a single
file of roughly 1,500 lines containing, in order: the platform-free core, the
conformance runner, an application store, an SVG renderer, four input adapters, a
motion library, a demo driver and a tour. The core is delimited by a comment
banner.

A grep lint cannot exist against a comment banner. The file that would have to
pass "no `document`" contains several hundred references to it, and any lint
narrow enough to run against a line range is a lint against line numbers.

This has a second cost. The core is pure — `angleToIndex`, `step`,
`quantizeTime`, `estimateBpm`, `classifyBurst`, `splitBursts` — and pure code
that can only be reached through a browser is tested through a browser. The
conformance suite launches Chromium to evaluate functions that have no need of
one. That is slow, and more importantly it means a port author reading for the
reference semantics reads them interleaved with SVG path math.

The single-file property is not incidental and is not the problem. It is why the
demo has zero dependencies, runs from `file://`, deploys as one artifact, and can
be pasted into a message. Nothing here proposes giving it up.

## Decision

**Proposed, pending §3.** `index.html` becomes a *build output* rather than a
*source file*.

### §1 Layout

```
core/           geometry.mjs  machine.mjs  time.mjs  chord.mjs  resolve.mjs
                — pure ES modules, no DOM, no globals, no imports outside core/
dom/            view.mjs  pointer.mjs  keyboard.mjs  midi.mjs  theme.mjs
app/            store.mjs  motion.mjs  demo.mjs  tour.mjs
index.template.html
index.html      — GENERATED: template with every module inlined, in order
```

### §2 What this buys, stated as checks rather than benefits

- `grep -rlE '\b(document|window|navigator|HTMLElement)\b' core/` returns empty,
  and CI fails when it does not. The contract's clause becomes mechanical.
- `conformance/vectors.json` runs in Node against `core/` with no browser: the
  pure suite drops from a browser launch to milliseconds, and every port author
  gets a reference they can read in one directory.
- The inline vector block stops being generated into a hand-edited file and
  becomes one more inlined module.
- `index.html` gains the same "GENERATED — never edit" status `docs/guide/` and
  `docs/media/` already carry, enforced the same way: a CI drift gate.

### §3 The open question this record pends on

**Does the single-file artifact remain the thing humans edit?**

Today `index.html` is both the source and the deliverable, and that is
genuinely valuable: one file, no build step, no toolchain to install, editable by
anyone who can open a text editor. This decision trades that for a mechanical
import boundary.

The trade is not obviously correct. A build step is a dependency, and the
open-license and house-stack records both push against acquiring dependencies for
convenience. The build proposed here is a concatenation — inlining ordered modules
into a template, implementable in about fifty lines of Node with no packages — so
the dependency cost is near zero, but "near zero" is a claim about this build and
not about builds.

The counter-argument worth stating plainly: a project whose central thesis is
*govern the seam, not the artifact* currently cannot enforce its own seam. That
is not a tidiness complaint. If the import boundary is unenforceable in the
reference implementation, then "platform-free core" is a claim the reference
makes about itself and no port can check it against anything.

This record does not decide it. That is what `Pends on` is for.

## Consequences

- Positive: the contract's own conformance clause becomes satisfiable by the
  implementation that defines it; pure tests stop needing a browser; ports get a
  readable reference.
- Negative: a build step exists where none did. `index.html` can no longer be
  edited directly, which removes the property that makes this prototype pleasant
  to work on.
- Negative: the generated file must be committed, or the repository stops being
  deployable as a static site without CI. Committing it means a drift gate, which
  is one more way CI can be red for a reason unrelated to behaviour.
- Neutral: no runtime change. The output is byte-comparable to the current file
  modulo module ordering, and every existing vector must pass unchanged. If any
  vector's result moves, the extraction is wrong and is reverted rather than
  accommodated.

## Alternatives considered

1. **Leave it as one file and drop the lint clause from the contract.** Honest,
   and cheap. Rejected as the default because it resolves a gap between a claim
   and reality by lowering the claim, and the claim is load-bearing for every
   port. Worth revisiting only if §3 is decided against extraction — in which
   case the contract must stop requiring what it cannot get.
2. **A line-range lint over `index.html`.** No build step, boundary enforced.
   Rejected: it enforces line numbers rather than structure, and the first
   refactor inside the banner silently changes what is being checked.
3. **A bundler (esbuild, rollup).** Standard and well understood. Rejected for
   this shape: the entire requirement is ordered concatenation into a `<script>`
   block, and a bundler brings a dependency tree, a config file and a version
   surface to do it.
4. **Two files — `rad-core.mjs` plus `index.html` importing it.** No build step,
   real boundary. Rejected: ES module imports are blocked by CORS on `file://`,
   so the demo would stop running the way it is most often opened. That property
   is worth more than the simplicity.
5. **Extract the core to a separate published package.** Right answer eventually,
   if a second implementation consumes it. Premature now: one consumer, and
   publishing turns every core edit into a release.

## Revision triggers

- §3 is decided, either way — the record moves to Draft with the decision, or is
  Deprecated with the contract's lint clause amended in the same change.
- A port author reports that reading the reference semantics out of `index.html`
  cost real time. That is the concrete form of the argument this record is making
  abstractly, and one instance settles it.
- `index.html` passes roughly 2,000 lines, at which point the review burden
  argues on its own.
- A defect is traced to the core and the DOM layer having drifted apart inside
  the single file — the failure mode the boundary exists to prevent, observed.

## Amendments

*None.*
