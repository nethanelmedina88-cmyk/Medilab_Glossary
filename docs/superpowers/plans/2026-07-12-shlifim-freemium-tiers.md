# SHLIFIM Freemium Tiers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a three-tier access system (free / registered / paid) to the SHLIFIM PWA that gates capabilities — not the dictionary — driven by a single computed `tier` value.

**Architecture:** A new pure-logic module `lib/tiers.js` (on `window.SL`) computes the tier from Firebase auth state + a server-protected Firestore `entitlements/{uid}` record, and answers `canAccess(feature, tier)`. `app/app-v2.jsx` loads the entitlement, computes `tier`, and gates UI via a `needTier()` helper that opens a sign-up gate or a paywall overlay. Pure logic is unit-tested (browser harness); UI is verified in the preview.

**Tech Stack:** React 18 UMD (no build; JSX compiled in-browser via @babel/standalone, then saved to `app/app-v2.js`), Firebase compat SDK (Auth + Firestore), vanilla PowerShell preview server, browser test harness (`tests/index.html`).

## Global Constraints

- Language/UI: Hebrew, RTL. All new user-facing copy in Hebrew.
- `window.SL` namespace for all pure logic; one responsibility per `lib/*.js` file (existing pattern).
- The `hebrew` field of a term is the identity key for search/audio/favorites — never change it.
- Free sample topic identifier is the exact string `מאפייני חיים` (matches topics.js key/label and glossary `topic`).
- Paid entitlement lives ONLY in `entitlements/{uid}` (read-own, write:false). Never store the paid flag in the user-writable `users/{uid}` doc.
- After ANY edit to `app/app-v2.jsx` you MUST recompile to `app/app-v2.js` (in-browser Babel) — the runtime loads the compiled `.js`, never the `.jsx`.
- Bump `service-worker.js` `CACHE_NAME` once per deploy (currently `shlifim-v43`).
- Deploy = commit on branch `feat-colorful-icons`, then `git push origin feat-colorful-icons:main`.

**Recompile procedure (used by UI tasks):** with the preview running and open, in the browser console run:
```js
if(!window.Babel){await new Promise((r,j)=>{var s=document.createElement('script');s.src='https://unpkg.com/@babel/standalone@7/babel.min.js';s.onload=r;s.onerror=j;document.head.appendChild(s);});}
var src=await (await fetch('/app/app-v2.jsx?x='+Date.now())).text();
var out=Babel.transform(src,{presets:[['react',{runtime:'classic'}]],filename:'app-v2.jsx'}).code;
await fetch('/__save?path=/app/app-v2.js',{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:out});
```

---

### Task 1: `lib/tiers.js` — pure tier logic + tests

**Files:**
- Create: `lib/tiers.js`
- Test: `tests/spec-tiers.js`
- Modify: `tests/index.html` (register the new spec)

**Interfaces:**
- Produces (on `window.SL`):
  - `SL.TIER = { FREE:'free', REGISTERED:'registered', PAID:'paid' }`
  - `SL.FREE_TOPIC` (string `'מאפייני חיים'`)
  - `SL.entitlementValid(ent, nowMs) -> boolean`
  - `SL.tierOf(user, ent, nowMs) -> tier string`
  - `SL.tierRank(tier) -> 0|1|2`
  - `SL.FEATURE_MIN` (map feature->required rank)
  - `SL.canAccess(feature, tier) -> boolean`

- [ ] **Step 1: Write the failing test** — create `tests/spec-tiers.js`:

