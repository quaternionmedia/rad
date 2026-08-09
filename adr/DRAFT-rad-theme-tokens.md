# DRAFT — rad theme tokens

| | |
|---|---|
| **Status** | Draft |
| **Date** | 2026-08-09 |
| **Pends on** | the *rad interaction contract* draft |
| **Principle** | P3 seams on standard protocols; P9 minimal legible deliverables |

## Context

Colour arrived in this project as literals in three unrelated places: CSS custom
properties in the stylesheet, a `KIND_COLOR` map in JavaScript, and hex strings
embedded in the intent vocabulary itself (`color:#e5484d`). The three could not
be kept consistent, and one of them — the intent — is supposed to be a portable,
serializable contract value. A hex code in an intent cannot survive a theme
change, a light/dark switch, or a forced-colors mode, and it means two conformant
implementations can agree on meaning while disagreeing on bytes.

Measurement made the case concrete rather than aesthetic. The shipped palette put
the **Delete** wedge label at **4.17:1** against its wedge fill — below the 4.5:1
WCAG AA floor for normal-size text, on the one wedge where misreading is
expensive. The highlighted wedge label passed at 4.69:1, a margin of 0.19. Nothing
measured either number, and the README asserted that contrast rules were "in the
stylesheet, not an afterthought."

## Decision

### §1 One token layer, and nothing paints outside it

Every colour in `rad` is a CSS custom property in one declared set. No hex literal
appears in the stylesheet outside the token definitions, in JavaScript, or in an
intent. Code that needs a colour reads the token.

Tokens are split into two tiers, and the split is what makes theming tractable:

- **Palette tokens** — `--rad-ink`, `--rad-surface`, `--rad-accent`,
  `--rad-signal`, and the hues the graph kinds and swatches resolve to. Named
  for what they *are*.
- **Role tokens** — `--rad-wedge-fill`, `--rad-wedge-label`,
  `--rad-hub-stroke`, `--rad-focus-ring`. Named for what they *do*, and defined
  in terms of palette tokens.

Components reference role tokens only. A theme redefines palette tokens and
inherits every role; a theme that needs to break a role redefines that role
explicitly, which makes the exception visible in the diff.

### §2 Four themes, one contract

| Theme | Selector | Intent |
|---|---|---|
| `radical` | `:root` and `[data-theme="radical"]` — **the default** | The house mood: neon accents on a soft deep-indigo ground |
| `dark` | `[data-theme="dark"]` | The same neon family pulled back — lower chroma on a blue-black ground, for long sessions |
| `light` | `[data-theme="light"]`, and the `prefers-color-scheme: light` default | Daylight and print-adjacent contexts |
| `contrast` | `[data-theme="contrast"]` | Every foreground/background pair at ≥ 7:1 (AAA), no decorative transparency |

**`radical` is the default, and two of its decisions are load-bearing rather
than decorative.**

*The ground is soft, not black.* Saturated neon on `#000` vibrates — the eye
gets no low-frequency anchor and edges shimmer. A deep desaturated indigo gives
the accents something to sit on, and it is why the panel surface is defined as
*lifting off* the ground rather than merely differing from it.

*One hue deliberately does not glow.* Warm amber carries the `gold` token and
the `new` node kind. A palette where everything is neon reads as noise and
nothing is emphatic, so the counterweight is part of the palette rather than an
absence in it. `tests/theme.spec.mjs` asserts both properties, because "it
looks right" is not a check.

The theme is chosen by explicit selection, persisted in `localStorage`; with no
selection stored, `radical` is used — **except** where the system asks for
light, which wins. A neon dark theme forced on someone who set a light
preference is a preference being overruled, not a mood. `forced-colors: active`
overrides all four and is not a fifth theme — it is the platform taking over,
and the stylesheet's job there is to stop fighting it.

### §2b Where the palettes live

`scripts/check-palette.mjs` holds the four palettes and runs the same WCAG
maths the suite runs, offline, so a palette is tuned before it ships rather
than by watching a suite go red. The stylesheet is generated from it, and
`tests/theme.spec.mjs` asserts the shipped token values equal the benched ones.

Sixteen hex values duplicated across two hand-maintained files is exactly the
drift this project already had once, between `conformance/vectors.json` and its
inline copy. Naming the same failure mode twice in one repository is a reason
to mechanise it, not to be careful.

