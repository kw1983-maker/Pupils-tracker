# Design Tokens

The source of truth in code is [`tokens.css`](./tokens.css) — a Tailwind v4
`@theme` block. Every token there generates utilities automatically
(`--color-brand-500` → `bg-brand-500`, `--radius-card` → `rounded-card`,
`--shadow-float` → `shadow-float`, `--font-display` → `font-display`).

This page is the human-readable reference + wiring instructions.

---

## 1. Wiring into the stack

### Step 1 — Fonts (`app/layout.tsx`)

```tsx
import { Fraunces, Nunito } from "next/font/google";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  axes: ["opsz"],          // optical sizing
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${nunito.variable} h-full antialiased`}>
      <body className="min-h-full bg-paper-50 text-paper-800 font-sans">{children}</body>
    </html>
  );
}
```

### Step 2 — Tokens (`app/globals.css`)

```css
@import "tailwindcss";

/* Option A: import the file */
@import "../docs/design/tokens.css";

/* Option B: paste the @theme { … } block from tokens.css directly here */

/* Project helpers that aren't utilities */
@layer components {
  .card { @apply bg-surface rounded-card shadow-float; }
}
```

`--font-display`/`--font-sans` in `tokens.css` already point at the
`--font-fraunces`/`--font-nunito` variables defined in Step 1.

---

## 2. Color tokens

### Brand — sage-teal
| Token | Hex | Use |
|---|---|---|
| `brand-50` | `#f0f9f6` | faint wash |
| `brand-100` | `#d9efe9` | active tab / badge fill |
| `brand-200` | `#b4ded3` | donut track, borders |
| `brand-300` | `#84c6b6` | |
| `brand-400` | `#57ab98` | |
| **`brand-500`** | **`#4c9e8f`** | **primary** (buttons, active, arcs, links) |
| `brand-600` | `#3a7d70` | hover / pressed |
| `brand-700` | `#30655b` | brand text on light |
| `brand-800` | `#284f48` | |
| `brand-900` | `#1f3d38` | |

### Paper — warm neutrals
| Token | Hex | Role |
|---|---|---|
| `paper-50` | `#f3f6f4` | app canvas |
| `surface` | `#ffffff` | card / sheet |
| `paper-100` | `#e9eeec` | subtle dividers |
| `paper-200` | `#dbe2df` | hairline borders |
| `paper-300` | `#c3ccc8` | disabled border |
| `paper-400` | `#9aa6a1` | muted / placeholder / eyebrow |
| `paper-500` | `#6f7c77` | secondary text |
| `paper-600` | `#54605b` | |
| `paper-700` | `#3e4844` | |
| `paper-800` | `#2c3531` | primary text |
| `paper-900` | `#1d2421` | max-emphasis text |

### Highlighters (fill + ink)
| Token (fill / ink) | Fill | Ink |
|---|---|---|
| `mark-pink` / `mark-pink-ink` | `#fbd0dd` | `#9d2449` |
| `mark-amber` / `mark-amber-ink` | `#fde7a6` | `#92600a` |
| `mark-green` / `mark-green-ink` | `#c4eccd` | `#1f7a3d` |
| `mark-blue` / `mark-blue-ink` | `#cfe1fb` | `#1e4e8c` |
| `mark-purple` / `mark-purple-ink` | `#ddd6fe` | `#5b3fb0` |
| `mark-orange` / `mark-orange-ink` | `#fdd9b5` | `#9a4f12` |

Usage: `class="bg-mark-amber text-mark-amber-ink"`.

### Status
| Token | Solid | Bg fill |
|---|---|---|
| Success | `success` `#2faa5f` | `success-bg` `#d9f3e1` |
| Warning | `warning` `#d99a14` | `warning-bg` `#fdecc8` |
| Danger | `danger` `#e5484d` | `danger-bg` `#fbd8da` |
| Info | `info` `#2f7bd6` | `info-bg` `#d6e7fb` |

---

## 3. Typography tokens

