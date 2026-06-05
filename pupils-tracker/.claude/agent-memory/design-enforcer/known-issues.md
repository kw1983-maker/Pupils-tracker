---
name: known-issues
description: Recurring spec-vs-build drift and doc inconsistencies in the Soft Stationery system
metadata:
  type: project
---

Status as of 2026-06-05 follow-up verification review. Verify before re-flagging — code may have changed.

**RESOLVED (verified 2026-06-05 follow-up):**
- `--radius-full`, `--radius-2xl: 1rem`, `--text-5xl--line-height: 1` now present in globals.css `@theme`. Motion durations moved into `@theme` in both globals.css and tokens.css.
- `docs/design/references/1.png.jpg` now exists; README links it (README.md:7). `控件` CJK artifacts removed from style-guide.md. design-tokens.md radius table has a `2xl` row (design-tokens.md:142).
- layout.tsx Fraunces now uses `axes: ["opsz"]` (weight omitted); Nunito keeps explicit weights; no Inter.
- Tabs.tsx (components/ui/Tabs.tsx): full a11y — `id`+`aria-controls`+`aria-selected`, roving tabindex (active 0 / others -1), Arrow/Home/End key handling, `motion` `layoutId="tab-underline"` underline, v4 `duration-(--duration-fast)` syntax. Panel wrapper in page.tsx has `role="tabpanel"`+`aria-labelledby`.
- Field.tsx (components/ui/Field.tsx) exists: exports `fieldClassName` + `Field`. HomeworkTracker/Behavior/Attendance/Students all reference it; no hardcoded input class strings remain.
- motion.tsx (components/ui/motion.tsx) exists: `Stagger`/`StaggerItem`/`PanelSwap`, reduced-motion aware. Dashboard uses Stagger grids; page.tsx uses PanelSwap.

**Remaining known drift / notes:**
- globals.css `@theme` omits the explicit type-scale tokens (`--text-xs` … `--text-5xl`) that tokens.css defines; it only carries `--text-2xs`, `--text-2xs--line-height`, `--text-5xl--line-height`. Tailwind v4 supplies matching defaults for xs–5xl so utilities still resolve, but this is real drift from the "globals mirrors tokens.css" rule. Minor.
- `--radius-2xl: 1rem` duplicates Tailwind v4's built-in default value; harmless but redundant. The `lg`/`2xl` both = 16px overlap is intentional per design-tokens.md note.
- StatCard/EmptyState use `rounded-2xl`; matches spec.
- Analytics.tsx uses `var(--color-*)` strings for recharts fills/strokes — allowed exception (recharts can't take Tailwind classes).
