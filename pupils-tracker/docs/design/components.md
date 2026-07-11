# Component Specs

Specs for the component library, mapped to the actual stack (React 19 + Tailwind v4
+ lucide-react + motion). Each entry: **purpose · anatomy · variants · states ·
tokens · a11y · code**. File paths point at where each lives (or should live) under
`components/`. All snippets assume the tokens from [`tokens.css`](./tokens.css).

Shared primitive — the **card** surface:
`bg-surface rounded-card shadow-float` (define once as `.card` in globals, §design-tokens).

---

## 1. AppBar — `app/page.tsx` (Shell header)

- **Purpose:** persistent top bar: brand, class summary, primary action (Export).
- **Anatomy:** logo tile (`rounded-xl bg-brand-500 text-surface`) + wordmark
  (Fraunces) · centered/right summary chips · primary Button.
- **States:** sticky (`z-30`); summary chips hidden `< sm`.
- **Tokens:** `surface` bg, `border-paper-200` bottom hairline, `h-16`.
- **a11y:** `<header>` landmark; wordmark is an `<h1>`.

```tsx
<header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-paper-200 bg-surface px-4 sm:px-8">
  <div className="flex items-center gap-3">
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-surface">
      <GraduationCap className="h-5 w-5" />
    </div>
    <h1 className="font-display text-xl font-semibold text-paper-900">
      ClassTrack
    </h1>
  </div>
  {/* …summary chips… */}
  <Button>Export Report</Button>
</header>
```

---

## 2. Sidebar — `components/ui/Sidebar.tsx`

- **Purpose:** top-level section nav, grouped into "Track" and "Teach & tools"
  (Dashboard · Homework · Attendance · Calendar · Students · Analytics · Tutor ·
  Spelling · Resources · Games · Rule Wheel). Replaces the old horizontal `Tabs`.
- **Anatomy:** vertical rail (`w-60`); brand wordmark at top; grouped nav items =
  icon + label; active item gets a filled pill.
- **Responsive:** static rail on `lg+`; below `lg` it becomes a slide-in drawer
  opened by the header hamburger (`Menu`), with a dimmed backdrop and an in-drawer
  close button. Selecting an item or pressing Escape closes the drawer.
- **States:** active / inactive; hover, focus (`shadow-ring`).
- **Tokens:** rail `bg-brand-50/60 border-paper-200`; active pill `bg-brand-100
  text-brand-700` (`rounded-xl`, `font-bold`); inactive `text-paper-500
  hover:bg-brand-100/50 hover:text-paper-700`. Icons sized `h-5 w-5`.
- **a11y:** `role="tablist"` with roving `tabindex` + arrow-key navigation; each
  item `role="tab"` `aria-selected`; drawer traps nothing but closes on Escape.

```tsx
<button
  role="tab" aria-selected={isActive} tabIndex={isActive ? 0 : -1}
  className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold
    outline-none focus-visible:shadow-ring transition-colors
    ${isActive ? "text-brand-700" : "text-paper-500 hover:bg-brand-100/50 hover:text-paper-700"}`}
>
  {isActive && (
    <span className="absolute inset-0 -z-10 rounded-xl bg-brand-100" aria-hidden />
  )}
  {icon}{label}
