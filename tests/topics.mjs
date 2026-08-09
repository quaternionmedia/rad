/* Topic registry — the single source of truth for tests, docs, README,
 * screenshots, and videos. One entry produces, on every run:
 *   - an e2e test (drive + assert)
 *   - docs/guide/<id>.md          (generated page)
 *   - docs/media/<id>*.png        (screenshots; id doubles as filename)
 *   - docs/media/<id>.gif         (when video: true)
 *   - a row in the generated README
 * Pattern extracted from qmetronome's TutorialTopic pipeline.
 */

export const TOPICS = [
  {
    id: 'tour',
    keepTour: true,
    title: 'Onboarding tour (the page teaches itself)',
    prose: 'The splash opens with a single Tour panel — the only menu on the page. Every entry is a linked action: press ▶ and the ghost finger performs the feature on the live graph through the same code path real input uses. Steps are hash-addressable (#t-release-select) and marked once shown.',
    drive: async (c) => {
      await c.page.waitForTimeout(200);
      await c.snap();                                   // tour open on load
      await c.page.click('#t-release-select .go');      // run a step from the list
      await c.page.waitForTimeout(2600);
      await c.snap('step-ran');
    },
    assert: async (c) => {
      const f = [];
      const seen = await c.page.evaluate(() => tourState.seen.has('release-select'));
      if (!seen) f.push('step not marked seen');
      const it = await c.page.evaluate(() => store.intents.find((i) => i.action === 'select-neighbors'));
      if (!it) f.push('demo step did not commit a real intent');
      const hash = await c.page.evaluate(() => location.hash);
      if (hash !== '#t-release-select') f.push(`hash not updated (${hash})`);
      return f;
    },
  },
  {
    id: 'a11y-foundation',
    keepTour: true,
    title: 'Accessibility as foundation',
    prose: 'Keyboard walks the graph: Tab reaches a node, arrows move focus geometrically (green ring), Enter opens the menu there, arrows + Enter commit — pointer never required. The menu traps Tab while open, every wedge is a labelled menuitem, highlights are announced to a live region, and prefers-reduced-motion collapses all animation to end states.',
    drive: async (c) => {
      await c.page.click('#tour-close');
      await c.page.evaluate(() => { focusNode('qm'); });
      await c.page.keyboard.press('ArrowRight');
      await c.page.waitForTimeout(150);
      await c.page.keyboard.press('Enter');       // open menu on focused node
      await c.page.waitForTimeout(250);
      await c.page.keyboard.press('ArrowRight');
      await c.page.waitForTimeout(150);
      await c.snap();                              // menu open, keyboard highlight
      await c.page.keyboard.press('Enter');
      await c.page.waitForTimeout(250);
    },
    assert: async (c) => {
      const f = [];
      const it = await c.page.evaluate(() => store.intents.find((i) => i.context.type === 'node'));
      if (!it) f.push('keyboard-only path committed no intent');
      const roles = await c.page.evaluate(() => ({
        nodes: document.querySelectorAll('.node[role="button"][aria-label]').length,
        live: !!document.getElementById('sr-live') || !!document.querySelector('[aria-live]'),
        skip: !!document.querySelector('.skip'),
      }));
      if (!roles.nodes) f.push('nodes lack button role/labels');
      if (!roles.live) f.push('no live region');
      if (!roles.skip) f.push('no skip link');
      return f;
    },
  },
  {
    id: 'reduced-motion',
    keepTour: true,
    title: 'Reduced motion honored',
    prose: 'With prefers-reduced-motion set, the motion module jumps every tween to its end state and CSS animations are disabled globally — the tour still works, it just stops moving.',
    emulateMedia: { reducedMotion: 'reduce' },
    drive: async (c) => {
      await c.page.click('#t-release-select .go');
      await c.page.waitForTimeout(900);            // far less than the animated run needs
      await c.snap();
    },
    assert: async (c) => {
      const f = [];
      const reduced = await c.page.evaluate(() => REDUCED);
      if (!reduced) f.push('REDUCED flag not set under emulation');
      const it = await c.page.evaluate(() => store.intents.find((i) => i.action === 'select-neighbors'));
      if (!it) f.push('demo did not complete instantly under reduced motion');
      return f;
    },
  },
  {
    id: 'overview',
    title: 'Graph canvas',
    prose: 'The prototype ships a small map of the quaternionmedia stack. Drag nodes, drag the background to pan, pinch or wheel to zoom. Every mutation — including selection — is an intent logged with its input cost (⊙).',
    drive: async (c) => { await c.page.waitForTimeout(300); await c.snap(); },
    assert: async (c) => {
      const n = await c.page.evaluate(() => store.nodes.size);
      return n === 12 ? [] : [`expected 12 nodes, got ${n}`];
    },
  },
  {
    id: 'release-select',
    title: 'Release-select (one gesture, one action)',
    prose: 'Long-press a node; the menu opens under the finger. Drag onto a wedge and release to commit — a full verb in one continuous gesture (IPA 1). Releasing in the hub cancels.',
    video: true,
    drive: async (c) => {
      const p = await c.nodeCenter('qm');
      await c.touchStart(p.x, p.y);
      await c.page.waitForTimeout(500);
      await c.touchMove(p.x + 40, p.y, 6);
      await c.touchMove(p.x + 75, p.y, 6);
      await c.page.waitForTimeout(250);
      await c.snap();                       // highlight moment
      await c.touchEnd();
      await c.page.waitForTimeout(350);
      await c.snap('after');
    },
    assert: async (c) => {
      const f = [];
      const it = await c.page.evaluate(() => store.intents.find(i => i.action === 'select-neighbors'));
      if (!it) f.push('select-neighbors intent not committed');
      else if (it.cost !== 1) f.push(`IPA ${it.cost}, budget 1`);
      const sel = await c.page.evaluate(() => store.selection.size);
      if (sel < 2) f.push(`neighbors not selected (${sel})`);
      return f;
    },
  },
  {
    id: 'submenu-drag-through',
    title: 'Submenu by drag-through',
    prose: 'Wedges with children open in place when the finger crosses the outer rim — still one gesture. Here: Color → swatch, committed on release at IPA 1.',
    drive: async (c) => {
      const p = await c.nodeCenter('qm');
      await c.touchStart(p.x, p.y);
      await c.page.waitForTimeout(500);
      await c.touchMove(p.x + 55, p.y + 55, 5);
      await c.touchMove(p.x + 100, p.y + 100, 5);
      await c.page.waitForTimeout(250);
      await c.snap();                       // swatch ring visible
      await c.touchMove(p.x + 75, p.y, 5);
      await c.touchEnd();
      await c.page.waitForTimeout(300);
    },
    assert: async (c) => {
      const it = await c.page.evaluate(() => store.intents.find(i => i.action.startsWith('color:')));
      if (!it) return ['color intent not committed'];
      return it.cost === 1 ? [] : [`IPA ${it.cost}, budget 1`];
    },
  },
  {
    id: 'keyboard-path',
    title: 'Keyboard navigation',
    prose: 'Right-click (or m) opens the menu idle; arrows rotate the highlight, Enter commits, Escape backs out. Every wedge is a labelled menuitem for assistive tech.',
    drive: async (c) => {
      await c.page.mouse.click(200, 560, { button: 'right' });
      await c.page.waitForTimeout(250);
      await c.page.keyboard.press('ArrowRight');
      await c.page.keyboard.press('ArrowRight');
      await c.page.waitForTimeout(200);
      await c.snap();                       // highlight on Fit
      await c.page.keyboard.press('Enter');
      await c.page.waitForTimeout(300);
    },
    assert: async (c) => {
      const it = await c.page.evaluate(() => store.intents.find(i => i.action === 'fit'));
      return it ? [] : ['fit intent not committed via keyboard'];
    },
  },
  {
    id: 'chord-input',
    title: 'Chorded input (CharaChorder path)',
    prose: 'Chords arrive as machine-fast words over plain HID — no driver. The vocabulary is prefix-free, so a known word commits on its last keystroke (⚡, IPA 1, TTC ≈ 0). The same word typed slowly still works, flagged ⌨ at honest cost. Select with the pointer, act with the chord.',
    drive: async (c) => {
      const p = await c.nodeCenter('qm');
      await c.page.mouse.click(p.x, p.y);
      await c.page.waitForTimeout(120);
      await c.page.keyboard.type('pin', { delay: 4 });
      await c.page.waitForTimeout(120);
      await c.page.keyboard.type('gld', { delay: 4 });
      await c.page.waitForTimeout(200);
      await c.snap();
    },
    assert: async (c) => {
      const f = [];
      const its = await c.page.evaluate(() => store.intents.filter(i => i.via === 'chord'));
      if (its.length < 2) f.push(`expected 2 chord intents, got ${its.length}`);
      for (const it of its) if (it.cost !== 1) f.push(`${it.action}: IPA ${it.cost}, budget 1`);
      const ttc = await c.page.evaluate(() => Math.max(...store.intents.filter(i => i.via === 'chord').map(i => i.ttc ?? 0)));
      if (ttc > 16) f.push(`chord TTC ${ttc.toFixed(1)}ms, budget 16ms`);
      return f;
    },
  },
  {
    id: 'quantized-commit',
    title: 'Quantized commit (MIDI-clock ready)',
    prose: 'With Q on, intents are scheduled to the next beat (or bar) and stamped with their grid delta — @b12+0.3ms. The clock is an internal metronome or external MIDI clock (24 PPQN, median-filtered tempo, phase per beat). Budget: grid jitter p95 ≤ 1 ms.',
    drive: async (c) => {
      await c.page.click('#q-chip');
      const p = await c.nodeCenter('qm');
      await c.page.mouse.click(p.x, p.y);
      await c.page.waitForTimeout(120);
      await c.page.keyboard.type('vio', { delay: 4 });
      await c.page.waitForTimeout(750);
      await c.snap();
    },
    assert: async (c) => {
      const g = await c.page.evaluate(() => store.intents.find(i => i.grid)?.grid ?? null);
      if (!g) return ['no grid-attributed intent'];
      return Math.abs(g.deltaMs) <= 5 ? [] : [`grid delta ${g.deltaMs}ms, budget ≤5ms in CI`];
    },
  },
  {
    id: 'conformance',
    title: 'Conformance vectors, in-page',
    prose: 'The same pure core (geometry, state machine, quantizer, tempo estimator, chord classifier) that drives the UI replays conformance/vectors.json on demand. Ports to other platforms are judged by the same vectors in their own test runners.',
    drive: async (c) => {
      await c.page.click('#conf-btn');
      await c.page.waitForTimeout(250);
      await c.snap();
    },
    assert: async (c) => {
      const t = await c.page.textContent('#conf-btn');
      return /^(\d+)\/\1 vectors ✓/.test(t.trim()) ? [] : [`vectors not all passing: "${t.trim()}"`];
    },
  },
];
