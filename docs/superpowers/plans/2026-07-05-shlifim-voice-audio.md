# SHLIFIM Voice Audio (ElevenLabs "Liam") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the app's existing term-pronunciation feature so term names play a pre-generated ElevenLabs "Liam" MP3, falling back to the browser voice for anything without a file.

**Architecture:** Pre-generate one small MP3 per Hebrew term name (voice Liam, model `eleven_v3`, `he`). A generated `audio/manifest.js` maps `hebrew → mp3 path`. The existing `window.SLSpeak` is upgraded to play the MP3 when the text is a known term, else fall back to today's `speechSynthesis`. No new UI — the 🔊 buttons already exist.

**Tech Stack:** Vanilla JS + React-via-CDN (classic JSX, precompiled to `app/app-v2.js`), browser test harness (`tests/`), PowerShell scripts, GitHub Pages PWA, ElevenLabs MCP for generation.

**Spec:** `docs/superpowers/specs/2026-07-05-shlifim-voice-audio-design.md`

**Project root:** `C:\Users\Medina\OneDrive\Desktop\Medilab_Glossary` (OneDrive; use `git -C` and Read/Edit tools — shell paths may 404 intermittently).

---

## File Structure

| File | Create/Modify | Responsibility |
|------|---------------|----------------|
| `lib/audio.js` | Create | Pure helpers: assign stable `tNNNN` filenames, build the manifest object from `window.GLOSSARY`. Testable, no side effects. |
| `tests/spec-audio.js` | Create | Unit tests for `lib/audio.js` and the upgraded `SLSpeak` branching. |
| `tests/index.html` | Modify | Load `lib/audio.js` + `tests/spec-audio.js`. |
| `audio/manifest.js` | Create (generated) | `window.AUDIO_MANIFEST = { hebrew: "audio/tNNNN.mp3", ... }`. |
| `audio/t0001.mp3 … t0465.mp3` | Create (generated via MCP) | Liam pronunciation of each term name. |
| `app/sound.js` | Modify | Upgrade `SLSpeak`: MP3-first, browser fallback. |
| `app/app-v2.jsx` | Modify (line 183) | Glossary card reads term-only (`Speak(t.hebrew)`). |
| `app/app-v2.js` | Regenerate | Recompiled from `.jsx` (no Node — in-browser Babel trick). |
| `index.html` | Modify | Load `audio/manifest.js` before `app/sound.js`. |
| `service-worker.js` | Modify | Bump `CACHE_NAME` v25→v26. |

---

## Task 0: Create a clean branch

**Files:** none (git only)

- [ ] **Step 1: Branch off main into an isolated branch**

Run:
```bash
git -C "C:/Users/Medina/OneDrive/Desktop/Medilab_Glossary" stash push -m wip-crossword --include-untracked -- crossword.html 2>/dev/null || true
git -C "C:/Users/Medina/OneDrive/Desktop/Medilab_Glossary" fetch origin
git -C "C:/Users/Medina/OneDrive/Desktop/Medilab_Glossary" checkout -b add-voice-audio origin/main
```
Expected: `Switched to a new branch 'add-voice-audio'`. (The spec file created earlier is untracked and will carry over — that is fine.)

> Note: the working tree had an unrelated modified `crossword.html`. It is stashed so it does not mix into this feature. Restore later with `git stash pop` on its own branch.

---

## Task 1: Pure manifest builder (`lib/audio.js`) — TDD

**Files:**
- Create: `lib/audio.js`
- Test: `tests/spec-audio.js`
- Modify: `tests/index.html`

- [ ] **Step 1: Register the new test files in the harness**

In `tests/index.html`, find the block of `<script src="../lib/...">` and `<script src="spec-...">` tags. Add `../lib/audio.js` alongside the other lib scripts, and `spec-audio.js` alongside the other spec scripts. Example (match existing indentation/order):

```html
<script src="../lib/audio.js"></script>
```
```html
<script src="spec-audio.js"></script>
```

- [ ] **Step 2: Write the failing test**

Create `tests/spec-audio.js`:

