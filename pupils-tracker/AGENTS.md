<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- The app lives in `pupils-tracker/` (npm, `package-lock.json`). Run every command from there. Standard commands are in `CLAUDE.md` / `package.json`: `npm run dev` (Turbopack dev on port 3000), `npm run build`, `npm run lint`, `npm run test` (Vitest). The update script already runs `npm install` for you.
- `npm run lint` exits non-zero, but every reported error/warning comes only from the generated vendor assets in `public/ffmpeg/` (copied from `node_modules` by the `postinstall` `copy-ffmpeg.mjs` script; the dir is gitignored). The app's own source (`app/`, `components/`, `lib/`, `tests/`) lints clean — don't treat the `public/ffmpeg/` noise as a regression, and lint a specific path if you want a clean signal.
- The core product (Dashboard, Homework, Attendance, Calendar, Students/Behavior, Pets, Analytics) is a client-side SPA: it needs no secrets and persists to `localStorage`; optional Firestore sync uses the committed public web config in `lib/firebase.ts`. On first client load it self-generates a teacher key, so it works fully offline in the browser.
- Only the "Teach & Tools" API routes need secrets (all optional, server-side only, listed in `.env.example`): `GEMINI_API_KEY` (Tutor), `HF_TOKEN`/`PIXABAY_API_KEY` (image gen/search), `ELEVENLABS_API_KEY` (Spelling song / Story audio), `GOOGLE_SHEETS_*` (Resources lesson-plan sync). Absent keys only disable those specific AI features; the rest of the app is unaffected.
- Vitest suites under `tests/` cover only the pure pet-system logic (level curve, mark economy, PK balance) in a Node env — there is no DOM/UI test runner.
