# AGENTS.md

This project is governed by the Quaternion Media constitution, vendored at
`governance/qm` (a submodule pinned to this project's `project/rad`
branch of that repo). If you are an AI coding agent opening this repo with
no other briefing, read this file fully before your first commit or edit.

## Before you do anything

1. Read `governance/qm/README.md` and `governance/qm/PRINCIPLES.md` in full
   — the namespaces/precedence rules and the charter. Both are short.
2. This project's own decision records live in `governance/qm/adr/` — inside
   the submodule, on this project's own branch, not at this repo's root — as
   `ADR-NNNN` (numbered locally, at ratification) or `DRAFT-*.md` before
   ratification. A human ratifies; you draft.
3. **Everything you produce arrives as a pull request.** Work on a branch and
   open a PR for human review — in this repo, and in the `governance/qm`
   submodule when you touch this project's records there. Never commit to,
   merge into, or push a shared branch directly, and never merge your own
   work, however small or mechanical the change looks. If you cannot open a
   PR, hand the branch back rather than merging it.
4. **Human-only contributorship applies to every commit you make here** (see
   `governance/qm/records/DRAFT-human-only-contributorship.md`): do not add
   yourself, your model name, or any co-author trailer naming an unmonitored
   address (e.g. a vendor `noreply@` address) to any commit. If your default
   tooling normally appends a `Co-Authored-By:` trailer, suppress it for
   this repo. Tool involvement is disclosed as a `Tools:` note where the
   artifact calls for one, never as a byline.
5. Follow the drafting-session handoff contract in
   `governance/qm/adr/README.md` before writing or amending any record.
6. A QM record may be tightened by this project's own records, never
   relaxed — see `governance/qm/README.md`'s "Namespaces and precedence."
7. Banned in any pre-ratification `DRAFT-*.md` record: "previously",
   "originally", "earlier draft", "re-review", "renumber", "retroactive",
   "supersedes the ... (stance|finding)", "corrected". Drafts are rewritten
   in place, not narrated. The ADR lint enforces this over prose only, so
   quoting the list in a code span is fine.

## One-time setup on a fresh clone (Windows)

`CLAUDE.md` and `.github/copilot-instructions.md` are real symlinks to this
file, not copies — POSIX checkouts resolve them with no setup. On Windows,
enable Developer Mode (Settings → For developers) and run `git config
core.symlinks true` once per clone, then `git checkout -- .` if the files
were already checked out before that. Skipping this doesn't break
anything — the files degrade to one-line pointers containing just the
target path — but it isn't the intended, tested experience; see the
IDE-integrated governance discovery record in `governance/qm/records/` for
what was actually verified.

<!-- Project-specific setup commands, test commands, and conventions belong
     below this line; this seed only carries the governance-discovery part. -->

---

## Where this project's governance actually is, today

**`adr/` is at this repository's root, not inside `governance/qm`.** That is a
known, named deviation from the model the section above describes, not a
variation someone preferred. The submodule cannot exist yet: it requires a
`project/rad` branch pushed to `https://github.com/quaternionmedia/qm`, and
creating a remote branch is a human decision. `adr/DRAFT-rad-adoption-and-scope.md`
carries the full gap list, the exact commands that close it, and what each one
verifies.

Until that lands:

- The records in `adr/` are real and binding on this project. Their **location**
  is provisional; their content and discipline are not.
- `.github/workflows/adr-lint.yml` is the verbatim seed workflow and **will fail**
  until the submodule exists, because the lint runs out of it. That failure is
  the gap reporting itself. Do not edit the workflow to make it pass.
- `tests/governance.spec.mjs` enforces the same drafting discipline locally in
  the meantime. It is a stopgap and says so; delete it when the submodule lands,
  because two copies of one check is the drift the seed arrangement exists to
  avoid.

## Working in this repository

```sh
npm ci                      # pinned; the lockfile is the claim
npx playwright install chromium
npm test                    # the whole suite, in two passes (see below)
npm run verify              # suite, then regenerate docs/ + README from its artifacts
npm run sync:vectors        # regenerate index.html's inline vector block from conformance/vectors.json
```

`ffmpeg` is optional, and `scripts/build-docs.mjs` looks for it before
concluding it is missing: `FFMPEG_PATH`, then `PATH`, then the places
applications bundle it (kdenlive, Ardour, Blender, winget/scoop/chocolatey
shims). "Not on PATH" is not "not installed" — on Windows it routinely is not.
If none is found the motion topics record a still frame and say so in the
generated page; they do not fail and they do not delete anything.

`npm test` runs twice on purpose: the bulk of the suite in parallel, then the
tests tagged `@timing` with a single worker. A latency budget cannot be
measured while seven other browsers compete for the CPU — the same assertion
measured p95 0.0 ms at three workers and 1.8 ms at eight, on identical code.
`npm run test:all` runs everything in one parallel pass and will intermittently
fail those two tests; that is the harness being measured, not a regression.

### Three rules specific to this repository

1. **`conformance/vectors.json` is the source of truth for the core's
   behaviour.** `index.html` carries a generated inline copy so the page runs
   from `file://` with no server. Never hand-edit the inline block — run
   `npm run sync:vectors`. `tests/conformance.spec.mjs` fails on drift.
2. **Changing the state machine means adding a vector first.** The corpus's
   precedent rule is that a divergence is captured at the cheap tier (a new
   vector) before the expensive one (amending the record). A pull request that
   changes `step()` without a vector covering the change will be sent back.
3. **`README.md`, `docs/guide/` and `docs/media/` are build output.** They are
   regenerated by `npm run verify` and CI fails if the committed copies differ
   from a fresh run. Edit `tests/topics.mjs`, never the output.
