import { defineConfig, devices } from '@playwright/test';

/* The harness that replaced tests/run.mjs.
 *
 * The topic registry (tests/topics.mjs) survives unchanged in shape — it is the
 * single source the unified-artifact-pipeline record requires, and it still
 * feeds tests, guide pages, media and the README from one entry. What changed
 * is what runs it: a bespoke 197-line script became a real runner, with
 * isolation, retries, traces, parallelism and a failure report that includes a
 * stack rather than one line of `e.message`.
 *
 * Media and docs are produced by `scripts/build-docs.mjs` AFTER a green run,
 * from artifacts the tests write. The old harness emptied docs/media and
 * docs/guide before launching a browser, so a crash — a missing ffmpeg was
 * enough — left sixteen tracked files deleted and seven modified.
 */
export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // No retries, anywhere. version-tags-are-claims §3: a test that retries
  // "contributes nothing" to a release claim, and §7 requires CI to fail a
  // release build whose run reports a rerun. A retry that turns a red run
  // green is the exact mechanism that launders a timing dependency into a
  // green check, so the option is not available rather than merely unused.
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 7_000 },
  // The JSON report is not a convenience: scripts/check-gate.mjs reads it to
  // establish that the run was deterministic, so it is produced on every run
  // rather than only in CI.
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]]
    : [['list'], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    // The deliverable is a single file with no server. Testing it over http://
    // would test something the audience never loads.
    baseURL: undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Pixel 7'],
    viewport: { width: 390, height: 900 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
    // Themes read prefers-color-scheme when nothing is stored. Pinning it
    // keeps the default deterministic; tests/theme.spec.mjs overrides it.
    colorScheme: 'dark',
  },
  projects: [
    // video must be set per project, not per describe — Playwright forces a new
    // worker for it. Topics that do not ask for motion simply ignore the file.
    { name: 'touch', use: { hasTouch: true, isMobile: true, video: { mode: 'on', size: { width: 390, height: 900 } } } },
    {
      name: 'desktop',
      // touch.spec.mjs is deliberately absent: it asserts coarse-pointer rules
      // that do not apply to a mouse. Excluding the file is how those run
      // unconditionally where they mean something, instead of skipping here.
      testMatch: /(contract|conformance|a11y|theme|speed|metrics|governance)\.spec\.mjs/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 860 }, hasTouch: false, isMobile: false, colorScheme: 'dark' },
    },
  ],
});
