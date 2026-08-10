/* Generate docs/guide/, docs/media/ and README.md from the artifacts a green
 * test run produced.
 *
 * Three rules from the unified-artifact-pipeline record, each of which the
 * previous harness broke:
 *
 *  1. NUMBERS IN DOCS ARE MEASUREMENTS. A figure that could not be measured
 *     fails the build. It does not degrade to `–` or `?`, and it is never a
 *     literal in a template string — the README's headline IPA row used to be
 *     exactly that.
 *  2. A PERCENTILE NEEDS A SAMPLE. p95 over one measurement is one
 *     measurement wearing a percentile's clothes; below MIN_SAMPLES this
 *     refuses to print rather than mislead.
 *  3. GENERATION NEVER DESTROYS. Everything is built in docs/.staging and
 *     swapped in at the end. The previous harness emptied docs/media and
 *     docs/guide before launching a browser, so a missing ffmpeg left sixteen
 *     tracked files deleted.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { TOPICS } from '../tests/topics.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STAGING = path.join(ROOT, 'docs', '.staging');
const ART = path.join(STAGING, 'artifacts');
const SMEDIA = path.join(STAGING, 'media');
const SGUIDE = path.join(STAGING, 'guide');
const MEDIA = path.join(ROOT, 'docs', 'media');
const GUIDE = path.join(ROOT, 'docs', 'guide');
const MIN_SAMPLES = 20;

const fail = (msg) => { console.error('build-docs: ' + msg); process.exitCode = 1; };
const die = (msg) => { console.error('build-docs: ' + msg); process.exit(1); };

if (!fs.existsSync(ART)) die(`no artifacts at ${path.relative(ROOT, ART)}. Run \`npm test\` first.`);
fs.mkdirSync(SGUIDE, { recursive: true });

/* ---------- load, and refuse to proceed on a partial run ---------- */
const arts = new Map();
for (const f of fs.readdirSync(ART).filter((x) => x.endsWith('.json'))) {
  const a = JSON.parse(fs.readFileSync(path.join(ART, f), 'utf8'));
  arts.set(a.id, a);
}
const missing = TOPICS.filter((t) => !arts.has(t.id)).map((t) => t.id);
if (missing.length) {
  die(`missing artifacts for: ${missing.join(', ')}\n` +
      `Every topic must have run. Docs are build output of verification — a partial run\n` +
      `would publish pages claiming a verification that did not happen.`);
}
for (const a of arts.values()) {
  if (a.failures?.length) fail(`topic "${a.id}" reported failures; refusing to generate docs from a red run`);
  if (a.pageErrors?.length) fail(`topic "${a.id}" logged page errors`);
}
if (process.exitCode) process.exit(1);

/* ---------- measurements, or nothing ---------- */
function p95(xs) {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(0.95 * (s.length - 1))];
}
/** Print a percentile only when it is one. */
function percentile(xs, unit, budget) {
  if (xs.length < MIN_SAMPLES) {
    fail(`p95 requested over ${xs.length} samples (minimum ${MIN_SAMPLES}). ` +
         `A percentile over a handful of measurements is not a percentile.`);
    return null;
  }
  const v = p95(xs);
  return { text: `${v < 10 ? v.toFixed(2) : Math.round(v)} ${unit}`, value: v, n: xs.length, ok: budget == null || v <= budget };
}

const chord = arts.get('chord-input').snapshot;
const quant = arts.get('quantized-commit').snapshot;
const speed = arts.get('speed-axes').snapshot;
const conf = arts.get('conformance').snapshot;

/* IPA is measured per verb, never asserted. The row this replaces was a
 * literal `| IPA, chord verbs | 1 | 1 |` inside the generator. */
const chordIntents = chord.intents.filter((i) => i.via === 'chord');
if (!chordIntents.length) die('no chord intents were recorded, so IPA cannot be measured');
const ipaMax = Math.max(...chordIntents.map((i) => i.cost));
const ipaVerbs = chordIntents.length;

