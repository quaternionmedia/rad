/* STOPGAP — delete this file when the governance submodule lands.
 *
 * The real check is `.github/workflows/adr-lint.yml`, copied verbatim from the
 * seed, which runs `governance/qm/project-seed/ci/adr_lint.py` out of the
 * submodule. That submodule cannot exist until a human creates `project/rad`
 * on the qm remote (adoption record §4), so the drafting discipline would
 * otherwise be enforced by nothing at all in the meantime.
 *
 * This is a test, not a copy of the lint: it asserts the properties, and when
 * the submodule arrives the lint becomes the single source and this file goes.
 * Two copies of one check is the drift the seed arrangement exists to avoid,
 * which is why its removal is written into the adoption record as a step.
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/harness.mjs';

const ADR = path.join(ROOT, 'adr');
const drafts = fs.readdirSync(ADR).filter((f) => f.startsWith('DRAFT-') && f.endsWith('.md'));

/* Mirrors adr_lint.py's BANNED. Drafts are rewritten in place, not narrated. */
const BANNED = /previously|originally|earlier draft|re-review|renumber|retroactive|supersedes the .* (?:stance|finding)|\bcorrected\b/i;

/* The lint reads prose only: fenced code, inline code spans and HTML comments
 * are stripped, so a document may quote the banned list without tripping. */
function proseOnly(text) {
  return text
    .replace(/^\s*```[\s\S]*?^\s*```/gm, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/`[^`]*`/g, '');
}

test('there are drafts to lint', () => {
  expect(drafts.length).toBeGreaterThan(0);
});

for (const f of drafts) {
  test.describe(f, () => {
    const raw = fs.readFileSync(path.join(ADR, f), 'utf8');

    test('carries no banned drafting vocabulary', () => {
      const hits = [];
      proseOnly(raw).split('\n').forEach((line, i) => {
        const m = line.match(BANNED);
        if (m) hits.push(`line ${i + 1}: "${m[0]}" in: ${line.trim().slice(0, 70)}`);
      });
      expect(hits).toEqual([]);
    });

    test('uses the seed template header shape', () => {
      const status = raw.match(/^\|\s*\*\*Status\*\*\s*\|\s*(.+?)\s*\|/m);
      expect(status, 'no "| **Status** | ... |" row — adr_lint.py will not see this file').toBeTruthy();
      expect(['Draft', 'Proposed', 'Accepted', 'Deprecated']).toContain(status[1].split(' ')[0]);
      expect(raw).toMatch(/^\|\s*\*\*Date\*\*\s*\|\s*\d{4}-\d{2}-\d{2}\s*\|/m);
    });

    test('a Proposed record names what it pends on', () => {
      const status = raw.match(/^\|\s*\*\*Status\*\*\s*\|\s*(.+?)\s*\|/m)[1];
      if (!status.startsWith('Proposed')) return;
      const pends = raw.match(/^\|\s*\*\*Pends on\*\*\s*\|\s*(.+?)\s*\|/m);
      expect(pends, 'Proposed without Pends on decides an open question by stealth').toBeTruthy();
      expect(pends[1].trim().length).toBeGreaterThan(3);
    });

    test('has the sections the template requires', () => {
      for (const h of ['## Context', '## Decision', '## Consequences', '## Alternatives considered', '## Revision triggers']) {
        expect(raw, `missing ${h}`).toContain(h);
      }
    });

    test('names at least one revision trigger', () => {
      const body = raw.split('## Revision triggers')[1] ?? '';
      const bullets = body.split('##')[0].split('\n').filter((l) => /^\s*[-*]\s+\S/.test(l));
      expect(bullets.length, '"never" is not an answer').toBeGreaterThan(0);
    });

    test('is numberless before ratification', () => {
      expect(f, 'a number is assigned at ratification, by the index, never during drafting')
        .not.toMatch(/^(ADR|QM)-\d{4}-/);
    });
  });
}

test('the index lists every draft in flight', () => {
  const readme = fs.readFileSync(path.join(ADR, 'README.md'), 'utf8');
  const listed = readme.split('Drafts in flight')[1] ?? '';
  const missing = drafts.filter((f) => {
    const title = fs.readFileSync(path.join(ADR, f), 'utf8').split('\n')[0].replace(/^#\s*DRAFT\s*—\s*/, '').trim();
    return !listed.includes(title);
  });
  expect(missing, 'drafts absent from the index — check 4 of the ADR lint').toEqual([]);
});

test('no ratified record has a body edit outside Amendments', () => {
  // Check 3 needs a base ref to diff against, which a single-branch working
  // tree does not have. It is skipped rather than passed silently, exactly as
  // adr_lint.py does without --base-ref.
  const accepted = drafts.filter((f) =>
    /^\|\s*\*\*Status\*\*\s*\|\s*Accepted/m.test(fs.readFileSync(path.join(ADR, f), 'utf8')));
  test.skip(accepted.length === 0, 'nothing is ratified yet, so there is no append-only body to protect');
});

test('the governance pointer files are symlinks, not copies', () => {
  // A copy method that dereferences a symlink is the defect the fork handbook
  // reports from alfred's adoption; it looks identical until AGENTS.md is edited.
  for (const p of ['CLAUDE.md', path.join('.github', 'copilot-instructions.md')]) {
    const st = fs.lstatSync(path.join(ROOT, p));
    expect(st.isSymbolicLink(), `${p} is a copy, so editing AGENTS.md will silently leave it stale`).toBe(true);
  }
});

test('licensing is declared for every path REUSE will see', () => {
  const toml = fs.readFileSync(path.join(ROOT, 'REUSE.toml'), 'utf8');
  expect(toml).toContain('SPDX-PackageName');
  for (const lic of ['Apache-2.0', 'CC-BY-SA-4.0', 'CC0-1.0', 'LicenseRef-QM-No-Grant']) {
    expect(toml, `${lic} is referenced nowhere`).toContain(lic);
    expect(fs.existsSync(path.join(ROOT, 'LICENSES', lic + '.txt')),
      `LICENSES/${lic}.txt is missing, so reuse lint will fail`).toBe(true);
  }
});

test('generated artifacts are marked as generated', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  expect(html, 'the inline vector block must announce that it is generated')
    .toContain('BEGIN GENERATED VECTORS');
  const guideDir = path.join(ROOT, 'docs', 'guide');
  if (!fs.existsSync(guideDir)) return;
  for (const f of fs.readdirSync(guideDir).filter((x) => x.endsWith('.md'))) {
    expect(fs.readFileSync(path.join(guideDir, f), 'utf8'), `${f} lacks a do-not-edit marker`)
      .toMatch(/Generated by/);
  }
});
