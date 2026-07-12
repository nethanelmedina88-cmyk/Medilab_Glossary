# SHLIFIM — Freemium Tiers Design

**Date:** 2026-07-12
**Status:** Approved (design). Ready for implementation planning.
**App:** SHLIFIM (שליפים) — Hebrew RTL biology-vocabulary PWA, React UMD (no build), Firebase Auth + Firestore, GitHub Pages + Google Play (TWA).

## 1. Goal

Introduce three access tiers to build an audience, generate leads, and offer a cheap paid upgrade:

1. **Free** — open to all, no login. Builds audience/reputation and SEO ("מדע קצר ולעניין").
2. **Registered** — free, requires a Google account. Its purpose is **lead generation** (capture the student behind an account/email).
3. **Paid** — a **one-time ₪19.90 for the bagrut season** (NOT ₪4.90/month recurring). At this micro-price, recurring billing's fees + churn + dunning ops aren't worth it; a one-time seasonal unlock matches how students actually buy (cram before the exam).

**Splitting philosophy:** *feature ladder* — gate capabilities, not the dictionary itself. The glossary content stays fully open (trust, word-of-mouth, discoverability); the locks are on *tools*.

## 2. Tier detection (identity → tier)

A single source of truth `tier ∈ {free, registered, paid}` computed on auth/entitlement load:

- **free** — not signed in (guest, the default).
- **registered** — signed in with Google (Firebase Auth; already wired in the app).
- **paid** — signed in **and** a valid entitlement record exists in Firestore.

## 3. Content split

### 🟢 Free — no login
- **Full glossary reading**: all 465 terms — definitions, nikud, English name, search, and both filters (letter + topic).
- **Practice taste**: flashcards + quiz limited to **one sample topic** (`מאפייני חיים`).
- **Local** favorites / studied marks (localStorage, this-device-only, no sync).
- About page + PWA install.

### 🔵 Registered — free, requires account (lead gen)
Everything in Free, plus:
- **Full flashcards + full quiz** on all 21 topics.
- **Audio pronunciation** (🔊) for every term.
- **Progress tracking + stats** (progress ring, per-topic bars, accuracy).
- **Achievements / badges** (32) + day streak.
- **Cross-device sync** (favorites, studied, stats) via Firestore.

### 🟡 Paid — ₪19.90 / season
Everything in Registered, plus the "exam power" layer:
- **Crossword (תשחץ)** — per-topic crosswords; the fun differentiator, paid-exclusive.
- **Exam mode** — a timed, scored run over a whole topic or mixed.
- **Weak-spots focused review** — auto-drill the terms you got wrong / haven't studied, driven by the stats.
- *(Future)* printable test generator + study plan.

## 4. Gating architecture

- **Client-side UI gating** driven by the single `tier` value. Each gated feature checks `tier` (e.g., practice beyond the free topic requires `tier !== 'free'`; crossword / exam-mode / weak-spots require `tier === 'paid'`).
- **Honest security posture:** the app is static — all data ships to the client — so gating is on the *interface*, and is bypassable by a technical user. This is acceptable for a high-school audience at a ₪19.90 price; we are not building a DRM fortress.
- **Entitlement is server-protected against self-granting.** The paid flag is NOT stored in the user-writable `users/{uid}` doc. It lives in a **separate `entitlements/{uid}` document**:
  - Shape: `{ season: '2026', until: <timestamp>, grantedAt: <timestamp>, source: 'manual' | 'play' | 'gateway' }`.
  - Firestore rules: `allow read: if request.auth != null && request.auth.uid == uid; allow write: if false;` — writable only via the Firebase console / Admin SDK / a future payment webhook. The user can read (to unlock the UI) but cannot grant themselves.
  - `users/{uid}` keeps its existing user-writable rules for favorites/studied/stats.
- `tier` is `paid` when `entitlements/{uid}` exists and (if `until` is set) is not expired.

## 5. UX for locked content

- Locked nav tab / button shows a **lock badge 🔒**.
- Tapping a **Registered-gated** feature → a friendly **Sign-up gate**: *"הירשם בחינם כדי לפתוח"* + Google sign-in button. This is the lead-generation moment.
- Tapping a **Paid-gated** feature → a **Paywall screen**: *"פתח את כל כלי הבגרות ב-₪19.90 לעונה"*.
  - **Phase 1 (no billing yet):** the CTA is *"בקרוב / צור קשר לגישה מוקדמת"* (e.g., WhatsApp/contact) — captures purchase intent; the owner grants the entitlement manually in the console for early buyers.
  - **Phase 2:** the CTA triggers real checkout.
- Profile shows a **tier indicator** ("מסלול: הרשמה" / "בתשלום ✓").

## 6. Phasing

- **Phase 1 (now):**
  1. Tier detection (guest / registered / paid via `entitlements/{uid}`).
  2. Feature gating per §3.
  3. Sign-up-to-unlock UX (fully functional — reuses existing Google auth).
  4. Paywall screen (offer + manual/contact CTA; owner grants entitlement manually).
  5. Firestore security rules for `entitlements/{uid}`.
  - **Paid features in Phase 1:** *Crossword* already exists — it is only *gated*. *Exam mode* and *weak-spots review* are new but small (both are thin extensions of the existing quiz engine: exam mode = a timed, scored quiz run; weak-spots = the quiz pool filtered to wrong/unstudied terms) and are built in this phase. The *test generator + study plan* remain future (§3), not Phase 1.
- **Phase 2 (later):** integrate real billing that writes `entitlements/{uid}` automatically on payment. Provider TBD — likely **Google Play Billing** if Android-app-first (best economics + least ops at this price), or an **Israeli web gateway** (Grow/Meshulam, PayPlus) for the website. Google Play policy forbids selling digital goods via non-Google payment *inside* the Play app.

## 7. Out of scope / notes

- No server backend beyond Firebase (Auth + Firestore).
- Real payment integration is Phase 2, explicitly deferred.
- Minors + billing: parental-consent considerations belong to Phase 2 (billing).
- Existing content (glossary, modes, crossword, stats, audio, nikud) already exists; this work adds the tier layer around it, it does not rebuild features.

## 8. Success criteria

- A guest can read the full glossary and try one topic of practice, with clear prompts to sign up.
- Signing in unlocks all practice + audio + stats + sync (no code duplication — same features, gated).
- Paid features are hidden/locked for registered users and shown only when `entitlements/{uid}` is present; a user cannot self-grant.
- The paywall clearly presents the ₪19.90 seasonal offer and a working Phase-1 CTA.
