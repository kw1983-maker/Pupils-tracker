# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Where the code lives

The app is the Next.js project in **`pupils-tracker/`** — all feature work happens there.
The repository root holds only the README and shared `docs/`; there is no root
`package.json`. Run every command from inside `pupils-tracker/`.

## Commands

```bash
cd pupils-tracker
npm install
npm run dev      # next dev — http://localhost:3000
npm run build    # next build (production)
npm run start    # serve the production build
npm run lint     # eslint (flat config, eslint-config-next)
npm test         # vitest — pure-logic suites in tests/
```

## Next.js 16 — read the bundled docs before writing framework code

This is Next.js 16 with Turbopack, which has breaking changes vs. older versions
(see `pupils-tracker/AGENTS.md`). APIs, conventions, and file layout may differ from
training data — consult `pupils-tracker/node_modules/next/dist/docs/` before writing
App Router / config / data-fetching code, and heed deprecation notices.

`next.config.ts` pins `turbopack.root` to the project directory so Next doesn't infer
a workspace root from the parent.

## Architecture

Single-page client app: `app/page.tsx` renders a `Shell` wrapped in `TrackerProvider`,
with top-tab navigation (no routing) switching between six page components in
`components/pages/` — Dashboard, HomeworkTracker, Attendance, Behavior, Students,
Analytics. The active tab is local `useState`; `Tab` union is in `lib/types.ts`.

### State — `lib/store.tsx` (the heart of the app)

A single React context (`TrackerProvider` / `useTracker`) owns **all** application
state and every mutation. Pages never touch persistence directly — they call context
methods (`addPupils`, `toggleSubmission`, `setAttendance`, `addBehavior`, etc.).

- **Shape:** `StoreShape` = `{ classes, currentClassId, data, teacherId }` where
  `data` is `Record<classId, ClassData>` and `ClassData` = pupils / assignments /
  submissions / attendance / behavior. The context exposes the *current class's* slice
  flattened (`pupils`, `assignments`, …) so pages consume one class at a time.
- **Immutability:** mutations go through `updateCur(fn)`, which replaces the current
  class's `ClassData` slice immutably.
- **Persistence is two-tier and automatic:**
  1. localStorage under key `STORE_KEY` (`"pupil-tracker-v4"`). **Bump this key when
     the seeded data shape changes** so stale local data is discarded.
  2. Firestore, debounced 1s after any change, *only when `teacherId` is set*.
- **`hydrated` flag:** SSR renders `freshStore()`; real data loads in a `useEffect`
  after mount. Gate any logic that needs persisted data on `hydrated` to avoid
  hydration mismatches (the Shell shows "Loading…" until then).

### Cloud sync — `lib/firebase.ts` + `components/ui/CloudSyncModal.tsx`

Firebase/Firestore, keyed by a human-shareable **teacher key** (`TCHR-XXXX-XXXX`,
auto-generated on first load). Entering the same key on another device pulls that
teacher's data — this is the "account" model; there is no auth. Firestore layout:
`user_state/{teacherId}_metadata` (class list + currentClassId) and
`user_state/{teacherId}_{classId}` (per-class data); snapshots live in `history/`.
`saveMetadata` writes empty `pupils/assignments/submissions` fields to satisfy
Firestore security rules. The Firebase web config in `firebase.ts` is committed
(public client config, as is normal for Firebase web apps).

### Seed data — `lib/rosters.ts`, `lib/spelling-schedule.ts`

`ROSTERS` and `SPELLING_SCHEDULE` are **auto-generated from spreadsheets in
`docs/References/`** (`namelist.xlsx`, `spelling and Dictation.xlsx`) — do not edit by
hand; regenerate from the source workbooks. Fresh stores seed the five default classes
(`2B, 2D, 2F, 1B, 1E`) with their rosters but no assignment columns. The Dashboard
surfaces "spelling/dictation day" alerts by matching today's weekday against
`SPELLING_SCHEDULE`.

### Sign-in, board remote and the phone app

- **Auth** is Firebase Auth (`lib/auth.tsx`: Google popup + username/email); after
  sign-in `teacherId = user.uid`, so data is keyed by the account.
- **Board remote** (`lib/remote.tsx`, `lib/remote-protocol.ts`, `components/ui/BoardRemote.tsx`):
  one device sends a `RemoteCommand`, the others carry it out (`RemoteReceiver`).
  Add new command types to the union *and* `isRemoteCommand`.
- **Phone companion** at `/phone` (`app/phone/`, `components/phone/`): Points, Roll call,
  Photo (shown full-screen on the board via `user_state/{uid}_photo` + a `photo`
  command) and Reminders (`lib/phone-reminders.ts`, scheduled on-device).
- **Android app**: Capacitor project in `android/` (`capacitor.config.ts`) that opens the
  deployed `/phone` page — web changes ship with a deploy; only native/plugin changes need
  a new APK, built by `.github/workflows/android-apk.yml` (no local Android SDK).
  Native calls go through `lib/native.ts` (safe no-ops in a browser).
- **QR phone linking**: `/api/pair/{create,status,claim}` + `components/ui/LinkPhoneModal.tsx`.
  Single-use, 2-minute codes swapped for a Firebase custom token; needs the
  `FIREBASE_SERVICE_ACCOUNT` env var (service-account JSON) — see `lib/firebase-admin.ts`.

## Design system — "Soft Stationery"

Documented in `pupils-tracker/docs/design/` and fully applied. Enforce it:

- **Tokens only.** Use semantic Tailwind utilities — `bg-brand-*`, `text-paper-*`,
  `bg-surface`, `rounded-card`, `shadow-float`, `bg-mark-*`/`text-mark-*-ink`,
  status colors (`success`/`warning`/`danger`). **Never** reintroduce raw
  `slate-*`/`teal-*`/`indigo-*` or hex colors.
- **Token source of truth:** `docs/design/tokens.css`. The Tailwind v4 `@theme` block
  in `app/globals.css` must mirror it (all tokens + motion durations). Keep them in sync.
- **Fonts:** Fraunces (`font-display`, headings/numbers) + Nunito (`font-sans`, UI),
  via `next/font` in `app/layout.tsx`. Not Inter.
- **Shared UI** in `components/ui/`: Button, HighlighterTag (subject markers +
  `markerFor()`), StatusPill, Avatar, EmptyState, Field (use the `Field` wrapper /
  `fieldClassName` for all inputs), SectionCard, StatCard, Donut, Tabs (full
  tab/tabpanel ARIA + roving arrow keys), and `motion.tsx` (`Stagger`/`StaggerItem`/
  `PanelSwap`, reduced-motion aware). Reuse these rather than building new primitives.

## Conventions

- Path alias `@/*` → project root (e.g. `@/lib/store`, `@/components/ui/Button`).
- Charts: `recharts`. Icons: `lucide-react`. Animation: `motion`. Excel export: `xlsx`.
- Components that use hooks/state are `"use client"` (most are, given the SPA model).
