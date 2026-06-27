# Style Guide — "Soft Stationery"

The feeling of good classroom stationery: warm paper, rounded edges, and the pop
of a highlighter. Calm and friendly so a busy teacher feels at ease, but precise
and legible so dense registers and tables never feel like clutter.

---

## 1. Design principles

1. **Paper, not chrome.** Surfaces look like soft card stock floating on a warm
   canvas. Depth comes from gentle layered shadows, never hard borders or glassy gradients.
2. **Highlighters carry meaning.** Color is rationed. Most of the UI is paper +
   ink + one teal brand. Saturated color appears almost exclusively as
   *highlighter tags* that encode a subject or a status — like marking up a planner.
3. **Rounded and tactile.** Everything has generous radii. Corners are friendly,
   hit targets are large, nothing is sharp.
4. **Refined, not childish.** Fraunces' soft serif and restrained spacing keep it
   grown-up. We avoid balloon fonts, rainbow gradients, and emoji-as-UI.
5. **Calm density.** Data-heavy views (homework grid, rosters) stay readable
   through whitespace rhythm and quiet hairlines, not by shrinking type below 12px.

---

## 2. Typography

Two families, loaded via `next/font/google`.

### Fraunces — display & numerals
Soft, characterful transitional serif with optical sizing. Used for page/section
titles, big stat numbers, and donut center values. It gives the warmth and the
"editorial planner" character that makes the product memorable.

- Weights: 400, 500, 600, 700
- `font-optical-sizing: auto` (let large sizes open up)
- Use for: `h1`–`h3`, KPI numerals, donut labels, empty-state headlines.

### Nunito — UI & body
Rounded humanist sans whose soft terminals echo the card language while staying
crisp at small sizes — essential for the homework grid and rosters.

- Weights: 400 (body), 600 (medium/labels), 700 (semibold), 800 (strong)
- Use for: body, table cells, buttons, inputs, chips, nav, micro-labels.

### Scale & usage

| Token | Size | Family / weight | Where |
|---|---|---|---|
| `text-5xl` | 48px | Fraunces 600 | Hero stat numerals |
| `text-3xl` | 30px | Fraunces 600 | Page / section hero titles |
| `text-2xl` | 24px | Fraunces 600 | Card stat values, profile name |
| `text-xl` | 20px | Fraunces 500 | Card titles |
| `text-base`| 16px | Nunito 600 | Sub-headers |
| `text-sm` | 14px | Nunito 400/600 | **Default UI / table body** |
| `text-xs` | 12px | Nunito 600 | Secondary, chips |
| `text-2xs`| 10px | Nunito 700 | Eyebrow labels (uppercase, `tracking-wider`) |

**Eyebrow label pattern** (used on every card/stat):
`text-2xs font-bold uppercase tracking-wider text-paper-400`.

**Numerals.** Big numbers use Fraunces. In tables/charts where columns must align,
add `tabular-nums` (`font-variant-numeric: tabular-nums`).

---

## 3. Color

A three-layer model: **canvas → surface → ink**, plus **brand** and **highlighters**.

### Brand — sage-teal
`brand-500 #4c9e8f` is the single brand color: primary buttons, active nav, focus
rings, donut arcs, links. `brand-600 #3a7d70` for hover/pressed and for brand text
on light. Tints `brand-50/100` for soft fills (active tab background, badges).

### Neutrals — warm paper
Never use pure cool grays. The canvas is `paper-50`, cards are `surface` (white),
borders are `paper-200`, text steps down `paper-800 → 500 → 400`.