```js
T.suite('tiers', function () {
  var TIER = SL.TIER;
  var NOW = 1000000000000; // fixed 'now' in ms

  T.test('tierOf: no user -> free', function () {
    T.eq(SL.tierOf(null, null, NOW), TIER.FREE);
  });
  T.test('tierOf: signed in, no entitlement -> registered', function () {
    T.eq(SL.tierOf({ uid: 'u1' }, null, NOW), TIER.REGISTERED);
  });
  T.test('tierOf: signed in, entitlement without until -> paid', function () {
    T.eq(SL.tierOf({ uid: 'u1' }, { season: '2026' }, NOW), TIER.PAID);
  });
  T.test('tierOf: signed in, entitlement until in the future -> paid', function () {
    T.eq(SL.tierOf({ uid: 'u1' }, { until: NOW + 1000 }, NOW), TIER.PAID);
  });
  T.test('tierOf: signed in, entitlement expired -> registered', function () {
    T.eq(SL.tierOf({ uid: 'u1' }, { until: NOW - 1000 }, NOW), TIER.REGISTERED);
  });

  T.test('entitlementValid: null -> false', function () { T.eq(SL.entitlementValid(null, NOW), false); });
  T.test('entitlementValid: no until -> true', function () { T.eq(SL.entitlementValid({}, NOW), true); });
  T.test('entitlementValid: future until -> true', function () { T.eq(SL.entitlementValid({ until: NOW + 1 }, NOW), true); });
  T.test('entitlementValid: past until -> false', function () { T.eq(SL.entitlementValid({ until: NOW - 1 }, NOW), false); });

  T.test('canAccess: glossary is free', function () { T.eq(SL.canAccess('glossary', TIER.FREE), true); });
  T.test('canAccess: audio needs registered', function () {
    T.eq(SL.canAccess('audio', TIER.FREE), false);
    T.eq(SL.canAccess('audio', TIER.REGISTERED), true);
  });
  T.test('canAccess: crossword needs paid', function () {
    T.eq(SL.canAccess('crossword', TIER.REGISTERED), false);
    T.eq(SL.canAccess('crossword', TIER.PAID), true);
  });
  T.test('canAccess: unknown feature defaults open', function () {
    T.eq(SL.canAccess('nonexistent', TIER.FREE), true);
  });
});
```

- [ ] **Step 2: Register the spec** — in `tests/index.html`, find the block of `<script src="spec-*.js"></script>` tags and add after the last one:

```html
<script src="spec-tiers.js"></script>
```

- [ ] **Step 3: Run tests to verify the new suite FAILS**

Serve the tests and open `tests/index.html` in the preview (preview_start name `app-preview`, then navigate to `/tests/index.html`). Read the page text.
Expected: the `tiers` suite errors/fails (SL.tierOf is not a function).

- [ ] **Step 4: Write the implementation** — create `lib/tiers.js`:

```js
window.SL = window.SL || {};

SL.TIER = { FREE: 'free', REGISTERED: 'registered', PAID: 'paid' };
SL.FREE_TOPIC = 'מאפייני חיים';

// An entitlement record grants paid access. `until` (optional) may be a ms number,
// a Firestore Timestamp (has toMillis), or a parseable date string. No `until` = no expiry.
SL.entitlementValid = function (ent, nowMs) {
  if (!ent) return false;
  if (ent.until == null) return true;
  var until;
  if (typeof ent.until === 'number') until = ent.until;
  else if (ent.until && typeof ent.until.toMillis === 'function') until = ent.until.toMillis();
  else until = Date.parse(ent.until);
  return isFinite(until) ? nowMs <= until : true;
};

SL.tierOf = function (user, ent, nowMs) {
  if (!user) return SL.TIER.FREE;
  if (SL.entitlementValid(ent, nowMs)) return SL.TIER.PAID;
  return SL.TIER.REGISTERED;
};

SL.tierRank = function (tier) {
  return tier === SL.TIER.PAID ? 2 : tier === SL.TIER.REGISTERED ? 1 : 0;
};

// Minimum tier rank required per capability. Anything not listed is open (rank 0).
SL.FEATURE_MIN = {
  'glossary': 0,
  'practice-free': 0,
  'practice-all': 1,
  'audio': 1,
  'stats': 1,
  'sync': 1,
  'achievements': 1,
  'crossword': 2,
  'exam': 2,
  'weakspots': 2
};

SL.canAccess = function (feature, tier) {
  var need = SL.FEATURE_MIN[feature];
  if (need == null) return true;
  return SL.tierRank(tier) >= need;
};
```