### §3 Contrast is a test, not an intention

Every `(foreground, background)` pair that renders text is asserted in
`tests/theme.spec.mjs`, in every theme, at the threshold for its **rendered
size**: 4.5:1 for normal text, 3:1 for text ≥ 18.66px or bold ≥ 14px, 3:1 for
the non-text boundaries (focus ring, selected-node stroke) that carry meaning.
`contrast` asserts 7:1.

The assertion computes WCAG relative luminance from the resolved token values at
runtime, so it tests what the browser paints rather than what the stylesheet
says. A palette change that breaks a pair fails the build, which is the only
mechanism that makes §1's "no literals" rule worth having.

Two honest limits, stated because a test that overstates its coverage is worse
than no test:

- Wedge labels are painted with a semi-transparent `paint-order: stroke` halo.
  The assertion measures label against wedge fill and **ignores the halo**, which
  makes it strictly conservative — the rendered contrast is at least the measured
  value, never less.
- Contrast is a floor, not a design. Passing 4.5:1 does not make a palette
  legible; it makes it not-illegal.

### §4 Colour verbs name tokens

The intent vocabulary uses `color:<token>` — `color:signal`, `color:calm`,
`color:leaf`, `color:royal`, `color:gold` — and never a literal. The renderer
resolves the token through the active theme. Chord words bind to the same token
names, so the chord vocabulary stops encoding a palette.

This is the "data, not closures" rule applied to colour: the intent stays
serializable and replayable, and a recorded session replays correctly under a
theme that did not exist when it was recorded.

## Consequences

- Themes are a data change. Adding a fifth is a palette entry plus a row in the
  contrast test, with no component edits — which is how `radical` was added
  after the first three shipped.
- The contrast failure that motivated this record cannot recur silently; it fails
  the build in all four themes at once.
- Intents recorded before this decision carry hex values and no longer resolve to
  a token. There is no migration, because no session log is persisted anywhere —
  the intent log is in-memory and per-page-load. If persistence is ever added,
  that feature owns the migration.
- Cost accepted: two token tiers is more indirection than a fifteen-colour
  prototype needs today. It is the smallest structure that lets a theme override
  meaning rather than appearance, and retrofitting the split after three themes
  exist is materially harder than starting with it.
- Cost accepted: reading colours from CSS in JavaScript means a `getComputedStyle`
  call per kind at render. Measured at well under a frame for the reference
  graph's twelve nodes; a port with thousands of nodes caches the resolution and
  invalidates on theme change.

## Alternatives considered

1. **Keep the single dark palette and fix the two failing pairs.** Cheapest, and
   it addresses the measurement. Rejected because it leaves the structural cause
   in place — three uncoordinated sources of colour, one of them inside the
   portable contract — so the next palette edit reintroduces the same class of
   defect with nothing to catch it.
2. **A JavaScript theme object as the single source, writing CSS variables at
   boot.** Puts colour where the graph-kind map already lives. Rejected: it makes
   the stylesheet unreadable on its own, breaks `prefers-color-scheme` without a
   scripted boot, and means a flash of unstyled colour on every load. CSS custom
   properties are the platform's answer and cost nothing.
3. **Ship `contrast` only, and drop the rest.** Tempting, since AAA
   everywhere is strictly safer. Rejected: a permanently high-contrast interface
   is genuinely unpleasant for extended use, and an accessibility affordance
   people turn off is worse than one they choose.
4. **Keep hex values in intents and translate at the boundary.** Preserves the
   existing vocabulary and vector file. Rejected: the translation table is a
   second source of truth with no natural home, and it makes the portable
   artifact the one carrying platform detail.

## Revision triggers

- A theme cannot satisfy §3 for a pair the design requires — the palette, the
  threshold, or the requirement is wrong, and the record says which.
- A host needs a literal colour in an intent for a reason the token layer cannot
  express (user-chosen colour, imported data).
- Token count passes roughly 40, at which point the two-tier split is doing less
  work than the naming overhead costs.
- `radical` measures as the wrong default — a reader's first act is reliably to
  switch away from it, or the neon proves tiring at length in a way the quieter
  `dark` theme does not.
- `forced-colors` handling needs more than declining to fight the platform.
- A second QM surface adopts this token layer — promote it toward an org record
  under the second-data-point rule.

## Amendments

*None.*