```js
T.suite('audio-manifest', function () {
  var G = window.GLOSSARY;
  var built = window.SLAudio.buildManifest(G);
  var man = built.manifest;

  T.test('buildManifest returns an object keyed by hebrew term', function () {
    T.ok(man && typeof man === 'object', 'manifest is an object');
    var first = G[0].hebrew;
    T.ok(man[first], first + ' should have an audio file');
  });

  T.test('every filename is ASCII tNNNN.mp3 under audio/', function () {
    Object.keys(man).forEach(function (k) {
      T.ok(/^audio\/t\d{4}\.mp3$/.test(man[k]), 'bad path for ' + k + ': ' + man[k]);
    });
  });

  T.test('filenames are unique (1:1 term↔file)', function () {
    var vals = Object.keys(man).map(function (k) { return man[k]; });
    var uniq = {}; vals.forEach(function (v) { uniq[v] = 1; });
    T.eq(Object.keys(uniq).length, vals.length, 'duplicate filenames exist');
  });

  T.test('covers every unique hebrew term, skips ראה: stubs', function () {
    var expected = {};
    G.forEach(function (e) {
      if (e.hebrew && !/^\s*ראה:/.test(e.definition || '')) expected[e.hebrew] = 1;
    });
    T.eq(Object.keys(man).length, Object.keys(expected).length, 'term coverage mismatch');
  });

  T.test('deterministic — same input yields identical mapping', function () {
    var again = window.SLAudio.buildManifest(G).manifest;
    T.eq(again, man);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Start the harness server and open the tests page in Preview MCP:
```bash
# from project root, in PowerShell:
# powershell -File scripts/serve.ps1   (HttpListener on :8770)
```
Navigate Preview to `http://localhost:8770/tests/index.html`, then DOM-eval `window.__RESULTS__`.
Expected: FAIL — `window.SLAudio is undefined` (the `built = ...` line throws at load).

- [ ] **Step 4: Write minimal implementation**

Create `lib/audio.js`:

```js
/* SHLIFIM audio — pure helpers to map term names to pre-generated MP3 files.
   No side effects; safe to load in tests and in the app. */
window.SLAudio = (function () {
  function pad4(n) { return ('000' + n).slice(-4); }

  // Assign a stable tNNNN filename to each UNIQUE hebrew term, in array order.
  // Skip ראה: cross-reference stubs (their canonical term carries the audio).
  function buildManifest(glossary) {
    var manifest = {};
    var list = [];
    var next = 1;
    (glossary || []).forEach(function (e) {
      var heb = e && e.hebrew;
      if (!heb) return;
      if (/^\s*ראה:/.test(e.definition || '')) return;
      if (manifest[heb]) return;                 // already assigned (dedupe)
      var file = 'audio/t' + pad4(next) + '.mp3';
      manifest[heb] = file;
      list.push({ hebrew: heb, file: file });
      next++;
    });
    return { manifest: manifest, list: list };
  }

  return { buildManifest: buildManifest, pad4: pad4 };
})();
```

- [ ] **Step 5: Run the test to verify it passes**

Reload `http://localhost:8770/tests/index.html` in Preview, DOM-eval `window.__RESULTS__`.
Expected: `audio-manifest` suite — all 5 tests passed, `failed: 0`.

- [ ] **Step 6: Commit**

```bash
git -C "C:/Users/Medina/OneDrive/Desktop/Medilab_Glossary" add lib/audio.js tests/spec-audio.js tests/index.html
git -C "C:/Users/Medina/OneDrive/Desktop/Medilab_Glossary" commit -m "feat(audio): pure manifest builder + tests"
```

---

## Task 2: Generate the manifest file and the 465 MP3s

**Files:**
- Create: `audio/manifest.js`
- Create: `audio/t0001.mp3 … t0465.mp3`

- [ ] **Step 1: Emit `audio/manifest.js` from the builder**

The manifest must exactly match `SLAudio.buildManifest`. Generate it with a browser DOM-eval on the tests page (GLOSSARY + SLAudio are loaded there):

In Preview at `http://localhost:8770/tests/index.html`, DOM-eval:
```js
(function(){
  var m = window.SLAudio.buildManifest(window.GLOSSARY).manifest;
  return 'window.AUDIO_MANIFEST = ' + JSON.stringify(m, null, 0) + ';\n';
})()
```
Write the returned string verbatim to `audio/manifest.js`. It looks like:
```js
window.AUDIO_MANIFEST = {"אאוקריוטים":"audio/t0001.mp3", ...};
```

- [ ] **Step 2: Produce the generation work-list**

DOM-eval on the same page to get the ordered `[{hebrew, file}]` list:
```js
JSON.stringify(window.SLAudio.buildManifest(window.GLOSSARY).list)
```
Save it to the scratchpad as `audio-worklist.json`. Each item's `file` is the exact target path.

- [ ] **Step 3: Generate each MP3 via ElevenLabs MCP (skip-if-exists)**