- [ ] **Step 5: Run tests to verify the `tiers` suite PASSES** — reload `/tests/index.html`, read the page; the `tiers` suite is all green and the overall count increased.

- [ ] **Step 6: Commit**

```bash
git add lib/tiers.js tests/spec-tiers.js tests/index.html
git commit -m "feat(tiers): pure tier-computation logic + tests"
```

---

### Task 2: Load `lib/tiers.js` in the app shell

**Files:**
- Modify: `index.html` (add the script) and `service-worker.js` (precache + bump)

**Interfaces:**
- Consumes: `SL.*` from Task 1.
- Produces: `lib/tiers.js` available at runtime before `app/app-v2.js` runs.

- [ ] **Step 1: Add the script tag** — in `index.html`, find `<script src="lib/validate.js"></script>` and add immediately after it:

```html
<script src="lib/tiers.js"></script>
```

- [ ] **Step 2: Precache it** — in `service-worker.js` `FILES_TO_CACHE`, find `'./lib/validate.js',` and add after it:

```js
  './lib/tiers.js',
```

- [ ] **Step 3: Bump the cache** — in `service-worker.js` change `const CACHE_NAME = 'shlifim-v43';` to `const CACHE_NAME = 'shlifim-v44';`

- [ ] **Step 4: Verify** — start preview, navigate to `/index.html`, in console run `typeof SL.tierOf` → Expected: `"function"`.

- [ ] **Step 5: Commit**

```bash
git add index.html service-worker.js
git commit -m "feat(tiers): load lib/tiers.js in the app shell (SW v44)"
```

---

### Task 3: App state — load entitlement, compute `tier`, add `needTier()` + gate overlay state

**Files:**
- Modify: `app/app-v2.jsx` (App component), then recompile to `app/app-v2.js`

**Interfaces:**
- Consumes: `SL.tierOf`, `SL.canAccess`, `SL.FEATURE_MIN`, `SL.tierRank`; existing `auth`, `db`, `user` state, `onAuthStateChanged` handler, `signOut`.
- Produces (in App scope): `tier` (string), `gate`/`setGate` state (`null | 'signup' | 'paywall'`), `needTier(feature) -> boolean`, `entitlement`/`setEntitlement`.

- [ ] **Step 1: Add entitlement + gate state** — in `app/app-v2.jsx`, find `const [user,setUser]=useState(null); const [sync,setSync]=useState('');` and add on the next line:

```jsx
  const [entitlement,setEntitlement]=useState(null); const [gate,setGate]=useState(null);
  const tier=useMemo(()=>SL.tierOf(user,entitlement,Date.now()),[user,entitlement]);
```

- [ ] **Step 2: Load the entitlement on auth change** — in the `onAuthStateChanged` handler, find the line `try{ const doc=await db.collection('users').doc(u.uid).get();` and immediately BEFORE it insert:

```jsx
      try{ const eDoc=await db.collection('entitlements').doc(u.uid).get(); setEntitlement(eDoc.exists?eDoc.data():null); }catch(e){ setEntitlement(null); }
```
Also, in the same handler where it handles the signed-OUT branch (the `else` that runs when `u` is null — the handler starts `async(u)=>{ setUser(u);`), ensure entitlement clears: find `auth.onAuthStateChanged(async(u)=>{ setUser(u);` and change it to `auth.onAuthStateChanged(async(u)=>{ setUser(u); if(!u) setEntitlement(null);`

- [ ] **Step 3: Clear entitlement on explicit sign-out** — find `const signOut=async()=>{ loadingRef.current=true;` and add `setEntitlement(null);` right after `loadingRef.current=true;`.