| Token | px | Line height | Default family/weight |
|---|---|---|---|
| `text-2xs` | 10 | 14 | Nunito 700 |
| `text-xs` | 12 | 16 | Nunito 600 |
| `text-sm` | 14 | 20 | Nunito 400 |
| `text-base` | 16 | 24 | Nunito 600 |
| `text-lg` | 18 | 28 | Fraunces 500 |
| `text-xl` | 20 | 28 | Fraunces 500 |
| `text-2xl` | 24 | 32 | Fraunces 600 |
| `text-3xl` | 30 | 36 | Fraunces 600 |
| `text-4xl` | 36 | 40 | Fraunces 600 |
| `text-5xl` | 48 | 1 | Fraunces 600 |

Families: `font-display` (Fraunces), `font-sans` (Nunito), `font-mono` (fallback stack).
Add `tabular-nums` on aligned numeric columns.

---

## 4. Radius tokens
| Token | Value | Use |
|---|---|---|
| `rounded-sm` | 8px | inputs, small chips |
| `rounded-md` | 12px | buttons, list rows |
| `rounded-lg` | 16px | inner panels |
| `rounded-card` | 20px | **default card** |
| `rounded-2xl` | 16px | icon tiles (StatCard / EmptyState) |
| `rounded-xl` | 28px | hero / sidebar pill |
| `rounded-full` | ∞ | pills, avatars, donuts |

> `lg` and `2xl` share 16px on purpose: `lg` is for inner panels, `2xl` is the
> semantic radius for small square icon tiles. `xl` (28px) is the largest — hero /
> sidebar shapes. (Naming follows Tailwind's scale, so `xl` > `2xl` here.)

## 5. Elevation tokens
| Token | Value |
|---|---|
| `shadow-paper` | `0 1px 2px rgba(31,61,56,.06)` |
| `shadow-soft` | `0 2px 8px -2px rgba(31,61,56,.10)` |
| `shadow-float` | `0 10px 30px -12px rgba(31,61,56,.18)` |
| `shadow-lift` | `0 20px 45px -18px rgba(31,61,56,.22)` |
| `shadow-ring` | `0 0 0 3px rgba(76,158,143,.35)` (focus) |

## 6. Spacing & layout
- Base unit **4px** (Tailwind scale). Conventions: card `p-5`, grid `gap-4`, page `p-8`.
- Breakpoints: Tailwind defaults — `sm`640 · `md`768 · `lg`1024 · `xl`1280.
- App bar height `h-16` (64px).

## 7. Motion tokens
| Token | Value | Use |
|---|---|---|
| `--duration-fast` | 120ms | press, hover color |
| `--duration-base` | 200ms | hover lift, tab fade |
| `--duration-slow` | 320ms | entrance |
| `--duration-draw` | 600ms | donut / progress draw |
| `ease-soft` | `cubic-bezier(.2,.8,.2,1)` | general |
| `ease-out-paper` | `cubic-bezier(.16,1,.3,1)` | entrances |

Reference in classes via Tailwind: `ease-soft duration-[--duration-base]`, or in
`motion` springs: `{ type: "spring", stiffness: 260, damping: 24 }`.

## 8. Z-index scale (convention)
| Layer | z |
|---|---|
| Base content | 0 |
| Sticky app bar / table header | 30 |
| Dropdown / popover | 40 |
| Modal / sheet | 50 |
| Toast | 60 |

---

## 9. recharts theming

Pass these so charts read as part of the system:

```ts
export const chart = {
  grid: "#e9eeec",          // paper-100
  axisTick: { fontSize: 11, fill: "#6f7c77" }, // paper-500, Nunito inherited
  series: {
    brand: "#4c9e8f",       // homework / primary
    info: "#2f7bd6",        // attendance line
    success: "#2faa5f",     // positive bars
    danger: "#e5484d",      // negative bars
  },
  barRadius: [6, 6, 0, 0] as [number, number, number, number],
};
```

Line stroke width `3`, dots `r:3`; bars use `barRadius`; tooltips inherit body font.
