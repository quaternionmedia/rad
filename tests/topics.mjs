/* Topic registry — the single source of truth for tests, docs, README,
 * screenshots, and videos. One entry produces, on every green run:
 *   - an e2e test (drive + assert)
 *   - docs/guide/<id>.md          (generated page)
 *   - docs/media/<id>*.png        (screenshots; id doubles as filename)
 *   - docs/media/<id>.gif         (when video: true and ffmpeg is present)
 *   - a row in the generated README
 * Pattern extracted from qmetronome's TutorialTopic pipeline.
 *
 * This file imports nothing from Playwright on purpose. The registry is the
 * seam; the runner is replaceable (unified-artifact-pipeline record). A port
 * reimplements tests/lib/harness.mjs and reuses this file as data.
 *
 * `assert` returns an array of human-readable failure strings — empty means
 * pass. The spec turns them into test failures.
 */

export const TOPICS = [
  {
    id: 'tour',
    keepTour: true,
    title: 'Onboarding tour (the page teaches itself)',
    prose: 'The splash opens with a single Tour panel — the only menu on the page. Every entry is a linked action: press ▶ and the ghost finger performs the feature on the live graph through the same code path real input uses. Steps are hash-addressable (#t-release-select) and marked once shown. Press Play and the whole tour runs itself at the current action rate.',
    drive: async (c) => {
      await c.snap();                                   // tour open on load
      await c.page.click('#t-release-select .go');
      await c.page.waitForFunction(() => tourState.seen.has('release-select'), null, { timeout: 15000 });
      await c.snap('step-ran');
    },
    assert: async (c) => {
      const f = [];
      const it = await c.page.evaluate(() => store.intents.find((i) => i.action === 'select-neighbors'));
      if (!it) f.push('demo step did not commit a real intent through the product path');
      const hash = await c.page.evaluate(() => location.hash);
      if (hash !== '#t-release-select') f.push(`step is not hash-addressable (${hash})`);
      return f;
    },
  },
  {
    id: 'a11y-foundation',
    keepTour: true,
    title: 'Accessibility as foundation',
    prose: 'Keyboard walks the graph: Tab reaches a node, arrows move focus geometrically (green ring), Enter opens the menu there, arrows + Enter commit — pointer never required. The skip link moves focus rather than only the scroll position, the menu traps Tab while open, every wedge is a labelled menuitem, and exactly one live region announces — the intent log is decoration and is hidden from assistive tech.',
    drive: async (c) => {
      await c.page.click('#tour-close');
      await c.page.evaluate(() => { focusNode('qm'); });
      await c.page.keyboard.press('ArrowRight');
      await c.page.waitForTimeout(120);
      await c.page.keyboard.press('Enter');       // open menu on focused node
      await c.page.waitForTimeout(200);
      await c.page.keyboard.press('ArrowRight');
      await c.page.waitForTimeout(120);
      await c.snap();                              // menu open, keyboard highlight
      await c.page.keyboard.press('Enter');
      await c.page.waitForTimeout(200);
    },
    assert: async (c) => {
      const f = [];
      const it = await c.page.evaluate(() => store.intents.find((i) => i.context.type === 'node'));
      if (!it) f.push('keyboard-only path committed no intent');
      const a = await c.page.evaluate(() => ({
        nodes: document.querySelectorAll('.node[role="button"][aria-label]').length,
        liveRegions: document.querySelectorAll('[aria-live]').length,
        logHidden: document.getElementById('log').getAttribute('aria-hidden') === 'true',
        panelFocusable: document.getElementById('tour-panel').getAttribute('tabindex') === '-1',
      }));
      if (!a.nodes) f.push('nodes lack button role/labels');
      if (a.liveRegions !== 1) f.push(`${a.liveRegions} live regions compete; exactly 1 is the contract`);
      if (!a.logHidden) f.push('intent log is exposed to assistive tech and repeats every announcement');
      if (!a.panelFocusable) f.push('tour panel cannot receive focus, so the skip link cannot work');
      return f;
    },
  },
  {
    id: 'reduced-motion',
    keepTour: true,
    title: 'Reduced motion honored',
    prose: 'With prefers-reduced-motion set, the motion module jumps every tween to its end state and CSS animations are disabled globally — the tour still works, it just stops moving. Reduced motion composes with the speed axes rather than competing: the axes scale a duration, and reduced motion sets it to zero.',
    emulateMedia: { reducedMotion: 'reduce' },
    drive: async (c) => {
      await c.page.click('#t-release-select .go');
      await c.page.waitForTimeout(400);            // far less than an animated run needs
      await c.snap();
    },
    assert: async (c) => {
      const f = [];
      const reduced = await c.page.evaluate(() => REDUCED);
      if (!reduced) f.push('REDUCED flag not set under emulation');
      const zero = await c.page.evaluate(() => beatMs('travel') === 0 && beatMs('hold') === 0);
      if (!zero) f.push('choreography beats did not collapse to zero');
      const it = await c.page.evaluate(() => store.intents.find((i) => i.action === 'select-neighbors'));
      if (!it) f.push('demo did not complete instantly under reduced motion');
      return f;
    },
  },
  {
    id: 'overview',
    title: 'Graph canvas',
    prose: 'The prototype ships a small map of the quaternionmedia stack. Drag nodes, drag the background to pan, pinch or wheel to zoom. Every mutation — including selection — is an intent logged with its input cost (⊙), and every one of them goes through the same scheduler, so selection is quantized and timed like anything else.',
    drive: async (c) => { await c.page.waitForTimeout(150); await c.snap(); },
    assert: async (c) => {
      const f = [];
      const n = await c.page.evaluate(() => store.nodes.size);
      if (n !== 12) f.push(`expected 12 nodes, got ${n}`);
      const named = await c.page.evaluate(() => store.nodes.has('rad'));
      if (!named) f.push('the graph does not contain the project it is part of');
      return f;
    },
  },
  {
    id: 'release-select',
    title: 'Release-select (one gesture, one action)',
    prose: 'Long-press a node; the menu opens under the finger. Drag onto a wedge and release to commit — a full verb in one continuous gesture (IPA 1). Releasing in the hub cancels, and so does releasing beyond the outer bound: the ring is a band, and both of its edges are the same cancel affordance.',
    video: true,
    drive: async (c) => {
      const p = await c.nodeCenter('qm');
      const t = await c.touch();
      await t.start(p.x, p.y);
      await c.page.waitForTimeout(450);
      await t.move(p.x + 40, p.y, 6);
      await t.move(p.x + 75, p.y, 6);
      await c.page.waitForTimeout(200);
      await c.snap();                       // highlight moment
      await t.end();
      await c.page.waitForTimeout(250);
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
    prose: 'Wedges with children open in place when the finger crosses the outer rim — still one gesture. Here: Color → swatch, committed on release at IPA 1. The swatch commits a palette token (color:calm), never a hex, so the same intent means the same thing under any theme.',
    drive: async (c) => {
      const p = await c.nodeCenter('qm');
      const t = await c.touch();
      await t.start(p.x, p.y);
      await c.page.waitForTimeout(450);
      await t.move(p.x + 55, p.y + 55, 5);
      await t.move(p.x + 90, p.y + 90, 5);   // crosses r1+12, inside r_cancel
      await c.page.waitForTimeout(200);
      await c.snap();                        // swatch ring visible
      await t.move(p.x + 75, p.y, 5);
      await t.end();
      await c.page.waitForTimeout(250);
    },
    assert: async (c) => {
      const f = [];
      const it = await c.page.evaluate(() => store.intents.find(i => i.action.startsWith('color:')));
      if (!it) return ['color intent not committed'];
      if (it.cost !== 1) f.push(`IPA ${it.cost}, budget 1`);
      if (/#|rgb/.test(it.action)) f.push(`intent carries a literal colour (${it.action}); the vocabulary is token-only`);
      const tok = it.action.slice(6);
      const known = await c.page.evaluate(() => SWATCH_TOKENS.slice());
      if (!known.includes(tok)) f.push(`unknown swatch token "${tok}"`);
      return f;
    },
  },
  {
    id: 'keyboard-path',
    title: 'Keyboard navigation',
    prose: 'Right-click (or m) opens the menu idle; arrows rotate the highlight, Enter commits, Escape backs out. Every wedge is a labelled menuitem for assistive tech, and each highlight effect carries its own label so what is announced can never belong to a different ring.',
    drive: async (c) => {
      const e = await c.emptyPoint();
      await c.page.mouse.click(e.x, e.y, { button: 'right' });
      await c.page.waitForTimeout(200);
      await c.page.keyboard.press('ArrowRight');
      await c.page.keyboard.press('ArrowRight');
      await c.page.waitForTimeout(150);
      await c.snap();                       // highlight on Fit
      await c.page.keyboard.press('Enter');
      await c.page.waitForTimeout(250);
    },
    assert: async (c) => {
      const it = await c.page.evaluate(() => store.intents.find(i => i.action === 'fit'));
      return it ? [] : ['fit intent not committed via keyboard'];
    },
  },
  {
    id: 'chord-input',
    title: 'Chorded input (CharaChorder path)',
    prose: 'Chords arrive as machine-fast words over plain HID — no driver. The vocabulary is prefix-free — asserted by a conformance vector, because that property is what the latency claim rests on — so a known word commits on its last keystroke (⚡, IPA 1, TTC ≈ 0). The same word typed slowly still works, flagged ⌨ at honest cost. Select with the pointer, act with the chord. The whole vocabulary is driven twice here, so the TTC percentile below is a distribution rather than a handful of numbers.',
    drive: async (c) => {
      const p = await c.nodeCenter('qm');
      await c.page.mouse.click(p.x, p.y);
      await c.page.waitForTimeout(100);
      // The whole vocabulary, twice. A percentile needs a sample: six words
      // gave seven TTC measurements, and scripts/build-docs.mjs refuses to
      // print a p95 below twenty rather than dressing a handful of numbers up
      // as a distribution.
      const words = await c.page.evaluate(() => Object.keys(CHORD_MAP));
      for (let pass = 0; pass < 2; pass++) {
        for (const w of words) {
          await c.page.keyboard.type(w, { delay: 4 });
          await c.page.waitForTimeout(70);
        }
      }
      await c.snap();
    },
    assert: async (c) => {
      const f = [];
      const words = await c.page.evaluate(() => Object.keys(CHORD_MAP));
      const expected = words.length * 2;
      const its = await c.page.evaluate(() => store.intents.filter(i => i.via === 'chord' || i.via === 'typed'));
      // Every word must resolve to its verb - that part is the product's job.
      if (its.length !== expected) f.push(`expected ${expected} word intents, got ${its.length}`);
      const chorded = its.filter(i => i.via === 'chord');
      for (const it of chorded) if (it.cost !== 1) f.push(`${it.action}: IPA ${it.cost}, budget 1`);
      // Whether a burst is CLASSIFIED chorded depends on inter-key gaps staying
      // under chordGapMs; CDP delivery cannot guarantee that under parallel
      // load. The classifier is vector-tested, so this only requires that the
      // fast path is the one normally taken.
      if (chorded.length < Math.ceil(expected * 0.75))
        f.push(`only ${chorded.length}/${expected} bursts arrived machine-fast`);
      const worst = Math.max(...chorded.map(i => i.ttc ?? 0));
      if (worst > 16) f.push(`chord TTC ${worst.toFixed(1)}ms, budget 16ms`);
      return f;
    },
  },
  {
    id: 'quantized-commit',
    timing: true,          // measures a latency budget: must not share the CPU
    title: 'Quantized commit (MIDI-clock ready)',
    prose: 'With Q on, intents are scheduled to the next grid point and stamped with their delta — @b12+0.3ms. The grid is the beat divided by the subdivision axis, so Grid: 4 per beat quantizes four times as finely. The clock is an internal metronome or external MIDI clock (24 PPQN, median-filtered tempo, phase per beat). Budget: grid jitter p95 ≤ 1 ms, asserted at that number and not a looser one.',
    drive: async (c) => {
      // One intent per grid point: the budget is |commit - gridT| for a single
      // commit, and several quantized to the same instant serialize by
      // construction. 250 ms grid, clicks 300 ms apart.
      await c.setTempo({ bpm: 240, div: 1, aps: 8, linked: false });
      await c.page.evaluate(() => setQmode('beat'));
      const p = await c.nodeCenter('qm');
      for (let i = 0; i < 24; i++) {
        await c.page.mouse.click(p.x, p.y);          // selection is an intent, and it is quantized
        await c.page.waitForTimeout(300);
      }
      await c.page.waitForFunction(() => meters.jits.length >= 20, null, { timeout: 30000 });
      await c.snap();
    },
    assert: async (c) => {
      const f = [];
      const jits = await c.page.evaluate(() => meters.jits.slice());
      if (jits.length < 20) f.push(`grid jitter p95 needs ≥20 samples, got ${jits.length}`);
      const s = [...jits].sort((a, b) => a - b);
      const p95 = s[Math.floor(0.95 * (s.length - 1))];
      if (!(p95 <= 1)) f.push(`grid jitter p95 ${p95.toFixed(3)}ms over ${jits.length} samples, budget ≤1ms`);
      const g = await c.page.evaluate(() => store.intents.find(i => i.grid)?.grid ?? null);
      if (!g) f.push('no grid-attributed intent');
      else if (g.div !== 1) f.push(`intent grid stamp does not carry the subdivision (div=${g.div})`);
      const shared = await c.page.evaluate(() => {
        const beats = store.intents.filter(i => i.grid).map(i => i.grid.beat);
        return beats.length - new Set(beats).size;
      });
      if (shared) f.push(`${shared} intents shared a grid point; that measures the commit queue, not the scheduler`);
      return f;
    },
  },
  {
    id: 'themes',
    title: 'Four themes over one token layer',
    prose: 'Colour is a token, never a literal. Four themes — radical (the neon default), dark, light and a high-contrast one — are palette swaps over a single two-tier token layer; node hues, wedge fills and the swatch ring all resolve through it. radical sets the mood: a soft deep-indigo ground so the neon has something to sit on rather than vibrate against, with warm amber as the one deliberately non-neon hue. Every text pair is contrast-tested in every theme at the WCAG threshold for its rendered size, which is how the destructive wedge label stopped failing AA — it now clears it by 40%.',
    drive: async (c) => {
      const p = await c.nodeCenter('qm');
      const t = await c.touch();
      await t.start(p.x, p.y);
      await c.page.waitForTimeout(450);
      await t.move(p.x + 60, p.y + 60, 4);
      for (const th of ['radical', 'dark', 'light', 'contrast']) {
        await c.page.evaluate((n) => setTheme(n), th);
        await c.page.waitForTimeout(140);
        await c.snap(th);
      }
      await t.end();
      await c.page.evaluate(() => setTheme('radical'));
    },
    assert: async (c) => {
      const f = [];
      const seen = await c.page.evaluate(() => {
        const out = {};
        for (const th of THEMES) {
          setTheme(th);
          out[th] = getComputedStyle(document.documentElement).getPropertyValue('--rad-wedge-fill').trim();
        }
        setTheme('radical');      // restore the default; this call also persists
        return out;
      });
      const values = Object.values(seen);
      if (new Set(values).size !== values.length) f.push(`themes are not distinct: ${JSON.stringify(seen)}`);
      const persisted = await c.page.evaluate(() => localStorage.getItem('rad.theme'));
      if (persisted !== 'radical') f.push(`theme choice not persisted (${persisted})`);
      const dflt = await c.page.evaluate(() => defaultTheme());
      if (dflt !== 'radical') f.push(`the default theme is ${dflt}, expected radical`);
      return f;
    },
  },
  {
    id: 'speed-axes',
    title: 'Three speed axes, MIDI-drivable',
    prose: 'Tempo (bpm) sets the beat grid, Grid subdivides it, and Actions (aps) is the rate scripted playback issues intents. Actions is linked to tempo by default and can be freed — a slow clock with dense actions is a real configuration and so is its inverse. All three are reachable over MIDI CC alongside the clock, and start/continue/stop drive tour playback. The shipped default is deliberately slow: 60 bpm, one action per second.',
    drive: async (c) => {
      await c.page.evaluate(() => { setInternalBpm(60); setDiv(1); setLinked(true); });
      await c.page.waitForTimeout(100);
      await c.snap('default');
      // drive every axis over MIDI CC, with no device
      await c.page.evaluate(() => {
        onMidiMessage([0xB0, 20, 127], performance.now());   // bpm → max
        onMidiMessage([0xB0, 22, 127], performance.now());   // div → 4
        onMidiMessage([0xB0, 21, 0], performance.now());     // aps → min, frees the link
      });
      await c.page.waitForTimeout(120);
      await c.snap('midi-cc');
      await c.page.evaluate(() => { setInternalBpm(60); setDiv(1); setLinked(true); });
    },
    assert: async (c) => {
      const f = [];
      const d = await c.page.evaluate(() => {
        const before = { bpm: clock.bpm, div: tempo.div, aps: tempo.aps, linked: tempo.linked, period: actionPeriod() };
        onMidiMessage([0xB0, 20, 127], performance.now());
        onMidiMessage([0xB0, 22, 127], performance.now());
        onMidiMessage([0xB0, 21, 0], performance.now());
        const after = { bpm: clock.bpm, div: tempo.div, aps: tempo.aps, linked: tempo.linked };
        setInternalBpm(60); setDiv(1); setLinked(true);
        return { before, after };
      });
      if (d.before.bpm !== 60) f.push(`default bpm is ${d.before.bpm}, contract says 60`);
      if (d.before.aps !== 1) f.push(`default aps is ${d.before.aps}, contract says 1`);
      if (d.before.period !== 1000) f.push(`default action period is ${d.before.period}ms, expected 1000`);
      if (!d.before.linked) f.push('aps is not linked by default');
      if (d.after.bpm !== 300) f.push(`CC20 at 127 gave bpm ${d.after.bpm}, expected 300`);
      if (d.after.div !== 4) f.push(`CC22 at 127 gave div ${d.after.div}, expected 4`);
      if (d.after.aps !== 0.25) f.push(`CC21 at 0 gave aps ${d.after.aps}, expected 0.25`);
      if (d.after.linked) f.push('setting aps over CC did not free the link');
      return f;
    },
  },
  {
    id: 'conformance',
    title: 'Conformance vectors, in-page',
    prose: 'The same pure core (geometry, state machine, quantizer, tempo estimator, chord classifier, speed axes) that drives the UI replays conformance/vectors.json on demand. The page ships a generated inline copy so it runs from file://, and a test replays the governed JSON file itself and fails on any drift between the two — the reference implementation is judged by the artifact ports are judged by, not by its own copy of it.',
    drive: async (c) => {
      await c.page.click('#conf-btn');
      await c.page.waitForTimeout(200);
      await c.snap();
    },
    assert: async (c) => {
      const t = await c.page.textContent('#conf-btn');
      return /^(\d+)\/\1 vectors ✓/.test(t.trim()) ? [] : [`vectors not all passing: "${t.trim()}"`];
    },
  },
];