- [ ] **Step 4: Add the `needTier` helper** — directly after the `tier` useMemo line from Step 1, add:

```jsx
  // Returns true if the feature is accessible; otherwise opens the right gate and returns false.
  function needTier(feature){
    if(SL.canAccess(feature,tier)) return true;
    setGate(!user ? 'signup' : 'paywall');
    return false;
  }
```

- [ ] **Step 5: Recompile** — run the Recompile procedure from Global Constraints.

- [ ] **Step 6: Verify** — reload `/index.html`; in console run `SL.TIER` (sanity) and confirm no errors in `read_console_messages`. As a guest, `tier` is `'free'` (verify by temporarily logging: not required — just confirm the app renders and console is clean).

- [ ] **Step 7: Commit**

```bash
git add app/app-v2.jsx app/app-v2.js
git commit -m "feat(tiers): compute tier from auth+entitlement, add needTier gate helper"
```

---

### Task 4: Gate overlays — `SignUpGate` and `Paywall`

**Files:**
- Modify: `app/app-v2.jsx` (add two components + render them), `app/styles-v2.css` (overlay styles), then recompile

**Interfaces:**
- Consumes: `gate`, `setGate`, `signIn` (existing), the existing `.overlay`/`.sheet-card` CSS classes used by other sheets.
- Produces: `<SignUpGate onClose onSignIn/>`, `<Paywall onClose/>` rendered when `gate` is set.

- [ ] **Step 1: Add the components** — in `app/app-v2.jsx`, directly ABOVE `function App(){`, add:

```jsx
function SignUpGate({onClose,onSignIn}){
  return (<div className="overlay" onClick={onClose}><div className="sheet-card gate-card" onClick={e=>e.stopPropagation()}>
    <div className="gate-emoji">🔑</div>
    <h3>הירשמו בחינם כדי לפתוח</h3>
    <p>חשבון חינמי פותח את כל מצבי התרגול, ההקראה, מעקב ההתקדמות והסנכרון בין המכשירים.</p>
    <button className="google-btn" onClick={onSignIn}>המשך עם Google</button>
    <button className="btn btn-ghost" onClick={onClose}>אולי אחר כך</button>
  </div></div>);
}
function Paywall({onClose}){
  return (<div className="overlay" onClick={onClose}><div className="sheet-card gate-card" onClick={e=>e.stopPropagation()}>
    <div className="gate-emoji">⭐</div>
    <h3>כלי הבגרות המתקדמים</h3>
    <p>התשחץ, מצב הבחינה והחזרה הממוקדת פתוחים במסלול הבגרות — <b>₪19.90 לעונה</b>, תשלום חד־פעמי.</p>
    <a className="btn btn-accent" href="https://wa.me/972524295838?text=%D7%90%D7%A9%D7%9E%D7%97%20%D7%9C%D7%A8%D7%9B%D7%95%D7%A9%20%D7%90%D7%AA%20%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%20%D7%94%D7%91%D7%92%D7%A8%D7%95%D7%AA%20%D7%91%D7%A9%D7%9C%D7%99%D7%A4%D7%99%D7%9D" target="_blank" rel="noopener" style={{textDecoration:'none'}}>לגישה מוקדמת — צרו קשר</a>
    <button className="btn btn-ghost" onClick={onClose}>סגירה</button>
  </div></div>);
}
```

- [ ] **Step 2: Render the gates** — in App's returned JSX, find `{qTerm && <TermQuiz` and add on the line ABOVE it:

```jsx
      {gate==='signup' && <SignUpGate onClose={()=>setGate(null)} onSignIn={()=>{setGate(null);signIn();}}/>}
      {gate==='paywall' && <Paywall onClose={()=>setGate(null)}/>}
```

- [ ] **Step 3: Add styles** — append to `app/styles-v2.css`:

