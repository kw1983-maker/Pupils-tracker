# ClassTrack Pro — Design System

**"Soft Stationery"** — a warm, tactile classroom aesthetic: craft-paper surfaces,
a calm sage-teal brand, and highlighter-marker pastel accents. Friendly and
approachable for teachers, but refined and data-dense enough for daily admin work.

> Derived from the reference in [`./references/1.png.jpg`](./references/1.png.jpg)
> (drop additional references into `docs/design/references/`) and reconciled with the live app.

## The system at a glance

| Pillar | Decision |
|---|---|
| **Concept** | Soft Stationery — paper, highlighters, rounded craft shapes |
| **Brand** | Sage-teal `#4c9e8f` (`brand-500`) on warm paper `#f3f6f4` (`paper-50`) |
| **Signature** | Highlighter-marker accent tags (6 markers) for subjects & status |
| **Display / numbers** | **Fraunces** — soft, characterful serif (optical sizing) |
| **UI / body** | **Nunito** — rounded humanist sans, legible at 12–14px |
| **Shape** | Generous radii (20px cards, full pills), layered "paper float" shadows |
| **Motion** | Gentle, springy; staggered card reveals; donut draw-in |

## Files

| File | What it is |
|---|---|
| [`style-guide.md`](./style-guide.md) | The aesthetic — voice, color, type, space, elevation, motion, do/don't |
| [`design-tokens.md`](./design-tokens.md) | Token reference tables + how to wire them into the stack |
| [`tokens.css`](./tokens.css) | **Importable** Tailwind v4 `@theme` block — the source of truth in code |
| [`components.md`](./components.md) | Component specs (anatomy, variants, states, a11y, code) for the stack |

## Tech stack this maps to

- **Next.js 16** (App Router) · **React 19**
- **Tailwind CSS v4** — tokens are expressed as `@theme` and generate utilities
- **lucide-react** (icons) · **motion** (animation) · **recharts** (charts)
- Fonts via **`next/font/google`** (Fraunces + Nunito)

## How to adopt (3 steps)

1. **Fonts** — load Fraunces + Nunito in `app/layout.tsx` (see `design-tokens.md`).
2. **Tokens** — in `app/globals.css`, after `@import "tailwindcss";`, paste/import
   the `@theme` block from [`tokens.css`](./tokens.css).
3. **Components** — build/refactor against [`components.md`]; use semantic utilities
   (`bg-surface`, `text-paper-500`, `rounded-card`, `shadow-float`) instead of raw
   slate/teal Tailwind classes.

### Migration note (current code → system)

The app today uses Inter + ad-hoc `slate-*`/`teal-*` classes and a `.card-soft`
helper. Mapping:

| Today | Use instead |
|---|---|
| `Inter` | `Fraunces` (headings/numbers) + `Nunito` (UI) |
| `bg-slate-50` (page) | `bg-paper-50` |
| `text-slate-800` / `-500` / `-400` | `text-paper-800` / `-500` / `-400` |
| `bg-teal-100 / text-brand-dark` | `bg-brand-100 / text-brand-700` |
| `.card-soft` | `bg-surface rounded-card shadow-float` |
| sticky-note / agenda colors | the 6 **highlighter** tokens (`mark-*`) |