For every item in the work-list, call the ElevenLabs MCP `text_to_speech`:
- `text`: the item's `hebrew`
- `voice_id`: `TX3LPaxmHKxFdv7VOQHJ` (Liam)
- `model_id`: `eleven_v3`
- `language`: `he`
- `output_directory`: the project `audio/` folder

The MCP writes timestamped filenames; immediately rename/move each output to its target `tNNNN.mp3` from the work-list (preserve order — generate sequentially so item N → tNNNN). **Skip any item whose target `audio/tNNNN.mp3` already exists** (safe re-runs / batching). Total ≈ 4,392 characters ≈ within the 10,000/month free tier.

> Rate/quota note: if the free monthly quota is hit mid-run, stop; already-written files persist. Re-running resumes from the first missing file.

- [ ] **Step 4: Verify generation completeness**

Run:
```bash
ls "C:/Users/Medina/OneDrive/Desktop/Medilab_Glossary/audio" | grep -cE '^t[0-9]{4}\.mp3$'
```
Expected: the count equals the work-list length (number of unique non-stub terms). Spot-check by playing `audio/t0001.mp3` (should say the first term) via the ElevenLabs MCP `play_audio` or by opening it.

- [ ] **Step 5: Commit**

```bash
git -C "C:/Users/Medina/OneDrive/Desktop/Medilab_Glossary" add audio/
git -C "C:/Users/Medina/OneDrive/Desktop/Medilab_Glossary" commit -m "feat(audio): generate Liam term-name MP3s + manifest"
```

---

## Task 3: Upgrade `SLSpeak` (MP3-first, browser fallback) — TDD

**Files:**
- Modify: `app/sound.js`
- Test: `tests/spec-audio.js` (append a suite)

- [ ] **Step 1: Write the failing test**

Append to `tests/spec-audio.js`:

```js
T.suite('slspeak-routing', function () {
  // Fake Audio: records src, never actually plays.
  function withFakes(manifest, fn) {
    var realAudio = window.Audio, realManifest = window.AUDIO_MANIFEST, realBrowser = window.SLSpeakBrowser;
    var played = { src: null }, browserCalls = [];
    window.Audio = function () { return { pause: function(){}, play: function(){ played.src = this.src; return { catch: function(){} }; }, set src(v){ this._src = v; }, get src(){ return this._src; } }; };
    window.AUDIO_MANIFEST = manifest;
    window.SLSpeakBrowser = function (t) { browserCalls.push(t); };
    try { fn(played, browserCalls); }
    finally { window.Audio = realAudio; window.AUDIO_MANIFEST = realManifest; window.SLSpeakBrowser = realBrowser; }
  }

  T.test('known term → plays mp3, no browser fallback', function () {
    withFakes({ 'פוטוסינתזה': 'audio/t0001.mp3' }, function (played, browserCalls) {
      window.SLSpeak('פוטוסינתזה');
      T.eq(played.src, 'audio/t0001.mp3');
      T.eq(browserCalls.length, 0);
    });
  });

  T.test('unknown text (definition) → browser fallback, no mp3', function () {
    withFakes({ 'פוטוסינתזה': 'audio/t0001.mp3' }, function (played, browserCalls) {
      window.SLSpeak('תהליך ארוך שאין לו קובץ');
      T.eq(played.src, null);
      T.eq(browserCalls.length, 1);
    });
  });

  T.test('trims whitespace before lookup', function () {
    withFakes({ 'תא': 'audio/t0002.mp3' }, function (played) {
      window.SLSpeak('  תא  ');
      T.eq(played.src, 'audio/t0002.mp3');
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Reload `tests/index.html`; DOM-eval `window.__RESULTS__`.
Expected: `slspeak-routing` fails — current `SLSpeak` ignores `AUDIO_MANIFEST` and calls `speechSynthesis` (so `played.src` stays null and `window.SLSpeakBrowser` is never called because it does not exist yet).

- [ ] **Step 3: Replace the SLSpeak block in `app/sound.js`**

Replace lines 21–34 (the `/* Hebrew text-to-speech ... */` block through the trailing `getVoices` IIFE) with:

```js
/* Hebrew TTS: pre-generated ElevenLabs "Liam" MP3 for known term names,
   graceful fallback to the Web Speech API for everything else. */