```css
.gate-card{text-align:center;max-width:340px}
.gate-emoji{font-size:44px;line-height:1;margin-bottom:6px}
.gate-card h3{font-family:'Secular One';margin:4px 0 6px;font-size:20px}
.gate-card p{color:var(--text-2);font-size:14px;margin:0 0 16px}
.gate-card .btn,.gate-card .google-btn{width:100%;margin-top:8px}
```

- [ ] **Step 4: Recompile** (Recompile procedure).

- [ ] **Step 5: Verify** — reload; in console run `document.querySelector('.app') && (function(){})()` — then trigger a gate manually for a visual check: in console, temporarily `SL.canAccess` is fine; instead verify in Task 5/6 where gates are wired. For now confirm no console errors.

- [ ] **Step 6: Commit**

```bash
git add app/app-v2.jsx app/app-v2.js app/styles-v2.css
git commit -m "feat(tiers): sign-up gate + paywall overlays"
```

---

### Task 5: Gate the crossword tab (paid)

**Files:**
- Modify: `app/app-v2.jsx` (Nav component + `changeMode`), `app/styles-v2.css` (lock badge), then recompile

**Interfaces:**
- Consumes: `tier`, `needTier`, `SL.canAccess`, existing `Nav({mode,setMode})`, existing `changeMode`.
- Produces: crossword tab shows a 🔒 for non-paid and opens the paywall instead of switching.

- [ ] **Step 1: Pass tier to Nav** — find `<Nav mode={mode} setMode={changeMode}/>` and change to `<Nav mode={mode} setMode={changeMode} tier={tier}/>`.

- [ ] **Step 2: Gate in changeMode** — find `const changeMode=` (the function App uses to switch tabs). Immediately inside it, before it sets the mode, add a guard. If the current body is e.g. `const changeMode=(m)=>{ setMode(m); ... }`, change the first line to:

```jsx
  const changeMode=(m)=>{ if(m==='crossword' && !needTier('crossword')) return; setMode(m);
```
(Keep the rest of the original function body unchanged.)

- [ ] **Step 3: Lock badge in Nav** — in `function Nav({mode,setMode})` change the signature to `function Nav({mode,setMode,tier})` and find the `.map(...)` that renders each tab button. Inside the button, add a lock overlay when the tab is gated. Locate the tuple array (it contains `['crossword','תשבץ',IcGrid,'x']`) and the JSX that renders each entry `[m,label,Ic,c]`. In that JSX, add just before the label text:

```jsx
{!SL.canAccess(m==='crossword'?'crossword':'glossary', tier) && <span className="nav-lock">🔒</span>}
```

- [ ] **Step 4: Style the lock** — append to `app/styles-v2.css`:

```css
.nav-lock{position:absolute;top:2px;inset-inline-end:calc(50% - 18px);font-size:10px;filter:grayscale(1);opacity:.8}
.tab{position:relative}
```

- [ ] **Step 5: Recompile** (Recompile procedure).

- [ ] **Step 6: Verify (guest)** — reload as guest. In console:
```js
var tabs=[...document.querySelectorAll('.tab')]; tabs.find(b=>/תשבץ/.test(b.textContent)).click();
setTimeout(()=>console.log('paywall shown:', !!document.querySelector('.gate-card')), 300);
```
Expected: `paywall shown: true` (guest is not paid → paywall opens; mode did NOT switch to crossword). Close it: `document.querySelector('.overlay').click()`.

- [ ] **Step 7: Commit**

```bash
git add app/app-v2.jsx app/app-v2.js app/styles-v2.css
git commit -m "feat(tiers): gate the crossword tab behind the paid tier"
```

---

### Task 6: Limit free practice to the sample topic (flashcards + quiz)

**Files:**
- Modify: `app/app-v2.jsx` (Flashcards, Quiz, and their render sites), then recompile

**Interfaces:**
- Consumes: `tier`, `needTier`, `SL.FREE_TOPIC`, `SL.canAccess`.
- Produces: for `tier==='free'`, Flashcards and Quiz operate ONLY on `SL.FREE_TOPIC`; attempting another topic opens the sign-up gate.

