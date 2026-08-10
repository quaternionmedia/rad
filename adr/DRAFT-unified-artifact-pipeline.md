# DRAFT — Unified artifact pipeline (tests = docs = README = media)

| | |
|---|---|
| **Status** | Draft |
| **Date** | 2026-08-09 |
| **Pends on** | version-tags-are-claims; P6 decisions documented; P9 minimal legible deliverables |

## Context

Documentation artifacts rot in a fixed order: screenshots first, videos second,
README claims third, guide prose last. Every project pays for this separately,
and review can't catch it because staleness looks identical to freshness.

qmetronome demonstrated the countermeasure: one `TutorialTopic` registry feeds
the in-app help (rendering the *live* composable), the generated user guide,
and the screenshot/video tests — with the topic id doubling as the media
filename, and Roborazzi set to re-record on every ordinary test run into a
tracked docs directory. rad has now reproduced the pattern in a second
stack (Playwright/Node): `tests/topics.mjs` + `tests/run.mjs`. Two instances,
per the second-data-point rule, is a record.

## Decision

A project adopting this record maintains **one topic registry**. Each entry
declares:

```
{ id,            // stable slug; doubles as every media filename
  title, prose,  // the documentation, written once
  drive(ctx),    // scripted interaction against the real artifact
  assert(ctx),   // machine-checked claims about the outcome
  video? }       // opt-in motion capture (GIF/webm derived from the run)
```

One harness run produces, atomically:

1. **Test results** — drive + assert per topic; any failure fails the build.
2. **Media** — screenshots at moments `drive` chooses (`ctx.snap()`), videos
   for `video: true` topics; all named by topic id, all overwritten each run.
3. **Guide pages** — one generated page per topic: prose + media +
   verification status.
4. **Index (README)** — generated: topic table with thumbnails, plus
   **measured values pulled from the running artifact** (metrics, extracted
   config like the chord vocabulary) — never hand-copied.

### Rules

- **Generated directories are build output.** They carry a do-not-edit marker;
  the harness deletes and rewrites them wholesale. Editing them is editing a
  compiled binary.
- **Prose lives only in the registry.** If a topic's description needs
  changing, the change lands next to the code that proves it.
- **Ids are append-only** like record numbers: media filenames, guide URLs,
  and test names all key off them; renaming an id is a migration, not a tweak.
- **Numbers in docs are measurements.** Any figure a document claims (a
  latency, a count, a vocabulary table) is read out of the artifact during the
  run. A number that can't be measured doesn't go in generated docs.
- **Staleness = redness.** The only way for media or README to be out of date
  is for the run not to have happened; CI runs it, so drift is a failed check,
  not a review burden.

### Interpretive-governance placement

This is the same shape as the interaction contract: the registry is the small
binding text, the harness run is the executable evidence, and each platform's
harness (Roborazzi/JUnit, Playwright/Node, XCTest next) is an interpretation.
The registry schema above is the seam; harnesses are replaceable per the
replaceability test. IPA discipline applies to the pipeline itself: one edit
(the registry entry) fans out to five artifacts — authoring cost is 1.

## Consequences

- Docs, README, and media cannot silently rot; the failure mode becomes
  visible and mechanical.
- Screenshots/GIFs churn in version control on visual changes. Accepted: that
  churn *is* the review diff for UI changes (qmetronome accepts the same).
- Harness time grows linearly with topics; budget one context per topic for
  isolation and parallelize only when wall-clock hurts.

## Alternatives considered

- **Doc linters that detect stale screenshots** — detects, doesn't regenerate;
  still leaves a manual loop.
- **Hand-curated hero media + generated test evidence separately** — splits
  the audience artifacts from the verified ones, which is exactly the rot
  vector this record removes.
- **Recording real human sessions** — better-looking motion, unreproducible;
  scripted drives replay identically on every machine.

## Revision triggers

- A third harness implementation lands (Compose/Roborazzi port for the
  rad Android module) — ratify as org record with the schema frozen.
- Registry prose needs audience variants (user guide vs. reference) — decide
  whether the schema grows fields or the pattern splits.
- Media churn makes repositories unwieldy (consider generated-artifact
  storage, e.g. LFS or release attachments, without breaking "staleness =
  redness").