const gestureIntents = arts.get('release-select').snapshot.intents.filter((i) => i.cost != null);
const ipaGesture = gestureIntents.length ? Math.max(...gestureIntents.map((i) => i.cost)) : null;
if (ipaGesture == null) die('no release-select intent was recorded, so gesture IPA cannot be measured');

const ttc = percentile(chord.ttcs, 'ms', 16);
const jit = percentile(quant.jits, 'ms', 1);
if (process.exitCode) process.exit(1);
if (!ttc.ok) fail(`TTC p95 ${ttc.text} exceeds the 16 ms budget`);
if (!jit.ok) fail(`grid jitter p95 ${jit.text} exceeds the 1 ms budget`);
if (ipaMax > 1) fail(`chord IPA reached ${ipaMax}, budget 1`);
if (ipaGesture > 1) fail(`release-select IPA reached ${ipaGesture}, budget 1`);
if (process.exitCode) process.exit(1);

/* ---------- media: find ffmpeg before concluding it is absent ----------
 * "not on PATH" is not "not installed". ffmpeg ships inside a lot of
 * applications — kdenlive, Ardour, OBS, Blender — and a Windows install
 * routinely leaves it off PATH entirely. Reporting it missing on that basis
 * degrades a GIF to a still for no reason, which is the same class of mistake
 * as reading the source instead of the artifact. Set FFMPEG_PATH to override.
 */