- [ ] **Step 1: Pass props to Flashcards/Quiz** — find the render sites:
  - `{mode==='flashcards' && <Flashcards` → add props `tier={tier} onNeedAll={()=>needTier('practice-all')}`
  - `{mode==='quiz' && <Quiz` → add the same two props.

- [ ] **Step 2: Force the free topic in Flashcards** — in `function Flashcards(`, add `tier` and `onNeedAll` to its destructured props. Find where it initializes its topic state (a `useState` for the selected topic). Change the initial value so that when `tier==='free'` it starts at `SL.FREE_TOPIC`. Then find its topic-select control (the `TopicChips` / topic `<select>`); wrap the change handler so a free user who picks a non-free topic triggers the gate instead:

```jsx
  const lockTopics = tier==='free';
  function pickTopic(next){
    if(lockTopics && next && next!==SL.FREE_TOPIC){ onNeedAll && onNeedAll(); return; }
    setTopic(next);
  }
```
Replace the topic control's `onPick`/`onChange` to call `pickTopic`. Ensure the deck is filtered to `SL.FREE_TOPIC` when `lockTopics` (if the component derives its pool from `topic`, forcing `topic=SL.FREE_TOPIC` initial value is sufficient; also guard any "all topics" default).

- [ ] **Step 3: Force the free topic in Quiz** — repeat Step 2's pattern in `function Quiz(`: add `tier`,`onNeedAll` props, initialize its topic to `SL.FREE_TOPIC` when `tier==='free'`, and route topic changes through the same `pickTopic` guard.

- [ ] **Step 4: Add a hint banner** — in both Flashcards and Quiz, when `lockTopics`, render a small banner above the content:

```jsx
{lockTopics && <div className="free-hint" onClick={()=>onNeedAll&&onNeedAll()}>🔓 גרסה חינמית — נושא לדוגמה. הירשמו בחינם לכל 21 הנושאים</div>}
```

- [ ] **Step 5: Style the banner** — append to `app/styles-v2.css`:

```css
.free-hint{background:var(--surface-2);border:1px dashed var(--border);border-radius:12px;padding:8px 12px;font-size:13px;color:var(--text-2);text-align:center;margin-bottom:12px;cursor:pointer}
```

- [ ] **Step 6: Recompile** (Recompile procedure).

- [ ] **Step 7: Verify (guest)** — reload as guest, click the כרטיסיות tab. In console:
```js
console.log('banner:', !!document.querySelector('.free-hint'));
```
Expected: `banner: true`. Confirm the deck only contains the sample topic (the topic control shows מאפייני חיים and switching triggers the sign-up gate).

- [ ] **Step 8: Commit**

```bash
git add app/app-v2.jsx app/app-v2.js app/styles-v2.css
git commit -m "feat(tiers): free tier limited to the sample topic in flashcards + quiz"
```

---

### Task 7: Gate audio for the free tier + tier indicator in Profile

**Files:**
- Modify: `app/app-v2.jsx` (audio buttons + Profile), then recompile

**Interfaces:**
- Consumes: `tier`, `needTier`, `SL.canAccess`.
- Produces: free users tapping 🔊 get the sign-up gate; Profile shows the current tier.

- [ ] **Step 1: Thread a guarded speak into components** — in App, add near `needTier`:

```jsx
  const guardedSpeak=(key,spoken)=>{ if(!needTier('audio')) return; Speak(key,spoken); };
```
Pass `speak={guardedSpeak}` to `Glossary`, `Flashcards`, `Quiz` render sites (add the prop alongside existing props). In each of those components, accept a `speak` prop and replace the direct `Speak(...)` calls in their 🔊 buttons with `speak(...)` (same arguments). (TermQuiz/Review that reach audio through Glossary inherit it via the same prop.)

