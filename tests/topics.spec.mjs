/* Runs the topic registry. One entry → one test, its media, and the artifact
 * scripts/build-docs.mjs turns into a guide page and a README row.
 *
 * Media go to docs/.staging/. Nothing under docs/media or docs/guide is
 * touched here — the swap happens in build-docs, after a green run. The old
 * harness emptied both directories before launching a browser, so any crash
 * left the working tree with the docs destroyed.
 */
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { TOPICS } from './topics.mjs';
import {
  bootPage, nodeCenter, touch, setTempo, snapshot, writeArtifact, ensureStaging, MEDIA,
} from './lib/harness.mjs';

test.describe.configure({ mode: 'parallel' });

for (const topic of TOPICS) {
  test.describe(topic.id, () => {
    test(topic.title, async ({ page }, testInfo) => {
      ensureStaging();
      const errors = [];
      // Emulated explicitly rather than through a describe-level test.use():
      // REDUCED is read once when the script is evaluated, so the media state
      // has to be in place before the first navigation — and measurably was not.
      if (topic.emulateMedia) await page.emulateMedia(topic.emulateMedia);
      page.on('pageerror', (e) => errors.push(`${e.message}\n${e.stack ?? ''}`));

      // Tests drive the axes fast on purpose. The shipped default is one action
      // per second, and exercising the axis beats waiting on the default —
      // topics that assert the default set it themselves.
      await bootPage(page, { closeTour: !topic.keepTour, tempo: { bpm: 240, div: 1, aps: 8, linked: false } });

      const media = [];
      const c = {
        page,
        snap: async (suffix) => {
          const name = topic.id + (suffix ? '-' + suffix : '') + '.png';
          await page.screenshot({ path: path.join(MEDIA, name) });
          media.push(name);
        },
        nodeCenter: (id) => nodeCenter(page, id),
        touch: () => touch(page),
        setTempo: (t) => setTempo(page, t),
        /** A point with no node under it — replaces the viewport-dependent
         *  magic coordinates the previous suite right-clicked at. */
        emptyPoint: async () => page.evaluate(() => {
          const pts = [...store.nodes.values()].filter(n => !n.hidden)
            .map(n => ({ x: n.x * view.k + view.x, y: n.y * view.k + view.y }));
          let best = null, bestD = -1;
          for (let x = 40; x < innerWidth - 40; x += 20) {
            for (let y = 120; y < innerHeight - 120; y += 20) {
              const d = Math.min(...pts.map(p => Math.hypot(p.x - x, p.y - y)));
              if (d > bestD) { bestD = d; best = { x, y }; }
            }
          }
          return best;
        }),
      };

      await topic.drive(c);
      if (!media.length) await c.snap();
      const failures = await topic.assert(c);

      const snap = await snapshot(page);
      const video = topic.video ? await page.video()?.path().catch(() => null) : null;

      writeArtifact(topic.id, {
        id: topic.id, title: topic.title, prose: topic.prose,
        media, video: video ?? null, snapshot: snap,
        failures, pageErrors: errors,
      });

      expect(errors, `page errors during ${topic.id}`).toEqual([]);
      expect(failures, `assertions for ${topic.id}`).toEqual([]);
      testInfo.annotations.push({ type: 'media', description: media.join(', ') });
    });
  });
}