function resolveFfmpeg() {
  const candidates = [
    process.env.FFMPEG_PATH,
    'ffmpeg',
    // common bundled locations, Windows first because that is where PATH
    // misses it; harmless no-ops elsewhere
    'C:/Program Files/kdenlive/bin/ffmpeg.exe',
    'C:/Program Files/Ardour8/video/harvid/ffmpeg.exe',
    'C:/Program Files/Blender Foundation/Blender/ffmpeg.exe',
    'C:/ffmpeg/bin/ffmpeg.exe',
    `${process.env.LOCALAPPDATA ?? ''}/Microsoft/WinGet/Links/ffmpeg.exe`,
    `${process.env.USERPROFILE ?? ''}/scoop/shims/ffmpeg.exe`,
    `${process.env.ProgramData ?? ''}/chocolatey/bin/ffmpeg.exe`,
    '/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/opt/homebrew/bin/ffmpeg',
  ].filter(Boolean);
  for (const c of candidates) {
    try {
      const out = execFileSync(c, ['-version'], { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' });
      return { bin: c, version: out.split('\n')[0].replace(/^ffmpeg version /, '').split(' ')[0] };
    } catch { /* next */ }
  }
  return null;
}
const ffmpeg = resolveFfmpeg();
const haveFfmpeg = !!ffmpeg;
if (haveFfmpeg) console.log(`build-docs: ffmpeg ${ffmpeg.version} at ${ffmpeg.bin}`);
const gifs = new Map();
const notes = [];
/** The runner writes video.webm into the test's output directory when the
 *  context closes — after the test body has already written its artifact. */
function findVideo(a) {
  if (!a.outputDir || !fs.existsSync(a.outputDir)) return null;
  const hit = fs.readdirSync(a.outputDir).find((f) => f.endsWith('.webm'));
  return hit ? path.join(a.outputDir, hit) : null;
}
for (const a of arts.values()) {
  if (!a.wantsVideo) continue;
  if (!haveFfmpeg) {
    notes.push(`${a.id}: no ffmpeg found on PATH or in the usual install locations, ` +
               `so this page shows a still rather than motion (set FFMPEG_PATH to override)`);
    continue;
  }
  const video = findVideo(a);
  if (!video) { notes.push(`${a.id}: the runner produced no video file`); continue; }
  const gif = a.id + '.gif';
  try {
    // Crop to the band the interaction happens in before scaling. The frame
    // is a 390x900 phone viewport and the menu occupies the middle third, so
    // shrinking the whole thing spends most of the palette on empty canvas —
    // 1.4 MB for a README hero. A centred crop keeps the wedges legible at
    // 440 KB, and the expression is viewport-independent rather than a
    // hardcoded rectangle.
    execFileSync(ffmpeg.bin, ['-y', '-i', video, '-vf',
      // Proportional, and free of commas on purpose: a comma inside min() is
      // parsed as a filtergraph separator when the argv is handed straight to
      // ffmpeg with no shell, which silently produced a still instead of a GIF.
      'crop=iw:ih*0.47:0:ih*0.27,fps=10,scale=340:-1:flags=lanczos,' +
      'split[a][b];[a]palettegen=max_colors=64[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
      path.join(SMEDIA, gif)], { stdio: 'ignore' });
    gifs.set(a.id, gif);
  } catch (e) {
    notes.push(`${a.id}: ffmpeg failed (${e.message.split('\n')[0]}); the page shows a still`);
  }
}
if (!haveFfmpeg) console.warn('build-docs: no ffmpeg found — motion topics degrade to stills (this is not a failure)');

/* ---------- guide pages ---------- */
for (const t of TOPICS) {
  const a = arts.get(t.id);
  const gif = gifs.get(t.id);
  const lines = [
    `# ${a.title}`, '',
    a.prose, '',
    ...(gif ? [`![${t.id}](../media/${gif})`, ''] : []),
    ...a.media.map((m) => `![${m}](../media/${m})`), '',
    `**Verified:** ✓ all assertions pass · vectors v${a.snapshot.vectorsVersion} · ${a.snapshot.vectorCount} cases`, '',
    '*Generated by `scripts/build-docs.mjs` from a green `npm test` run — edits here are',
    'overwritten; edit `tests/topics.mjs`.*', '',
  ];
  fs.writeFileSync(path.join(SGUIDE, t.id + '.md'), lines.join('\n'));
}

/* ---------- README ---------- */
const chordRows = Object.entries(conf.chordMap).map(([w, v]) => `| \`${w}\` | \`${v}\` |`).join('\n');
const geom = conf.geometry;
const cc = speed.midiCc;

const readme = `# rad

**QM's default radial menu.** A platform-neutral interaction contract, executable
conformance vectors, and a single-file web reference implementation
(\`index.html\`, zero runtime dependencies) that **teaches itself**: the built-in
Tour is a linked list of actions that run live on the graph, ghost-finger and
all, paced by the same clock the menu commits on.

Governed by the records in [adr/](adr) under the
[qm constitution](https://github.com/quaternionmedia/qm); adoption status, the
conflict table, and the steps still owed are in
[adr/DRAFT-rad-adoption-and-scope.md](adr/DRAFT-rad-adoption-and-scope.md).
An honest review of this repository is in [REVIEW.md](REVIEW.md).

**Vectors v${conf.vectorsVersion} · ${TOPICS.length}/${TOPICS.length} topics verified · ${conf.vectorCount} conformance cases · ${conf.themes.length} themes**

The contract is the seam: a platform-neutral interaction contract plus
executable conformance vectors. This web prototype is the reference
implementation; Android/Compose is specified in
[adr/DRAFT-rad-platform-plans.md](adr/DRAFT-rad-platform-plans.md).

![release-select](docs/media/${gifs.get('release-select') ?? 'release-select.png'})

## Topics

Every row below is generated from one entry in \`tests/topics.mjs\` — the same
entry is the e2e test, the guide page, and the media producer.

| | Topic | Status |
|---|---|---|
${TOPICS.map((t) => {
  const a = arts.get(t.id);
  return `| ![${t.id}](docs/media/${a.media[0]}) | [**${a.title}**](docs/guide/${t.id}.md) — ${a.prose.split('. ')[0]}. | ✓ |`;
}).join('\n')}

## Measured (this run)

Every number here was read out of the running artifact during the run that
generated this file. A figure that cannot be measured fails the build rather
than printing a placeholder, and a percentile below ${MIN_SAMPLES} samples is refused
rather than reported.

| Metric | Value | Samples | Budget |
|---|---|---|---|
| IPA, release-select gesture | ${ipaGesture} | 1 verb | 1 |
| IPA, chord verbs (worst case) | ${ipaMax} | ${ipaVerbs} verbs | 1 |
| TTC p95, chord | ${ttc.text} | ${ttc.n} | ≤ 16 ms |
| Grid jitter p95, quantized | ${jit.text} | ${jit.n} | ≤ 1 ms |

## Speed: three axes, MIDI-drivable

Tempo sets the beat grid, Grid subdivides it, and Actions is the rate scripted
playback issues intents — linked to tempo by default, freeable. The shipped
default is deliberately slow, because a demo paced for its author teaches
nothing: **${speed.tempo.bpm} bpm, ${speed.tempo.aps} action per second**.

| Axis | Range | Default | MIDI CC |
|---|---|---|---|
| \`bpm\` | 30–300 | ${speed.tempo.bpm} | ${cc.bpm} |
| \`div\` | ½ · 1 · 2 · 3 · 4 per beat | ${speed.tempo.div} | ${cc.div} |
| \`aps\` | 0.25–8 | ${speed.tempo.aps} (linked) | ${cc.aps} |
| quantize | off · beat · bar | off | ${cc.quantize} |

System Real-Time transport drives playback: \`0xFA\` start, \`0xFB\` continue,
\`0xFC\` stop. The interaction constants (\`longPressMs\`, slop, the burst window)
deliberately do **not** scale with tempo — that would make every conformance
vector tempo-dependent.

## Themes

${conf.themes.map((t) => `\`${t}\``).join(' · ')} — palette swaps over one token layer. Every text pair is
contrast-tested in every theme at the WCAG threshold for its rendered size, and
\`color:\` intents name palette tokens (${conf.swatchTokens.map((s) => `\`${s}\``).join(', ')}), never
literals, so a recorded intent replays correctly under a theme that did not
exist when it was recorded.