- [ ] **Step 2: Tier label in Profile** — in `function Profile(`, add `tier` to its props and to its render site (`<Profile ... tier={tier}/>`). Near the top of Profile's returned JSX (by the name/avatar), add:

```jsx
<div className={`tier-badge tier-${tier}`}>{tier===SL.TIER.PAID?'מסלול בגרות ✓':tier===SL.TIER.REGISTERED?'מסלול הרשמה':'אורח'}</div>
```

- [ ] **Step 3: Style the badge** — append to `app/styles-v2.css`:

```css
.tier-badge{display:inline-block;font-family:'Secular One';font-size:12px;padding:3px 10px;border-radius:999px;background:var(--surface-2);color:var(--text-2);margin-top:4px}
.tier-badge.tier-paid{background:var(--grad);color:#fff}
```

- [ ] **Step 4: Recompile** (Recompile procedure).

- [ ] **Step 5: Verify (guest)** — reload as guest, open the glossary, click a 🔊 button. In console:
```js
document.querySelector('.ibtn')&&document.querySelector('.ibtn').click();
setTimeout(()=>console.log('gate:', !!document.querySelector('.gate-card')),300);
```
Expected: `gate: true` (sign-up gate opened; no audio for guests). Close it.

- [ ] **Step 6: Commit**

```bash
git add app/app-v2.jsx app/app-v2.js app/styles-v2.css
git commit -m "feat(tiers): gate audio for free tier + profile tier indicator"
```

---

### Task 8: Firestore security rules for `entitlements/{uid}`

**Files:**
- Create: `firestore.rules` (committed for record; published manually in the Firebase console)

**Interfaces:**
- Consumes: nothing in-app; documents the server-side protection the design depends on.
- Produces: rules that make `entitlements/{uid}` read-own / write-never-from-client.

- [ ] **Step 1: Create `firestore.rules`:**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users own their sync doc (favorites/studied/stats).
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    // Paid entitlements: readable only by the owner, NEVER writable from a client.
    // Grant via Firebase console / Admin SDK / a future payment webhook only.
    match /entitlements/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if false;
    }
  }
}
```

- [ ] **Step 2: Manual publish note** — this file is NOT auto-deployed. Publish it in the Firebase console (project `shlifim-medilab`, under Google account /u/1/): Firestore → Rules → paste → Publish. To grant a buyer: Firestore → create doc `entitlements/{their-uid}` with `{ season: "2026" }` (optionally `until`).

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "chore(security): firestore rules protecting entitlements/{uid}"
```

- [ ] **Step 4: Deploy the whole feature** — bump `service-worker.js` `CACHE_NAME` to `shlifim-v45`, commit, and push:

```bash
git add service-worker.js && git commit -m "chore: bump SW to v45 for freemium tiers"
git push origin feat-colorful-icons:main
```
Then verify live: fetch `lib/tiers.js?cb=<rand>` (200) and `service-worker.js` shows `v45`.

---

## Manual end-to-end verification (after all tasks)

1. **Guest (free):** full glossary reads; כרטיסיות/מבחון limited to מאפייני חיים with the free-hint banner; 🔊 → sign-up gate; תשבץ tab → paywall.
2. **Registered:** sign in with Google → all topics unlock, 🔊 works, stats/sync work, Profile shows "מסלול הרשמה"; תשבץ still → paywall.
3. **Paid:** in the Firebase console create `entitlements/{your-uid}` `{ season:"2026" }`, reload → תשבץ opens, Profile shows "מסלול בגרות ✓".

## Follow-up (separate small plan)

The paid-only **exam mode** (timed, scored quiz run) and **weak-spots review** (quiz/flashcards scoped to review-pins ∪ unstudied) are thin extensions of the existing quiz engine and are best delivered as their own short plan once the tier scaffolding above is verified. They plug into the same `needTier('exam')` / `needTier('weakspots')` gates. **Phase 2** billing (Google Play Billing or an Israeli gateway writing `entitlements/{uid}`) is also a separate plan.
