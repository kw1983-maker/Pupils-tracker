# Pupil Tracker for Android: phone companion app

## Context
The teacher wants an Android app on **their own phone** that works alongside the Pupil Tracker web app (on the laptop/projector). It links to the web app by **scanning a QR code**. Chosen features:
1. **Classroom remote**: give behaviour points from the phone, and the pupil's pet reacts on the projector. Also run the picker, timer and class-control from the phone.
2. **Quick attendance**: a roll call screen built for the phone.
3. **Reminders**: phone notifications for spelling/dictation days, calendar events and homework reminders.
4. **Show a photo big now**: take or pick a photo on the phone and it pops up full-screen on the projector.

Delivered as a **real installable APK** for personal use (no Play Store).

Not included: pupil-facing or shared-tablet mode, homework QR stickers, saving photos to pupil records, Play Store publishing.

### What already exists (from exploring the code; CLAUDE.md is out of date on this)
- **Firebase Auth** (Google popup + email) in `lib/auth.tsx`. After sign-in, `teacherId = user.uid` (`lib/store.tsx:646,675`).
- **Board remote**: `lib/remote.tsx`, `lib/remote-protocol.ts` (`RemoteCommand` union, `isRemoteCommand`), `components/ui/BoardRemote.tsx` (`RemoteReceiver` on the projector side, `BoardRemoteModal` on the phone side). Commands reach the other device three ways (the `_remote` doc, the metadata `remote` field, and the class doc `boardCommand`). Pick, timer, tab, class, spelling and rules commands already work.
- Behaviour marks already sync live across devices through the class doc.
- Deployed on Vercel (project `pupils-tracker-r7zb`). The app has many `app/api/*` routes, so a static export of the whole app is not possible.
- `vitest` is set up (`npm test`, `tests/remote-protocol.test.ts`).

## Approach

### 1. App shell: Capacitor wrapping a new `/phone` route (my call)
- Add `app/phone/page.tsx`: a mobile-first screen with bottom tabs (**Remote · Attendance · Photo · Reminders**). It reuses `TrackerProvider`, `RemoteProvider`, `useAuth` and the Soft Stationery UI primitives (`Button`, `Avatar`, `Field`, `SectionCard`, `Tabs`, `motion.tsx`).
- The Capacitor Android project lives in `pupils-tracker/android/`, with `capacitor.config.ts` setting `server.url` to the deployed `https://<vercel-domain>/phone`. Phone screens then ship with every web deploy, and only native changes need a new APK.
- Plugins: `@capacitor-mlkit/barcode-scanning` (QR), `@capacitor/camera`, `@capacitor/local-notifications`, `@capacitor/preferences`.
- The code detects that it's running inside the app with `Capacitor.isNativePlatform()`. In a normal browser, `/phone` still works without the native features.
- Trade-off: the app needs internet to *open*. Once open, Firestore's offline cache keeps marks and attendance working during short Wi-Fi drops. Full offline launch would need a separately bundled build, which is deferred.
- Add `android/` to the eslint ignores. Read `node_modules/next/dist/docs/` before adding the route and the API routes (Next 16).

### 2. QR linking that doubles as phone sign-in
Google popup sign-in doesn't work inside an Android WebView, so the QR scan *is* how the phone signs in. A QR code alone must never be enough for a stranger to get in.
- **Web app**: a "Link phone" button (in the account/cloud menu) calls `POST /api/pair/create` with the user's Firebase ID token. The server verifies the token and writes `pairings/{code}` = `{ uid, expiresAt: now+2min, used:false }`. The page shows a QR code of the code with a countdown, and listens on that doc.
- **Phone**: scan → `POST /api/pair/claim {code, deviceName}` → server checks the code is unused and unexpired, marks it used, and returns `admin.auth().createCustomToken(uid)` → phone calls `signInWithCustomToken`. From then on `teacherId = uid` and the same data loads.
- The web app shows "Phone linked ✓ (device name)" when the doc flips to used. A "Linked devices / unlink" option comes later and is out of scope for v1.
- New dependencies: `firebase-admin` (server only) and the `qrcode` package for drawing the QR on the web side.
- **Needs the teacher**: create a Firebase service-account key and add it to Vercel env vars as `FIREBASE_SERVICE_ACCOUNT`.