| Role | Token |
|---|---|
| App canvas | `paper-50` |
| Card / sheet | `surface` (#fff) |
| Hairline border | `paper-200` |
| Primary text | `paper-800` |
| Secondary text | `paper-500` |
| Muted / placeholder / icon | `paper-400` |

### Highlighters — the signature accents
Six markers, each a **fill** + an **ink** for the text on it. Use for subject tags,
agenda blocks, sticky reminders, and category encoding. **Never** use a highlighter
fill as a large background or as button color — it's a marker, not a surface.

| Marker | Fill | Ink | Typical meaning |
|---|---|---|---|
| Pink | `mark-pink` | `mark-pink-ink` | Language / English |
| Amber | `mark-amber` | `mark-amber-ink` | Maths |
| Green | `mark-green` | `mark-green-ink` | Science / present |
| Blue | `mark-blue` | `mark-blue-ink` | History / info |
| Purple | `mark-purple`| `mark-purple-ink`| Music / arts |
| Orange | `mark-orange`| `mark-orange-ink`| Field trips / events |

### Status semantics
Status is its own scale (don't overload highlighters for state logic):

| State | Fill / Solid | On |
|---|---|---|
| Present / positive / on-track | `success` / `success-bg` | attendance present, behavior + |
| Late / warning / at-risk | `warning` / `warning-bg` | late, low completion |
| Absent / negative / error | `danger` / `danger-bg` | absent, behavior − |
| Informational | `info` / `info-bg` | neutral notices |

### Contrast
Body text (`paper-800` on `surface`) and brand text (`brand-700` on `surface`) meet
WCAG AA. Highlighter inks are tuned to pass AA on their own fills. Never place
`paper-400` on `paper-50` for anything readable — labels only.

---

## 4. Space & layout

- **4px base grid.** Use Tailwind steps (`gap-2`, `p-4`…). Default rhythm:
  card padding `p-5` (20px), grid gaps `gap-4` (16px), page padding `p-8` (32px).
- **Layout shell.** Left sidebar nav (`w-60`, static on `lg+`, slide-in drawer
  below `lg`) + right column = sticky top app bar (h-16) → content region on
  `paper-50`. Content max-width is fluid; cards do the chunking.
- **Card grids.** Dashboard uses a 12-col mental model expressed as responsive
  `grid-cols-1 → sm:grid-cols-2 → lg:grid-cols-4` for stat rows and
  `lg:grid-cols-3` for content rows; cards may span (`lg:col-span-2`).
- **Dense tables** (homework grid): fixed first column (220px), fluid assignment
  columns `minmax(120px,1fr)`, trailing score column. Sticky header, hairline
  `paper-100` dividers, hover row tint `paper-50`.
- **Breakpoints** follow Tailwind defaults (`sm` 640, `md` 768, `lg` 1024,
  `xl` 1280). Sidebar/controls collapse above/below `lg`.

---

## 5. Shape & elevation

- **Radii:** cards `rounded-card` (20px), buttons/rows `rounded-md` (12px), inputs
  `rounded-sm` (8px), pills/avatars/donuts `rounded-full`, hero/sidebar `rounded-xl` (28px).
- **Elevation = "paper float".** Four soft, low-opacity, downward shadows tinted
  with the ink color (not black):

  | Token | Use |
  |---|---|
  | `shadow-paper` | chips, inputs at rest |
  | `shadow-soft` | nested panels, popovers |
  | `shadow-float` | **default card** |
  | `shadow-lift` | card hover / dragging |

- **Borders** are optional hairlines (`border-paper-200`) used only to separate
  same-elevation regions (table dividers, list rows). Cards rely on shadow, not borders.
- **Focus** is always `shadow-ring` (3px teal glow), never a default browser outline.

---

## 6. Iconography

- **lucide-react**, 1.75–2px stroke, sized to text (`h-4 w-4` inline, `h-5 w-5`
  controls, `h-6 w-6` stat badges). Color inherits (`currentColor`).
- Stat-card icons sit in a `rounded-2xl` tinted tile (`bg-brand-100 text-brand-700`,
  or the matching status tint).
- Keep icons functional and consistent; don't mix icon sets or use filled emoji as UI.

---

## 7. Motion

Gentle and physical — paper settling, a highlighter being drawn. Use the **motion**
library in React; respect `prefers-reduced-motion` (disable transforms, keep opacity).

| Pattern | Spec |
|---|---|
| **Page/card entrance** | fade + 8px rise, staggered `60ms`, `--ease-out-paper`, `--duration-slow` |
| **Card hover** | `translateY(-2px)` + `shadow-float → shadow-lift`, `--duration-base` |
| **Donut / progress** | stroke-dashoffset draw-in over `--duration-draw` (600ms) |
| **Tab switch** | content cross-fade `--duration-base`; active underline slides |
| **Press** | `scale(0.98)`, `--duration-fast` |
| **Spring (motion)** | `{ type: "spring", stiffness: 260, damping: 24 }` |

Durations/easings live as tokens (`--duration-*`, `--ease-*`). Don't animate
layout-shifting properties on large lists; prefer `transform`/`opacity`.

---

## 8. Voice & content

- **Warm, plain, teacher-to-teacher.** "Mark all present", "Everyone is on track 🎉",
  "Needs attention". No corporate jargon, no exclamation overload.
- **Sentence case** for titles and buttons; **UPPERCASE only** for the tiny eyebrow labels.
- **Numbers first** in stats; qualify underneath (`88%` / "22/25 present").
- One celebratory emoji is allowed in empty/success states; never inside controls.

---

## 9. Accessibility baseline

- Color is never the *only* signal: attendance/behavior pair color **with an icon
  and a text label** (Present/Late/Absent).
- All interactive elements are real `<button>`/`<a>`/form controls, keyboard
  reachable, with visible `shadow-ring` focus.
- Hit targets ≥ 36px; table checkboxes get padded clickable cells.
- Charts (recharts) include tooltips and legends; don't rely on hue alone — order
  and labels carry meaning too.
- Maintain AA contrast (see §3). Honor `prefers-reduced-motion`.

---

## 10. Do / Don't

**Do**
- Let paper + ink + teal dominate; treat highlighters as rare, meaningful pops.
- Use Fraunces for the numbers people care about.
- Lean on shadow and radius for hierarchy.

**Don't**
- ❌ Rainbow gradients, purple-on-white, or glassmorphism.
- ❌ Highlighter fills as page/section backgrounds or button colors.
- ❌ Pure-black text/shadows or cool gray neutrals.
- ❌ Inter/Roboto/system fonts, or balloon "kiddie" display faces.
- ❌ Type below 12px for anything a teacher must read.