(function () {
  var audioEl = null; // single shared element, avoids overlaps

  function browserSpeak(text) {
    try {
      if (!window.speechSynthesis || !text) return;
      var u = new SpeechSynthesisUtterance(String(text));
      u.lang = 'he-IL'; u.rate = 0.95; u.pitch = 1;
      var vs = window.speechSynthesis.getVoices() || [];
      var he = vs.filter(function (v) { return /he|iw/i.test(v.lang); })[0];
      if (he) u.voice = he;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  window.SLSpeakBrowser = browserSpeak; // exposed so callers/tests can spy or force it

  window.SLSpeak = function (text) {
    var key = (text == null ? '' : String(text)).trim();
    var map = window.AUDIO_MANIFEST;
    var file = (map && key) ? map[key] : null;
    if (!file) { window.SLSpeakBrowser(text); return; }
    try {
      try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
      if (!audioEl) { audioEl = new Audio(); }
      audioEl.pause();
      audioEl.onerror = function () { window.SLSpeakBrowser(text); };
      audioEl.src = file;
      var p = audioEl.play();
      if (p && p.catch) p.catch(function () { window.SLSpeakBrowser(text); });
    } catch (e) { window.SLSpeakBrowser(text); }
  };

  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = function () { window.speechSynthesis.getVoices(); };
    }
  } catch (e) {}
})();
```

- [ ] **Step 4: Run the test to verify it passes**

Reload `tests/index.html`; DOM-eval `window.__RESULTS__`.
Expected: `slspeak-routing` — all 3 pass, `failed: 0` across the whole run.

- [ ] **Step 5: Commit**

```bash
git -C "C:/Users/Medina/OneDrive/Desktop/Medilab_Glossary" add app/sound.js tests/spec-audio.js
git -C "C:/Users/Medina/OneDrive/Desktop/Medilab_Glossary" commit -m "feat(audio): SLSpeak plays Liam mp3 with browser fallback"
```

---

## Task 4: Wire the manifest into the app + fix the glossary call-site

**Files:**
- Modify: `index.html`
- Modify: `app/app-v2.jsx` (line 183)
- Regenerate: `app/app-v2.js`

- [ ] **Step 1: Load the manifest before sound.js**

In `index.html`, immediately **before** the `<script src="app/sound.js"></script>` line (currently line 39), add:

```html
<script src="audio/manifest.js"></script>
```

- [ ] **Step 2: Glossary card reads term-only**

In `app/app-v2.jsx` line 183, change:
```jsx
<button className="ibtn" onClick={()=>Speak(t.hebrew + '. ' + def)} title="הקראה" aria-label="הקראה">🔊</button>
```
to:
```jsx
<button className="ibtn" onClick={()=>Speak(t.hebrew)} title="הקראה" aria-label="הקראה">🔊</button>
```
Leave lines 259, 305, 425 unchanged (definitions/prompts fall back to the browser voice).

- [ ] **Step 3: Recompile `app-v2.jsx` → `app-v2.js`**

No Node on this machine. Use the documented in-browser Babel path:
1. Temporarily add `<script src="https://unpkg.com/@babel/standalone@7/babel.min.js"></script>` to a scratch page that also loads `app/app-v2.jsx` as text, OR reuse the `scripts/serve.ps1` `__save` POST handler trick from PR #36.
2. In the browser: `var src = await (await fetch('/app/app-v2.jsx')).text(); var out = Babel.transform(src, {presets:[['react',{runtime:'classic'}]]}).code; await fetch('/__save?name=app/app-v2.js', {method:'POST', body: out});`
3. Confirm `app/app-v2.js` now contains `Speak(t.hebrew)` (not `t.hebrew + '. ' + def`) and still begins with the `/* @jsxRuntime classic */` pragma.
4. Revert the temporary Babel tag and the `serve.ps1` `__save` handler.

- [ ] **Step 4: Verify the compiled output changed**

Run:
```bash
grep -c "t.hebrew + '. ' + def" "C:/Users/Medina/OneDrive/Desktop/Medilab_Glossary/app/app-v2.js"
```
Expected: `0`. And:
```bash
grep -c "Speak(t.hebrew)" "C:/Users/Medina/OneDrive/Desktop/Medilab_Glossary/app/app-v2.js"
```
Expected: `>= 1`.

- [ ] **Step 5: Commit**

```bash
git -C "C:/Users/Medina/OneDrive/Desktop/Medilab_Glossary" add index.html app/app-v2.jsx app/app-v2.js
git -C "C:/Users/Medina/OneDrive/Desktop/Medilab_Glossary" commit -m "feat(audio): load manifest; glossary card speaks term name in Liam"
```

---

## Task 5: Bump the service worker cache version

**Files:**
- Modify: `service-worker.js:1`

- [ ] **Step 1: Bump the cache name**

In `service-worker.js` line 1, change:
```js
const CACHE_NAME = 'shlifim-v25';
```
to:
```js
const CACHE_NAME = 'shlifim-v26';
```
Do **not** add mp3s to `FILES_TO_CACHE` — the existing cache-first "everything else" fetch branch already caches audio on demand.

- [ ] **Step 2: Commit**

```bash
git -C "C:/Users/Medina/OneDrive/Desktop/Medilab_Glossary" add service-worker.js
git -C "C:/Users/Medina/OneDrive/Desktop/Medilab_Glossary" commit -m "chore(sw): bump cache to v26 for audio release"
```

---

## Task 6: End-to-end verification (Preview MCP)

**Files:** none (verification only)

- [ ] **Step 1: Serve the app**

Ensure `scripts/serve.ps1` is running (:8770). In Preview, navigate to `http://localhost:8770/index.html`. Unregister any stale service worker + clear caches first (known gotcha), then reload.