## Geometry (extracted live)

| | |
|---|---|
| dead zone \`r₀\` | ${geom.r0} |
| ring outer \`r₁\` | ${geom.r1} |
| cancel bound \`r_cancel\` | ${geom.rCancel.toFixed(1)} (${geom.cancelScale} × r₁) |
| items per ring | ≤ ${geom.maxItems}, enforced |
| long press | ${geom.longPressMs} ms, slop ${geom.slop} |

Inward of \`r₀\` and outward of \`r_cancel\` are the same cancel affordance, and
both commit styles agree about every radius.

## Chord vocabulary (extracted live from the prototype)

Prefix-free — asserted by a conformance vector, because that property is what
the latency claim rests on. A known word commits on its last keystroke.
CharaChorder-class devices hit these as single chords over plain HID.

| word | verb |
|---|---|
${chordRows}

## Layout

\`\`\`
index.html                the splash: demo + tour + meters, single file, no deps
conformance/vectors.json  executable half of the contract (v${conf.vectorsVersion}) — the SOURCE;
                          index.html's inline block is generated from it
adr/                      governed records under the qm constitution
perspectives/             non-binding notes
tests/topics.mjs          the one registry: tests = docs = README = pics = vids
tests/*.spec.mjs          contract · conformance · a11y · theme · speed · metrics
scripts/build-docs.mjs    regenerates this file and docs/ from a GREEN run
docs/guide/  docs/media/  GENERATED — never edit; every file is test output
.github/workflows/        CI: the suite gates the Pages deploy, on PRs too
\`\`\`

## Accessibility

Keyboard is a complete path: Tab reaches the graph, arrows walk node focus
geometrically, Enter opens the menu, arrows + Enter commit. The skip link moves
focus rather than only the scroll position; the menu traps Tab while open;
wedges are labelled menuitems; **exactly one** live region announces, with the
intent log hidden from assistive tech rather than competing with it;
\`prefers-reduced-motion\` collapses every animation, including the tour's, to end
states at any tempo; touch targets respect a 44px floor. These are asserted by
driving the behaviour, not by checking that the elements exist.

${notes.length ? `## Notes from this run\n\n${notes.map((n) => `- ${n}`).join('\n')}\n` : ''}
*README generated by \`scripts/build-docs.mjs\`. Numbers above are measurements,
not copy — if they are stale, the build is red.*
`;

