---
name: design-system
description: ClassTrack Pro "Soft Stationery" design system — doc locations, token source of truth, and core conventions
metadata:
  type: project
---

"Soft Stationery" design system for ClassTrack Pro (a pupil tracker). Next.js 16 + React 19 + Tailwind v4 + lucide-react + motion + recharts.

**Doc locations** (all under `docs/design/`):
- `README.md` — overview / migration map
- `style-guide.md` — aesthetic rules, a11y baseline, do/don't
- `design-tokens.md` — token reference tables + wiring instructions
- `tokens.css` — the Tailwind v4 `@theme` block, the **source of truth in code**
- `components.md` — per-component specs with code snippets
- `1.png.jpg` — reference image (single file; the README's mention of a `references/` folder is aspirational — folder does not exist)

**Source of truth in code:** `app/globals.css` `@theme` block should mirror `docs/design/tokens.css`.

**Core conventions:**
- Fonts: Fraunces (`font-display`, headings/numbers) + Nunito (`font-sans`, UI). No Inter.
- Semantic utilities only: `bg-brand-*`, `text-paper-*`, `bg-surface`, `rounded-card`, `shadow-float`, `bg-mark-*`/`text-mark-*-ink`, status `bg-{success|warning|danger|info}[-bg]`. No raw slate/teal/indigo/gray Tailwind classes or hex literals in components.
- Eyebrow label pattern: `text-2xs font-bold uppercase tracking-wider text-paper-400`.
- Card primitive: `.card` = `bg-surface rounded-card shadow-float` (defined in globals).
- Focus is always `shadow-ring` (3px teal glow), never browser outline.
- Status must be color + icon + text label, never color alone.

Build is in strong shape: no raw slate/teal/indigo/gray classes and no hex literals found in components (grep clean). Charts use CSS var tokens. See [[known-issues]] for the discrepancies that do exist.