- [ ] **Step 2: Manifest loaded**

DOM-eval: `Object.keys(window.AUDIO_MANIFEST || {}).length` → expected: the term count (hundreds). And `window.AUDIO_MANIFEST['פוטוסינתזה']` → expected: a `audio/tNNNN.mp3` path.

- [ ] **Step 3: Glossary term plays the mp3, not the browser voice**

DOM-eval a spy, then click a card's 🔊:
```js
window.__spoke = null; var _b = window.SLSpeakBrowser; window.SLSpeakBrowser = function(t){ window.__spoke = 'browser'; };
// then trigger: SLSpeak('פוטוסינתזה')
window.SLSpeak('פוטוסינתזה'); window.SLSpeakBrowser = _b; window.__spoke;
```
Expected: `null` (mp3 branch taken, browser fallback NOT called).

- [ ] **Step 4: Definition falls back to the browser voice**

DOM-eval:
```js
window.__spoke = null; var _b = window.SLSpeakBrowser; window.SLSpeakBrowser = function(t){ window.__spoke='browser'; };
window.SLSpeak('משפט הגדרה שאין לו קובץ'); window.SLSpeakBrowser = _b; window.__spoke;
```
Expected: `'browser'`.

- [ ] **Step 5: No console errors; audio cached by SW**

Check Preview console logs — no errors. After playing one term, DOM-eval:
```js
caches.open('shlifim-v26').then(c=>c.keys()).then(ks=>ks.filter(k=>/audio\/t\d{4}\.mp3/.test(k.url)).length)
```
Expected: `>= 1` (the played file is cached for offline).

- [ ] **Step 6: Full test suite still green**

Navigate to `http://localhost:8770/tests/index.html`; DOM-eval `window.__RESULTS__.failed`. Expected: `0`.

---

## Task 7: Push and open a PR

**Files:** none (git only)

- [ ] **Step 1: Push the branch**

```bash
git -C "C:/Users/Medina/OneDrive/Desktop/Medilab_Glossary" push -u origin add-voice-audio
```

- [ ] **Step 2: Open the PR** (only after the user confirms)

```bash
gh pr create --repo nethanelmedina88-cmyk/Medilab_Glossary --base main --head add-voice-audio \
  --title "הקראה קולית (ElevenLabs Liam) לשמות המושגים" \
  --body "משדרג את SLSpeak: שמות מושגים מושמעים ב-MP3 של הקול Liam (מופק מראש, מודל eleven_v3), עם נפילה חלקה לקול הדפדפן להגדרות/שאלות. ראה docs/superpowers/specs/2026-07-05-shlifim-voice-audio-design.md"
```
> If `gh` returns HTTP 401 mid-session, re-auth: `gh auth login -h github.com -p https -w`.

---

## Self-Review (done by author)

**Spec coverage:** ✅ generation (Task 2), manifest (Tasks 1–2), SLSpeak upgrade + fallback (Task 3), call-site + wiring + recompile (Task 4), SW bump (Task 5), UI placement unchanged (buttons already exist), error handling (Task 3 tests + Step onerror), tests (Tasks 1/3/6).

**Placeholder scan:** none — every code/command step is concrete.

**Type/name consistency:** `SLAudio.buildManifest` returns `{manifest, list}` — used consistently in Tasks 1–2. `window.AUDIO_MANIFEST` keyed by hebrew → `audio/tNNNN.mp3` — consistent across builder, tests, SLSpeak, and verification. `window.SLSpeakBrowser` defined in Task 3, spied in Task 3 tests and Task 6 verification. `CACHE_NAME` `shlifim-v26` consistent in Task 5 and Task 6 Step 5.