/* ---------- --check: structural drift, not byte equality ----------
 * Two things in this output are legitimately different on every run, so a
 * `git diff --exit-code` gate over it would fail permanently and teach people
 * to ignore it:
 *
 *   - MEASURED VALUES. "Numbers in docs are measurements" means TTC p95 is
 *     0.80 ms on one run and 1.40 ms on the next. That is the rule working.
 *   - SCREENSHOTS. CI renders on Ubuntu; a contributor renders on Windows or
 *     macOS. The bytes will never match, whatever anyone does.
 *
 * So the gate compares what a stale checkout actually gets wrong: the topic
 * list, the prose, the chord vocabulary, the geometry, the vector version, the
 * generated guide pages. The Measured table's own values are masked, and media
 * are left to the diff a reviewer reads — which the pipeline record already
 * accepts as the review artifact for a UI change.
 */
function maskMeasurements(md) {
  return md.replace(/(## Measured \(this run\)[\s\S]*?)(\n## )/, (_, table, tail) =>
    table.replace(/\|\s*[\d.]+(?:\s*ms)?\s*\|/g, '| «measured» |')
         .replace(/\|\s*\d+\s+verbs?\s*\|/g, '| «n» verbs |') + tail);
}

if (process.argv.includes('--check')) {
  const problems = [];
  const committedReadme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  if (maskMeasurements(committedReadme) !== maskMeasurements(readme)) {
    problems.push('README.md differs from a fresh run (ignoring measured values)');
  }
  for (const t of TOPICS) {
    const f = path.join(GUIDE, t.id + '.md');
    if (!fs.existsSync(f)) { problems.push(`docs/guide/${t.id}.md is missing`); continue; }
    if (fs.readFileSync(f, 'utf8') !== fs.readFileSync(path.join(SGUIDE, t.id + '.md'), 'utf8')) {
      problems.push(`docs/guide/${t.id}.md differs from a fresh run`);
    }
  }
  for (const t of TOPICS) {
    for (const m of arts.get(t.id).media) {
      if (!fs.existsSync(path.join(MEDIA, m))) problems.push(`docs/media/${m} is missing`);
    }
  }
  fs.rmSync(STAGING, { recursive: true, force: true });
  if (problems.length) {
    console.error('build-docs --check: generated artifacts are out of date.');
    problems.forEach((p) => console.error('  - ' + p));
    console.error("Run 'npm run verify' and commit the result.");
    process.exit(1);
  }
  console.log(`build-docs --check: README and ${TOPICS.length} guide pages match a fresh run`);
  process.exit(0);
}

/* ---------- swap in, only now that everything succeeded ---------- */
for (const dir of [MEDIA, GUIDE]) fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(path.dirname(MEDIA), { recursive: true });
fs.cpSync(SMEDIA, MEDIA, { recursive: true });
fs.cpSync(SGUIDE, GUIDE, { recursive: true });
fs.writeFileSync(path.join(ROOT, 'README.md'), readme);
fs.rmSync(STAGING, { recursive: true, force: true });

console.log(`build-docs: README + ${TOPICS.length} guide pages + ${fs.readdirSync(MEDIA).length} media files`);
console.log(`  IPA gesture ${ipaGesture} · IPA chord ${ipaMax} over ${ipaVerbs} verbs`);
console.log(`  TTC p95 ${ttc.text} (n=${ttc.n}) · grid jitter p95 ${jit.text} (n=${jit.n})`);
notes.forEach((n) => console.log('  note: ' + n));