### 3. Remote tab
- A pupil grid for the current class (class switcher at the top). Tap a pupil, then ＋1/＋2/−1 with an optional note, which calls the existing `addBehavior` from `useTracker()`. The projector's Pets tab already reacts to synced marks; check during implementation that the stage-up/celebration plays on a *remote* mark too.
- Below the grid, the existing `BoardRemoteModal` controls (picker, timer, class-control, tab switch) are pulled out into an inline `BoardRemotePanel` so both the modal and the phone page use it.

### 4. Attendance tab
- Today's date, all pupils shown as present by default, tap to cycle **present → absent → late**. One "Save" button calls the existing `setAttendance`. It shows today's counts and works for any class.

### 5. Photo tab: "Show on board"
- Take a photo or pick from the gallery (`@capacitor/camera`), then resize on the phone to max 1280px, JPEG ~0.7 (around 200–400 KB).
- **Stored in Firestore, not Firebase Storage** (my call): write `user_state/{uid}_photo = { dataUrl, at, cmdId }`, overwriting each time. That keeps it under the 1 MiB document limit and avoids enabling Storage, which needs the paid Blaze plan for new buckets. Shown photos are temporary, so keeping only the latest is fine.
- Add `RemoteCommand` variants `{type:"photo", action:"show"|"hide"}` in `lib/remote-protocol.ts` (and to `isRemoteCommand`). `RemoteReceiver` handles them by opening a new full-screen `PhotoShow` overlay that reads `_photo`, with a tap or Esc to close. The phone gets "Hide" and "Show again" buttons.
- Check `firestore.rules` (in the Firebase console if it's not in the repo) to confirm a `{uid}_photo` doc is allowed, the same way `{uid}_remote` already is.

### 6. Reminders tab: on-phone scheduled notifications (no push server)
- On app open and whenever data changes, cancel and reschedule local notifications for the next 14 days from: `nextSpelling` per class, `SPELLING_SCHEDULE` weekdays, upcoming `calendarEvents`, and open `homeworkReminders`.
- Timing (my call): **8:00 pm the day before** and **7:00 am on the day**, with a simple on/off per type and time pickers in the tab. Settings are saved in `@capacitor/preferences`.
- Ask for Android 13+ notification permission the first time the tab opens.

### 7. Build & install
- Prerequisite check first: Android Studio / SDK + JDK 21 on this PC. If they're missing, build the APK in GitHub Actions instead and download it.
- `npx cap sync android` → `./gradlew assembleDebug` → `android/app/build/outputs/apk/debug/app-debug.apk`, installed by USB or by sending the file to the phone. App name "Pupil Tracker", with an icon from the existing branding.

## Critical files
- New: `app/phone/page.tsx`, `components/phone/*` (RemoteTab, AttendanceTab, PhotoTab, RemindersTab), `components/ui/LinkPhoneModal.tsx`, `components/ui/PhotoShow.tsx`, `app/api/pair/create/route.ts`, `app/api/pair/claim/route.ts`, `lib/firebase-admin.ts`, `lib/phone-reminders.ts` (a pure function that turns data into a notification list), `capacitor.config.ts`, `android/`
- Modified: `lib/remote-protocol.ts`, `components/ui/BoardRemote.tsx` (pull out the panel, handle photo commands), `lib/firebase.ts` (`savePhoto`/`subscribePhoto`), `eslint.config.mjs`, `package.json`, `CLAUDE.md` (bring the auth/remote/tests/phone sections up to date)

## Order of work
1. Write this design to `docs/superpowers/specs/2026-11-03-android-companion-design.md`.
2. `/phone` route + Remote and Attendance tabs (testable in a desktop browser right away).
3. Photo command + PhotoShow overlay.
4. Pairing API routes + Link phone modal (needs the service-account env var).
5. Capacitor wrap + QR scan + camera + reminders, then build the APK.

## Verification
- `npm test`: add vitest cases for the new `photo` remote command (`isRemoteCommand`/parse), pairing expiry/single-use logic (pulled out into a pure helper), and `lib/phone-reminders.ts` scheduling.
- `npm run lint` and `npm run build` are clean.
- Two browser windows (`/` as the projector, `/phone` as the phone, same account): a mark from the phone shows on the projector Pets tab; the timer and picker still work; a photo shows and hides full-screen; attendance saves and appears on the Attendance page.
- Pairing: a QR code expires after 2 minutes, a used code is refused, and a claimed code signs the phone into the same account.
- On the real phone (APK): scan, link, then a mark, a photo on the board, and a test notification fired 1 minute ahead.