</button>
```

The app shell (`app/page.tsx`) also provides a **skip-to-main-content** link and a
visually-hidden `<h1>` per active view for screen-reader page identity.

---

## 3. Card / SectionCard — `components/ui/SectionCard.tsx`

- **Purpose:** the universal content container.
- **Anatomy:** optional header (eyebrow/title + action slot) · body · optional footer.
- **Variants:** plain · titled · with `action`; `className` for `col-span`.
- **States:** static; interactive cards (clickable) add hover `shadow-lift -translate-y-0.5`.
- **Tokens:** `.card` surface, padding `p-5`, title = eyebrow label style.
- **a11y:** title via heading; if the whole card is a link/button, wrap in one control.

```tsx
export function SectionCard({ title, action, children, className = "" }: SectionCardProps) {
  return (
    <section className={`card p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between">
          {title && <h2 className="text-2xs font-bold uppercase tracking-wider text-paper-400">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
```

---

## 4. StatCard — `components/ui/StatCard.tsx`

- **Purpose:** one KPI: icon tile + eyebrow label + big value (+ sub).
- **Anatomy:** `rounded-2xl` tinted icon tile · label · **Fraunces** value · sub line.
- **Variants:** `tone` = `brand | success | warning | danger | info` (drives tile tint).
- **Tokens:** tile `bg-{tone}-bg text-{tone}-ink` (or `bg-brand-100 text-brand-700`),
  value `font-display text-2xl text-paper-800`, label eyebrow, sub `text-xs text-paper-400`.
- **a11y:** value + label read together; icon `aria-hidden`.

```tsx
<div className="card flex items-center gap-4 p-5">
  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
    {icon}
  </div>
  <div className="min-w-0">
    <p className="text-2xs font-bold uppercase tracking-wider text-paper-400">{label}</p>
    <p className="font-display text-2xl font-semibold tabular-nums text-paper-800">{value}</p>
    {sub && <p className="text-xs text-paper-400">{sub}</p>}
  </div>
</div>
```

---

## 5. Donut — `components/ui/Donut.tsx`

- **Purpose:** single-value radial progress (completion, attendance).
- **Anatomy:** SVG track + arc (`stroke-linecap="round"`), centered Fraunces value + sub.
- **Variants:** `color` (brand default; `info` for attendance), `size`, `stroke`.
- **States:** animated draw on mount via `stroke-dashoffset` over `--duration-draw`.
- **Tokens:** track `brand-200`/`paper-200`, arc `brand-500`/`info`, label `font-display`.
- **a11y:** wrap with `role="img"` `aria-label="{pct}% complete"`.

```tsx
<circle ... stroke="var(--color-brand-200)" />
<circle ... stroke={color} strokeLinecap="round"
  strokeDasharray={C} strokeDashoffset={C - (pct/100)*C}
  style={{ transition: "stroke-dashoffset var(--duration-draw) var(--ease-out-paper)" }} />
<span className="font-display text-xl font-semibold text-paper-800">{pct}%</span>
```

---

## 6. Button — `components/ui/Button.tsx` (new)

- **Purpose:** actions. **Variants:** `primary` (brand fill), `secondary` (surface +
  hairline), `ghost` (text only), `danger` (rose). **Sizes:** `sm` / `md`.
- **States:** hover (darken / tint), `active:scale-[.98]`, focus `shadow-ring`,
  `disabled:opacity-40`. **Tokens:** radius `rounded-md`, font `text-sm font-semibold`.
- **a11y:** real `<button>`; icon-only buttons need `aria-label`.

```tsx
const styles = {
  primary:   "bg-brand-500 text-surface hover:bg-brand-600",
  secondary: "bg-surface text-paper-700 border border-paper-200 hover:border-brand-400",
  ghost:     "text-paper-600 hover:bg-paper-100",
  danger:    "bg-danger text-surface hover:brightness-95",
};
<button className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold
  outline-none transition active:scale-[.98] focus-visible:shadow-ring
  disabled:opacity-40 ${styles[variant]}`} />
```

---

## 7. HighlighterTag — `components/ui/HighlighterTag.tsx` (new · **signature**)

- **Purpose:** subject/category marker (agenda blocks, sticky reminders, subject chips).
- **Anatomy:** rounded fill with matching ink; optional left dot or icon.
- **Variants:** `marker` = `pink | amber | green | blue | purple | orange`.
- **Optional flourish:** a faux highlighter sweep — slightly skewed, semi-transparent
  fill behind text (`-skew-x-3`), echoing a real marker stroke.
- **Tokens:** `bg-mark-{m} text-mark-{m}-ink`, `rounded-sm px-2 py-0.5 text-xs font-bold`.
- **a11y:** category text is in the tag; don't encode meaning by color alone.

```tsx
const map = {
  pink:"bg-mark-pink text-mark-pink-ink", amber:"bg-mark-amber text-mark-amber-ink",
  green:"bg-mark-green text-mark-green-ink", blue:"bg-mark-blue text-mark-blue-ink",
  purple:"bg-mark-purple text-mark-purple-ink", orange:"bg-mark-orange text-mark-orange-ink",
};
<span className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-bold ${map[marker]}`}>
  {children}
</span>
```

---

## 8. StatusPill — `components/ui/StatusPill.tsx` (new)

- **Purpose:** attendance (Present/Late/Absent) & behavior (+/−) state. **Color +
  icon + label**, never color alone.
- **Variants:** `success | warning | danger | info | neutral`.
- **Tokens:** `bg-{status}-bg text-{status}-ink` (neutral = `bg-paper-100 text-paper-600`),
  `rounded-full px-2.5 py-1 text-xs font-semibold`.
- **a11y:** label text present; icon `aria-hidden`.

```tsx
<span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-1 text-xs font-semibold text-success">
  <CheckCircle2 className="h-4 w-4" aria-hidden /> Present
</span>
```

---

## 9. Field (Input / Select / Textarea) — `components/ui/Field.tsx` (new)

- **Anatomy:** optional eyebrow label + control (+ help/error).
- **States:** rest (`border-paper-200`), focus (`focus:shadow-ring border-brand-400`),
  error (`border-danger`), disabled (`bg-paper-50 text-paper-400`).
- **Tokens:** `rounded-sm p-2 text-sm`, label = eyebrow style.
- **a11y:** `<label htmlFor>`; errors via `aria-describedby`; `date`/`select` native.

```tsx
<label className="mb-1 block text-2xs font-bold uppercase tracking-wider text-paper-400">{label}</label>
<input className="w-full rounded-sm border border-paper-200 p-2 text-sm outline-none
  focus:border-brand-400 focus:shadow-ring placeholder:text-paper-400" />
```

---

## 10. ListRow — roster / activity item (`Students`, `Attendance`, `Behavior`)

- **Purpose:** repeating selectable/info row (pupil, behavior entry).
- **Anatomy:** Avatar/dot · primary text + meta · trailing (StatusPill / chevron / action).
- **Variants:** static · button (whole row clickable) · with hover-reveal action.
- **States:** hover `border-brand-400` (button rows) or `bg-paper-50` (table rows);
  trailing delete reveals on `group-hover` with `focus-visible:opacity-100`.
- **Tokens:** `rounded-md border border-paper-100 p-3`.
- **a11y:** clickable rows are `<button>`; hover-only actions must also be focus-reachable.

```tsx
<button className="group flex w-full items-center justify-between rounded-md border border-paper-100 bg-surface p-3 text-left transition-colors hover:border-brand-400 focus-visible:shadow-ring">
  <span className="flex items-center gap-3"><Avatar name={p.name} /><span className="truncate text-sm font-semibold text-paper-700">{p.name}</span></span>
  <ChevronRight className="h-5 w-5 text-paper-300" />
</button>
```

---

## 11. Avatar — initial bubble (new)

- **Purpose:** pupil identity where no photo exists. **Anatomy:** `rounded-full`
  tinted circle with first initial in Fraunces.
- **Tokens:** `bg-brand-100 text-brand-700 font-display font-bold`; sizes
  `h-10 w-10 text-sm` (list) / `h-16 w-16 text-2xl` (profile).
- **a11y:** decorative when name is adjacent (`aria-hidden`), else `aria-label={name}`.

---

## 12. DataGrid — homework matrix (`components/pages/HomeworkTracker.tsx`)

- **Purpose:** dense pupils × assignments completion grid.
- **Anatomy:** CSS grid `gridTemplateColumns: 220px repeat(n, minmax(120px,1fr)) 90px`;
  sticky header row; first column sticky-ish; trailing score column.
- **Cells:** checkbox cell = padded `<button>`; checked = `bg-brand-500 border-brand-500`
  with `Check` icon; unchecked = `border-paper-300 bg-surface`. Checked column tint `bg-brand-50/40`.
- **Header:** assignment = highlighter date eyebrow + title + Check-all / delete controls.
- **States:** row hover `bg-paper-50`; per-row delete reveals on `group-hover`.
- **Tokens:** dividers `divide-paper-100`, header `bg-paper-50/90 backdrop-blur z-30`.
- **a11y:** checkbox cells are `<button role="checkbox" aria-checked>` with
  `aria-label="{pupil} — {assignment}"`; container `thin-scroll`, horizontally scrollable.

```tsx
<div className="grid hover:bg-paper-50" style={gridStyle}>
  <div className="flex items-center gap-3 border-r border-paper-100 p-4 text-sm font-medium">…</div>
  <button role="checkbox" aria-checked={done} aria-label={`${pupil.name} — ${a.title}`}
    className={`flex items-center justify-center border-r border-paper-100 p-4 ${done ? "bg-brand-50/40" : "hover:bg-paper-100/60"}`}>
    <span className={`flex h-5 w-5 items-center justify-center rounded-[6px] border ${done ? "border-brand-500 bg-brand-500" : "border-paper-300 bg-surface"}`}>
      {done && <Check className="h-3.5 w-3.5 text-surface" strokeWidth={3} />}
    </span>
  </button>
</div>
```

---

## 13. EmptyState — inline (new helper)

- **Purpose:** friendly zero-data message inside cards.
- **Anatomy:** soft icon, Fraunces headline, one-line guidance, optional Button.
- **Tokens:** centered, `text-paper-400`; headline `font-display text-lg text-paper-600`.
- **Voice:** warm ("No pupils yet — add a namelist to get started"). One emoji max.

---

## 14. Chart — recharts wrapper (`components/pages/Analytics.tsx`)

- **Purpose:** trends (homework bar, attendance line, behavior diverging bars).
- **Anatomy:** `ResponsiveContainer` inside a SectionCard.
- **Tokens (from `design-tokens.md §9`):** grid `paper-100`, ticks `paper-500` 11px,
  series = brand / info / success / danger; bar radius `[6,6,0,0]`; line stroke `3`.
- **Behavior bars:** per-bar `<Cell>` `success` (≥0) / `danger` (<0).
- **a11y:** include `<Tooltip>` + `<Legend>`; don't rely on hue alone — keep labels/order meaningful.

```tsx
<Bar dataKey="pct" fill="var(--color-brand-500)" radius={[6,6,0,0]} />
<Line dataKey="present" stroke="var(--color-info)" strokeWidth={3} dot={{ r: 3 }} />
```

---

## Component → file map

| Component | Path | Status |
|---|---|---|
| AppBar | `app/page.tsx` (Shell) | ✅ tokenized; sticky; hamburger `< lg` |
| Sidebar | `components/ui/Sidebar.tsx` | ✅ grouped nav, roving keys, drawer `< lg` (replaces `Tabs`) |
| SectionCard | `components/ui/SectionCard.tsx` | ✅ `.card` + eyebrow |
| StatCard | `components/ui/StatCard.tsx` | ✅ tones + Fraunces value |
| Modal | `components/ui/Modal.tsx` | ✅ dialog semantics, focus trap, Escape/backdrop |
| ConfirmDialog | `components/ui/ConfirmDialog.tsx` | ✅ promise-based `useConfirm()` (replaces `window.confirm`) |
| SegmentedControl | `components/ui/SegmentedControl.tsx` | ✅ pill toggle (Tutor Speak/Type, image provider) |
| Donut | `components/ui/Donut.tsx` | ✅ token colors + draw-in |
| Button | `components/ui/Button.tsx` | ✅ built |
| HighlighterTag | `components/ui/HighlighterTag.tsx` | ✅ built (signature; `markerFor()`) |
| StatusPill | `components/ui/StatusPill.tsx` | ✅ built |
| Field | `components/ui/Field.tsx` | ✅ built — `fieldClassName` + `Field` wrapper |
| Avatar | `components/ui/Avatar.tsx` | ✅ built |
| Motion | `components/ui/motion.tsx` | ✅ `Stagger`/`StaggerItem`/`PanelSwap` (reduced-motion aware) |
| EmptyState | `components/ui/EmptyState.tsx` | ✅ built |
| ListRow | inline patterns | documented → optionally extract |
| DataGrid | `components/pages/HomeworkTracker.tsx` | ✅ tokens + checkbox a11y |
| Chart | `components/pages/Analytics.tsx` | ✅ token-themed |
