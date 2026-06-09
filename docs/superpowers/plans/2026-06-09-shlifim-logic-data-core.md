# SHLIFIM — Plan 1: Logic &amp; Data Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build tested, framework-free logic (normalize, alias/synonym resolution, search index, quiz generation) and clean/annotate the glossary data, backing the dedup, quiz-correctness, search, and validation requirements — with zero new build tooling.

**Architecture:** Pure JS modules attached to a `window.SL` namespace, with **no DOM/React dependencies** so they run identically in the browser app and (later) under Node. The 465-term `glossary.js` is migrated in place via a PowerShell script that adds `aliasOf`/`synonyms`. Tests run in a self-contained browser harness (`tests/index.html`) that loads `glossary.js` + the libs + spec files and writes results to `window.__RESULTS__`; verify by opening the page (or via the Claude Preview MCP `preview_eval`).

**Tech Stack:** Vanilla JS (ES2017, no modules/bundler — global namespace to stay file://-safe), PowerShell 5.1 for the data migration, plain HTML test harness.

---

## Roadmap (the six plans)

This plan is **Plan 1**. The others are written when reached:

1. **Logic &amp; Data Core** *(this plan)* — normalize, aliases/synonyms, search index, quiz generation, validator; data migration. Spec §12, §14, §15, §17(search/quiz).
2. **Subjects taxonomy &amp; tagging** — recover taxonomy from MediLab docs, draft `data/subjects.js`, auto-classify, **author review gate**, tag all 465. Spec §13.
3. **Design-system foundation &amp; app shell** — CSS token layer (light/dark/`[data-mode]`), app shell, bottom tab nav, dark-mode toggle. Spec §3–§6, §7(shell).
4. **Re-skin Glossary &amp; Flashcards** — components + states, subject chips/filter, virtualized list wired to the search index, bug-fix pass. Spec §7, §8, §16, §17(UI).
5. **Quiz mode UI** — screens on top of Plan 1's `lib/quiz.js`, feedback states, results/review. Spec §7, §8.
6. **Firebase guest-first sync** — optional Auth, per-user Firestore doc, merge-on-login. Spec §2, §9.

---

## File Structure (Plan 1)

- Create `lib/normalize.js` — `SL.normalize(str)`: nikud/punct/space-insensitive key. One responsibility: text → comparison key.
- Create `lib/aliases.js` — `SL.buildAliasMaps(glossary)`, `SL.resolveEntry(term, maps)`, `SL.synonymsOf(hebrew, maps)`. Alias/synonym graph only.
- Create `lib/search.js` — `SL.buildSearchIndex(glossary)`, `SL.search(index, query)`. Indexing + ranking only.
- Create `lib/quiz.js` — `SL.eligibleTerms(glossary, maps)`, `SL.generateItem(...)`, `SL.checkAnswer(item, response, maps)`. Quiz item logic only.
- Create `lib/validate.js` — `SL.validateGlossary(glossary, maps)`: returns `{errors[], warnings[]}`. Pure assertions only.
- Create `scripts/migrate-aliases.ps1` — one-time data migration adding `aliasOf`/`synonyms` to `glossary.js`.
- Create `tests/assert.js` — tiny assert + runner writing to `window.__RESULTS__`.
- Create `tests/spec-normalize.js`, `tests/spec-aliases.js`, `tests/spec-search.js`, `tests/spec-quiz.js`, `tests/spec-validate.js`.
- Create `tests/index.html` — loads everything, renders pass/fail, sets `window.__RESULTS__`.
- Modify `glossary.js` — gains `aliasOf`/`synonyms` (via the migration script; never hand-edited).

**Verification convention used in every task below:**
> **Run:** open `tests/index.html` in a browser and read the on-page summary, **or** run the Claude Preview MCP: `preview_eval` with `() => window.__RESULTS__` after `preview_start` on `tests/index.html`. "FAIL"/"PASS" refers to the `window.__RESULTS__.failed` count for the named spec.

---

## Task 0: Initialize git (one-time)

**Files:** none (repo init).

- [ ] **Step 1: Initialize repository and ignore generated dirs**

The project folder is not yet a git repo. Initialize it so the plan's commits work.

```bash
cd "C:/Users/Medina/OneDrive/Desktop/Medilab_Glossary"
git init
printf "node_modules/\n.superpowers/\n*.zip\n" > .gitignore
git add .gitignore
git commit -m "chore: initialize repository"
```

- [ ] **Step 2: Baseline commit of existing app**

```bash
git add -A
git commit -m "chore: baseline existing SHLIFIM app before redesign"
```

Expected: two commits in `git log --oneline`.

---

## Task 1: Test harness scaffold

**Files:**
- Create: `tests/assert.js`
- Create: `tests/index.html`

- [ ] **Step 1: Write the assert/runner library**

`tests/assert.js`:

```javascript
// Minimal browser test runner. Results land on window.__RESULTS__.
(function () {
  var results = { total: 0, passed: 0, failed: 0, suites: {}, failures: [] };
  var current = '(root)';

  function suite(name, fn) { current = name; results.suites[name] = { passed: 0, failed: 0 }; fn(); }
  function test(name, fn) {
    results.total++;
    try { fn(); results.passed++; results.suites[current].passed++; }
    catch (e) {
      results.failed++; results.suites[current].failed++;
      results.failures.push({ suite: current, test: name, message: e.message });
    }
  }
  function eq(actual, expected, msg) {
    var a = JSON.stringify(actual), b = JSON.stringify(expected);
    if (a !== b) throw new Error((msg || '') + ' expected ' + b + ' got ' + a);
  }
  function ok(cond, msg) { if (!cond) throw new Error(msg || 'expected truthy'); }
  function notOk(cond, msg) { if (cond) throw new Error(msg || 'expected falsy'); }

  window.__RESULTS__ = results;
  window.T = { suite: suite, test: test, eq: eq, ok: ok, notOk: notOk };
})();
```

- [ ] **Step 2: Write the harness page with a smoke test**

`tests/index.html`:

```html
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>SHLIFIM tests</title>
<style>body{font-family:monospace;padding:20px;background:#0E151C;color:#dfe6ee}
.pass{color:#5CB85C}.fail{color:#F0654F}.s{margin:6px 0}</style></head>
<body>
<h1 id="head">running…</h1><div id="out"></div>
<script src="../glossary.js"></script>
<script src="assert.js"></script>
<script src="../lib/normalize.js"></script>
<script src="../lib/aliases.js"></script>
<script src="../lib/search.js"></script>
<script src="../lib/quiz.js"></script>
<script src="../lib/validate.js"></script>
<script src="spec-normalize.js"></script>
<script src="spec-aliases.js"></script>
<script src="spec-search.js"></script>
<script src="spec-quiz.js"></script>
<script src="spec-validate.js"></script>
<script>
  var r = window.__RESULTS__;
  document.getElementById('head').textContent =
    (r.failed === 0 ? 'PASS' : 'FAIL') + ' — ' + r.passed + '/' + r.total + ' passed, ' + r.failed + ' failed';
  document.getElementById('head').className = r.failed === 0 ? 'pass' : 'fail';
  var out = document.getElementById('out'), html = '';
  Object.keys(r.suites).forEach(function (s) {
    var x = r.suites[s];
    html += '<div class="s ' + (x.failed ? 'fail' : 'pass') + '">' + s + ': ' + x.passed + ' ok, ' + x.failed + ' fail</div>';
  });
  r.failures.forEach(function (f) { html += '<div class="s fail">✗ [' + f.suite + '] ' + f.test + ' — ' + f.message + '</div>'; });
  out.innerHTML = html;
</script>
</body></html>
```

This references spec files created in later tasks; create empty placeholders so the page loads now.

- [ ] **Step 3: Create empty spec placeholders**

```bash
cd "C:/Users/Medina/OneDrive/Desktop/Medilab_Glossary/tests"
for f in spec-normalize spec-aliases spec-search spec-quiz spec-validate; do echo "// $f" > "$f.js"; done
```

- [ ] **Step 4: Verify the page loads**

Run: open `tests/index.html` (or `preview_eval` `() => window.__RESULTS__`).
Expected: header shows `PASS — 0/0 passed, 0 failed` (no script errors in console).

- [ ] **Step 5: Commit**

```bash
git add tests/
git commit -m "test: add browser test harness scaffold"
```

---

## Task 2: `lib/normalize.js`

**Files:**
- Create: `lib/normalize.js`
- Test: `tests/spec-normalize.js`

- [ ] **Step 1: Write the failing test**

`tests/spec-normalize.js`:

```javascript
T.suite('normalize', function () {
  T.test('strips nikud', function () { T.eq(SL.normalize('פּוֹטוֹסינתֵזה'), SL.normalize('פוטוסינתזה')); });
  T.test('strips quotes/punct and lowercases', function () { T.eq(SL.normalize('DNA־פולימראז (I)'), 'dnaפולימראז i'); });
  T.test('collapses whitespace and trims', function () { T.eq(SL.normalize('  תא   רבייה '), 'תא רבייה'); });
  T.test('null-safe', function () { T.eq(SL.normalize(null), ''); });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: open/refresh `tests/index.html`.
Expected: FAIL — `normalize` suite errors with "SL is not defined".

- [ ] **Step 3: Write minimal implementation**

`lib/normalize.js`:

```javascript
window.SL = window.SL || {};
// Comparison key: drop nikud (U+0591–U+05C7), quotes/gershayim, dashes, parens; collapse spaces; lowercase.
SL.normalize = function (s) {
  return (s || '')
    .toLowerCase()
    .replace(/[֑-ׇ"'׳״\-–—()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};
```

- [ ] **Step 4: Run to verify it passes**

Run: refresh `tests/index.html`.
Expected: PASS — `normalize: 4 ok, 0 fail`.

- [ ] **Step 5: Commit**

```bash
git add lib/normalize.js tests/spec-normalize.js
git commit -m "feat: add SL.normalize comparison-key helper with tests"
```

---

## Task 3: Migrate alias/synonym data into `glossary.js`

**Files:**
- Create: `scripts/migrate-aliases.ps1`
- Modify: `glossary.js`

Rules (from spec §12): a `"ראה: X"` stub becomes `aliasOf: <canonical hebrew of X>`; entries sharing a normalized English term that are **not** stubs and do **not** differ only by a parenthetical become mutual `synonyms`; the disambiguated pair `גורם מגביל (אנזימים)` / `(אקולוגיה)` is left unlinked.

- [ ] **Step 1: Write the migration script**

`scripts/migrate-aliases.ps1`:

```powershell
$ErrorActionPreference = 'Stop'
$path = Join-Path $PSScriptRoot '..\glossary.js'
$raw  = Get-Content -Path $path -Raw -Encoding utf8
$json = $raw -replace '^\s*window\.GLOSSARY\s*=\s*','' -replace ';\s*$',''
$data = $json | ConvertFrom-Json

function Norm($s){ if(-not $s){return ''}; ($s -replace '[֑-ׇ"''׳״\-–—()]','' -replace '\s+',' ').Trim().ToLower() }
function StripParen($s){ ($s -replace '\(.*?\)','').Trim() }

# index by hebrew + normalized-hebrew
$byHeb = @{}; foreach($e in $data){ $byHeb[$e.hebrew] = $e }
$byNorm = @{}; foreach($e in $data){ $byNorm[(Norm $e.hebrew)] = $e }

# 1) alias stubs: definition "ראה: TARGET."
foreach($e in $data){
  if($e.definition -match '^\s*ראה:\s*(.+?)\.?\s*$'){
    $target = $Matches[1].Trim()
    $canon = $byHeb[$target]; if(-not $canon){ $canon = $byNorm[(Norm $target)] }
    if($canon){
      Add-Member -InputObject $e -NotePropertyName aliasOf -NotePropertyValue $canon.hebrew -Force
      $syn = @(); if($canon.PSObject.Properties.Name -contains 'synonyms'){ $syn = @($canon.synonyms) }
      if($syn -notcontains $e.hebrew){ $syn += $e.hebrew }
      Add-Member -InputObject $canon -NotePropertyName synonyms -NotePropertyValue $syn -Force
    }
  }
}

# 2) genuine synonyms: same normalized english, neither is a stub, not paren-disambiguated
$groups = $data | Group-Object { Norm $_.english } | Where-Object { $_.Count -gt 1 }
foreach($g in $groups){
  $members = @($g.Group | Where-Object { -not ($_.PSObject.Properties.Name -contains 'aliasOf') })
  if($members.Count -lt 2){ continue }
  $bases = $members | ForEach-Object { StripParen $_.hebrew } | Sort-Object -Unique
  if($bases.Count -gt 1){ continue }   # differ only by parenthetical context -> NOT synonyms
  foreach($m in $members){
    $others = @($members | Where-Object { $_.hebrew -ne $m.hebrew } | ForEach-Object { $_.hebrew })
    $cur = @(); if($m.PSObject.Properties.Name -contains 'synonyms'){ $cur = @($m.synonyms) }
    foreach($o in $others){ if($cur -notcontains $o){ $cur += $o } }
    Add-Member -InputObject $m -NotePropertyName synonyms -NotePropertyValue $cur -Force
  }
}

$body = ($data | ConvertTo-Json -Depth 6 -Compress)
Set-Content -Path $path -Value ("window.GLOSSARY = " + $body + ";") -Encoding utf8
"migrated: $($data.Count) entries; aliases=$(@($data | Where-Object {$_.aliasOf}).Count); withSynonyms=$(@($data | Where-Object {$_.synonyms}).Count)"
```

- [ ] **Step 2: Run the migration**

Run (PowerShell): `& "scripts/migrate-aliases.ps1"`
Expected output similar to: `migrated: 465 entries; aliases=9; withSynonyms=>=9`.

- [ ] **Step 3: Write a data-shape test**

Append to `tests/spec-aliases.js`:

```javascript
T.suite('alias-data', function () {
  var G = window.GLOSSARY;
  var byHeb = {}; G.forEach(function (e) { byHeb[e.hebrew] = e; });
  T.test('every aliasOf resolves to a real entry', function () {
    G.filter(function (e) { return e.aliasOf; }).forEach(function (e) { T.ok(byHeb[e.aliasOf], e.hebrew + ' -> ' + e.aliasOf); });
  });
  T.test('the 9 ראה: stubs are aliases', function () {
    var stubs = G.filter(function (e) { return /^\s*ראה:/.test(e.definition); });
    stubs.forEach(function (e) { T.ok(e.aliasOf, e.hebrew + ' should have aliasOf'); });
  });
  T.test('disambiguated pair NOT linked as synonyms', function () {
    var a = byHeb['גורם מגביל (אנזימים)'] || byHeb['גורם מגביל (אקולוגיה)'];
    if (a) T.notOk((a.synonyms || []).some(function (s) { return /גורם מגביל/.test(s); }));
  });
});
```

- [ ] **Step 4: Run to verify it passes**

Run: refresh `tests/index.html`.
Expected: PASS — `alias-data: 3 ok, 0 fail`.

- [ ] **Step 5: Commit**

```bash
git add scripts/migrate-aliases.ps1 glossary.js tests/spec-aliases.js
git commit -m "data: annotate aliasOf/synonyms in glossary; add data-shape tests"
```

---

## Task 4: `lib/aliases.js`

**Files:**
- Create: `lib/aliases.js`
- Test: `tests/spec-aliases.js` (append)

- [ ] **Step 1: Write the failing test**

Append to `tests/spec-aliases.js`:

```javascript
T.suite('aliases-lib', function () {
  var maps = SL.buildAliasMaps(window.GLOSSARY);
  var byHeb = {}; window.GLOSSARY.forEach(function (e) { byHeb[e.hebrew] = e; });
  T.test('resolveEntry returns canonical definition for an alias stub', function () {
    var stub = window.GLOSSARY.filter(function (e) { return e.aliasOf; })[0];
    var resolved = SL.resolveEntry(stub.hebrew, maps);
    T.eq(resolved.hebrew, stub.aliasOf);
    T.ok(!/^\s*ראה:/.test(resolved.definition));
  });
  T.test('synonymsOf is symmetric', function () {
    var withSyn = window.GLOSSARY.filter(function (e) { return e.synonyms && e.synonyms.length; })[0];
    var s = SL.synonymsOf(withSyn.hebrew, maps);
    T.ok(s.indexOf(withSyn.synonyms[0]) !== -1);
    T.ok(SL.synonymsOf(withSyn.synonyms[0], maps).indexOf(withSyn.hebrew) !== -1);
  });
  T.test('isAlias flags stubs only', function () {
    var stub = window.GLOSSARY.filter(function (e) { return e.aliasOf; })[0];
    T.ok(SL.isAlias(stub.hebrew, maps));
    T.notOk(SL.isAlias(stub.aliasOf, maps));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: refresh `tests/index.html`. Expected: FAIL — "SL.buildAliasMaps is not a function".

- [ ] **Step 3: Write minimal implementation**

`lib/aliases.js`:

```javascript
window.SL = window.SL || {};
SL.buildAliasMaps = function (glossary) {
  var byHeb = {}, aliasOf = {}, synonyms = {};
  glossary.forEach(function (e) {
    byHeb[e.hebrew] = e;
    if (e.aliasOf) aliasOf[e.hebrew] = e.aliasOf;
    synonyms[e.hebrew] = (e.synonyms || []).slice();
  });
  return { byHeb: byHeb, aliasOf: aliasOf, synonyms: synonyms };
};
SL.isAlias = function (hebrew, maps) { return !!maps.aliasOf[hebrew]; };
SL.resolveEntry = function (hebrew, maps) {
  var canon = maps.aliasOf[hebrew] || hebrew;
  return maps.byHeb[canon] || maps.byHeb[hebrew] || null;
};
SL.synonymsOf = function (hebrew, maps) {
  var set = {}, out = [];
  (maps.synonyms[hebrew] || []).forEach(function (h) { if (!set[h]) { set[h] = 1; out.push(h); } });
  // include reverse links (aliases pointing here)
  Object.keys(maps.aliasOf).forEach(function (a) { if (maps.aliasOf[a] === hebrew && !set[a]) { set[a] = 1; out.push(a); } });
  return out;
};
```

- [ ] **Step 4: Run to verify it passes**

Run: refresh `tests/index.html`. Expected: PASS — `aliases-lib: 3 ok, 0 fail`.

- [ ] **Step 5: Commit**

```bash
git add lib/aliases.js tests/spec-aliases.js
git commit -m "feat: add SL alias/synonym resolution with tests"
```

---

## Task 5: `lib/search.js`

**Files:**
- Create: `lib/search.js`
- Test: `tests/spec-search.js`

- [ ] **Step 1: Write the failing test**

`tests/spec-search.js`:

```javascript
T.suite('search', function () {
  var index = SL.buildSearchIndex(window.GLOSSARY);
  T.test('finds by hebrew prefix, nikud-insensitive', function () {
    var hits = SL.search(index, 'אוסמ');
    T.ok(hits.length >= 1);
    T.ok(hits.some(function (e) { return e.hebrew.indexOf('אוסמוזה') !== -1; }));
  });
  T.test('finds by english', function () {
    var hits = SL.search(index, 'osmosis');
    T.ok(hits.some(function (e) { return /Osmosis/i.test(e.english); }));
  });
  T.test('title matches rank before definition matches', function () {
    var hits = SL.search(index, 'אנזים');
    var titleIdx = hits.findIndex(function (e) { return SL.normalize(e.hebrew).indexOf('אנזים') !== -1; });
    T.ok(titleIdx === 0);
  });
  T.test('empty query returns all', function () { T.eq(SL.search(index, '').length, window.GLOSSARY.length); });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: refresh. Expected: FAIL — "SL.buildSearchIndex is not a function".

- [ ] **Step 3: Write minimal implementation**

`lib/search.js`:

```javascript
window.SL = window.SL || {};
// Precompute normalized fields ONCE (spec §17), then rank: hebrew(0) < english(1) < definition(2).
SL.buildSearchIndex = function (glossary) {
  return glossary.map(function (e) {
    return { e: e, h: SL.normalize(e.hebrew), en: SL.normalize(e.english), d: SL.normalize(e.definition) };
  });
};
SL.search = function (index, query) {
  var q = SL.normalize(query);
  if (!q) return index.map(function (r) { return r.e; });
  var scored = [];
  for (var i = 0; i < index.length; i++) {
    var r = index[i], rank = -1;
    if (r.h.indexOf(q) !== -1) rank = 0;
    else if (r.en.indexOf(q) !== -1) rank = 1;
    else if (r.d.indexOf(q) !== -1) rank = 2;
    if (rank !== -1) scored.push({ e: r.e, rank: rank, i: i });
  }
  scored.sort(function (a, b) { return a.rank - b.rank || a.i - b.i; });
  return scored.map(function (s) { return s.e; });
};
```

- [ ] **Step 4: Run to verify it passes**

Run: refresh. Expected: PASS — `search: 4 ok, 0 fail`.

- [ ] **Step 5: Commit**

```bash
git add lib/search.js tests/spec-search.js
git commit -m "feat: add precomputed search index + ranked search with tests"
```

---

## Task 6: `lib/quiz.js` (correctness guarantees)

**Files:**
- Create: `lib/quiz.js`
- Test: `tests/spec-quiz.js`

Implements spec §14: eligible items exclude alias stubs and `ראה:` defs; distractors are never synonyms of the answer; `checkAnswer` accepts any synonym for type-answer.

- [ ] **Step 1: Write the failing test**

`tests/spec-quiz.js`:

```javascript
T.suite('quiz', function () {
  var maps = SL.buildAliasMaps(window.GLOSSARY);
  var pool = SL.eligibleTerms(window.GLOSSARY, maps);

  T.test('eligible pool excludes alias stubs and ראה: defs', function () {
    T.ok(pool.length > 400);
    T.notOk(pool.some(function (e) { return e.aliasOf || /^\s*ראה:/.test(e.definition); }));
  });

  T.test('generateItem(pick-definition) has exactly one correct + >=2 distractors, no synonym leaks', function () {
    for (var n = 0; n < 50; n++) {
      var item = SL.generateItem(pool, maps, 'pick-definition', n);
      var correct = item.options.filter(function (o) { return o.correct; });
      T.eq(correct.length, 1);
      T.ok(item.options.length >= 3);
      var ansSyn = SL.synonymsOf(item.term.hebrew, maps).concat([item.term.hebrew]);
      item.options.filter(function (o) { return !o.correct; }).forEach(function (o) {
        T.notOk(ansSyn.indexOf(o.sourceHebrew) !== -1, 'distractor is a synonym of answer');
      });
    }
  });

  T.test('checkAnswer(type-answer) accepts a synonym', function () {
    var withSyn = pool.filter(function (e) { return SL.synonymsOf(e.hebrew, maps).length; })[0];
    if (withSyn) {
      var item = { kind: 'type-answer', term: withSyn };
      var syn = SL.synonymsOf(withSyn.hebrew, maps)[0];
      T.ok(SL.checkAnswer(item, syn, maps));
      T.ok(SL.checkAnswer(item, withSyn.hebrew, maps));
      T.notOk(SL.checkAnswer(item, 'תשובה שגויה לגמרי', maps));
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: refresh. Expected: FAIL — "SL.eligibleTerms is not a function".

- [ ] **Step 3: Write minimal implementation**

`lib/quiz.js`:

```javascript
window.SL = window.SL || {};
SL.eligibleTerms = function (glossary, maps) {
  return glossary.filter(function (e) {
    return !e.aliasOf && !/^\s*ראה:/.test(e.definition) && e.definition && e.definition.length >= 20;
  });
};
// Deterministic pseudo-random from a seed so tests are reproducible (no Math.random).
function rng(seed) { var s = seed % 2147483647; if (s <= 0) s += 2147483646; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function pick(arr, rand) { return arr[Math.floor(rand() * arr.length)]; }

SL.generateItem = function (pool, maps, kind, seed) {
  var rand = rng((seed || 0) + 1);
  var term = pick(pool, rand);
  var banned = {}; SL.synonymsOf(term.hebrew, maps).concat([term.hebrew]).forEach(function (h) { banned[h] = 1; });
  var distractors = pool.filter(function (e) { return !banned[e.hebrew]; });
  // shuffle distractors deterministically, take 2
  distractors = distractors.slice().sort(function () { return rand() - 0.5; }).slice(0, 2);
  var options;
  if (kind === 'pick-definition') {
    options = [{ text: term.definition, correct: true, sourceHebrew: term.hebrew }]
      .concat(distractors.map(function (d) { return { text: d.definition, correct: false, sourceHebrew: d.hebrew }; }));
  } else { // pick-term
    options = [{ text: term.hebrew, correct: true, sourceHebrew: term.hebrew }]
      .concat(distractors.map(function (d) { return { text: d.hebrew, correct: false, sourceHebrew: d.hebrew }; }));
  }
  options = options.sort(function () { return rand() - 0.5; });
  return { kind: kind, term: term, prompt: kind === 'pick-definition' ? term.hebrew : term.definition, options: options };
};
SL.checkAnswer = function (item, response, maps) {
  var accepted = [item.term.hebrew].concat(SL.synonymsOf(item.term.hebrew, maps)).map(SL.normalize);
  return accepted.indexOf(SL.normalize(response)) !== -1;
};
```

- [ ] **Step 4: Run to verify it passes**

Run: refresh. Expected: PASS — `quiz: 3 ok, 0 fail`.

- [ ] **Step 5: Commit**

```bash
git add lib/quiz.js tests/spec-quiz.js
git commit -m "feat: add synonym-safe quiz generation + tolerant checkAnswer with tests"
```

---

## Task 7: `lib/validate.js` + data gate

**Files:**
- Create: `lib/validate.js`
- Test: `tests/spec-validate.js`

- [ ] **Step 1: Write the failing test**

`tests/spec-validate.js`:

```javascript
T.suite('validate', function () {
  var maps = SL.buildAliasMaps(window.GLOSSARY);
  var report = SL.validateGlossary(window.GLOSSARY, maps);
  T.test('returns a report object', function () { T.ok(report && report.errors && report.warnings); });
  T.test('no errors on current data (subject checks are warnings until Plan 2)', function () {
    T.eq(report.errors, []);
  });
  T.test('detects a missing required field', function () {
    var bad = window.GLOSSARY.slice(0, 2).concat([{ hebrew: '', english: 'x', definition: 'y', letter: 'א' }]);
    var r2 = SL.validateGlossary(bad, SL.buildAliasMaps(bad));
    T.ok(r2.errors.length >= 1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: refresh. Expected: FAIL — "SL.validateGlossary is not a function".

- [ ] **Step 3: Write minimal implementation**

`lib/validate.js`:

```javascript
window.SL = window.SL || {};
// subject is a WARNING in Plan 1, promoted to ERROR after Plan 2 tagging.
SL.validateGlossary = function (glossary, maps) {
  var errors = [], warnings = [], seen = {};
  glossary.forEach(function (e, i) {
    var id = e.hebrew || ('#' + i);
    ['hebrew', 'english', 'definition', 'letter'].forEach(function (f) {
      if (!e[f]) errors.push('missing ' + f + ' on ' + id);
    });
    if (e.aliasOf && !maps.byHeb[e.aliasOf]) errors.push('orphan aliasOf on ' + id + ' -> ' + e.aliasOf);
    if (/[�]/.test((e.hebrew || '') + (e.english || '') + (e.definition || ''))) errors.push('replacement char in ' + id);
    var key = SL.normalize(e.hebrew) + '|' + SL.normalize(e.definition);
    if (seen[key] && !e.aliasOf) errors.push('true duplicate (term+def) ' + id);
    seen[key] = 1;
    if (!e.subject && !e.aliasOf) warnings.push('no subject on ' + id);
  });
  return { errors: errors, warnings: warnings };
};
```

- [ ] **Step 4: Run to verify it passes**

Run: refresh. Expected: PASS — `validate: 3 ok, 0 fail`; harness header shows overall **PASS**.

- [ ] **Step 5: Commit**

```bash
git add lib/validate.js tests/spec-validate.js
git commit -m "feat: add glossary validator with tests"
```

---

## Task 8: Full-suite green + summary doc

**Files:**
- Create: `tests/README.md`

- [ ] **Step 1: Run the whole suite**

Run: open `tests/index.html` (or `preview_eval` `() => window.__RESULTS__`).
Expected: header **PASS**, `__RESULTS__.failed === 0`, all five suites green.

- [ ] **Step 2: Write `tests/README.md`**

```markdown
# SHLIFIM tests
Open `tests/index.html` in a browser — green header = all pass. No build/install required.
Logic lives in `../lib/*.js` (framework-free, attached to `window.SL`). Data migration: `../scripts/migrate-aliases.ps1` (re-runnable).
```

- [ ] **Step 3: Commit**

```bash
git add tests/README.md
git commit -m "docs: how to run the browser test suite"
```

---

## Self-Review (against spec)

- **§12 aliases/dedup:** Tasks 3,4,7 (migration + resolution + duplicate detection). ✓
- **§14 quiz correctness:** Task 6 (eligibility, synonym-safe distractors, tolerant checkAnswer, one-correct invariant over 50 generated items). ✓
- **§15 validator:** Task 7 (fields, orphan alias, replacement char, true-dup; subject as warning until Plan 2). ✓
- **§17 (search/quiz scale):** Task 5 precomputed index; Task 6 O(pool) generation. Virtualization/Firestore deferred to Plans 4/6 (out of this plan's scope by design). ✓
- **Type consistency:** `SL.buildAliasMaps → {byHeb,aliasOf,synonyms}` used consistently by `resolveEntry`, `synonymsOf`, `generateItem`, `validateGlossary`; `generateItem` option shape `{text,correct,sourceHebrew}` matches the quiz test. ✓
- **Placeholders:** none — every code/step is concrete. ✓
- **Deferred-by-design (not gaps):** subject `ERROR` promotion (Plan 2), UI (Plans 3–5), Firebase (Plan 6).
