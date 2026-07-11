"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  CalendarDays,
} from "lucide-react";
import { useTracker, todayISO } from "@/lib/store";
import { CalendarEvent } from "@/lib/types";
import { EVENT_TYPES, CUSTOM_EVENT } from "@/lib/event-types";
import { formatDMY } from "@/lib/format";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { fieldClassName, Field } from "@/components/ui/Field";

// Sunday-first week, single-letter headers (matches the reference widget).
const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const pad = (n: number) => String(n).padStart(2, "0");
// Build a YYYY-MM-DD string from local parts (month is 0-indexed) without the
// UTC shift that `Date.toISOString()` would introduce.
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

// Human-readable label for a YYYY-MM-DD date (e.g. "Monday, 08-06-2026").
function formatDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DAY_NAMES[dt.getDay()]}, ${formatDMY(date)}`;
}

export function Calendar() {
  const { calendarEvents, addCalendarEvent, updateCalendarEvent, removeCalendarEvent } =
    useTracker();

  const today = todayISO();
  const [ty, tm] = [Number(today.split("-")[0]), Number(today.split("-")[1]) - 1];

  // Which month the grid is showing, and which day is selected.
  const [viewYear, setViewYear] = useState(ty);
  const [viewMonth, setViewMonth] = useState(tm);
  const [selected, setSelected] = useState(today);

  // Add / edit form state. `eventType` is the dropdown choice (a preset or the
  // "Custom…" sentinel); `title` holds the manual text used only when custom.
  const [eventType, setEventType] = useState<string>(EVENT_TYPES[0]);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const isCustom = eventType === CUSTOM_EVENT;

  // Group events by date for fast lookup while rendering the grid.
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of calendarEvents) {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [calendarEvents]);

  // A fixed 6-week (42-cell) grid starting on the Sunday on/before the 1st, so
  // adjacent-month days fill the leading/trailing slots (shown faded).
  const cells = useMemo(() => {
    const startOffset = new Date(viewYear, viewMonth, 1).getDay(); // Sun=0
    const arr: { date: string; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const dt = new Date(viewYear, viewMonth, 1 - startOffset + i);
      arr.push({
        date: iso(dt.getFullYear(), dt.getMonth(), dt.getDate()),
        inMonth: dt.getMonth() === viewMonth,
      });
    }
    return arr;
  }, [viewYear, viewMonth]);

  // Chunk the 42 cells into 6 weeks (rows of 7) for the grid layout.
  const weeks = useMemo(() => {
    const rows: { date: string; inMonth: boolean }[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [cells]);

  const selectedEvents = (eventsByDate.get(selected) ?? [])
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title));

  const goPrev = () => {
    const m = viewMonth - 1;
    if (m < 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth(m);
  };
  const goNext = () => {
    const m = viewMonth + 1;
    if (m > 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth(m);
  };
  const goToday = () => {
    setViewYear(ty);
    setViewMonth(tm);
    setSelected(today);
  };

  // Selecting a day in an adjacent month also brings that month into view.
  const selectDay = (date: string, inMonth: boolean) => {
    setSelected(date);
    if (!inMonth) {
      const [y, m] = date.split("-").map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
    resetForm();
  };

  const resetForm = () => {
    setEventType(EVENT_TYPES[0]);
    setTitle("");
    setNote("");
    setEditingId(null);
  };

  const startEdit = (ev: CalendarEvent) => {
    setEditingId(ev.id);
    // Preset titles map back to the dropdown; anything else is a custom title.
    if ((EVENT_TYPES as readonly string[]).includes(ev.title)) {
      setEventType(ev.title);
      setTitle("");
    } else {
      setEventType(CUSTOM_EVENT);
      setTitle(ev.title);
    }
    setNote(ev.note ?? "");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = isCustom ? title.trim() : eventType;
    if (!finalTitle) return;
    if (editingId) {
      updateCalendarEvent(editingId, { title: finalTitle, note });
    } else {
      addCalendarEvent(selected, finalTitle, note);
    }
    resetForm();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* ── Month grid (minimal widget) ── */}
      <div className="lg:col-span-2">
        <SectionCard>
          <div className="mb-4 flex items-center justify-between">
            <p className="font-display text-xl font-semibold text-paper-800">
              {MONTHS[viewMonth]} {viewYear}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={goToday}>
                Today
              </Button>
              <button
                onClick={goPrev}
                aria-label="Previous month"
                className="rounded-md p-1.5 text-paper-500 outline-none transition-colors hover:bg-paper-100 hover:text-brand-600 focus-visible:shadow-ring"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={goNext}
                aria-label="Next month"
                className="rounded-md p-1.5 text-paper-500 outline-none transition-colors hover:bg-paper-100 hover:text-brand-600 focus-visible:shadow-ring"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-card border border-paper-200">
            {/* Weekday header row */}
            <div className="flex border-b border-paper-200 bg-paper-50">
              {DOW.map((w, i) => (
                <div
                  key={i}
                  className="flex-1 py-2 text-center text-xs font-semibold text-paper-400"
                >
                  {w}
                </div>
              ))}
            </div>

            {/* One flex row per week: cells flow left → right, then wrap. */}
            {weeks.map((week, wi) => (
              <div
                key={wi}
                className={`flex ${wi === weeks.length - 1 ? "" : "border-b border-paper-200"}`}
              >
                {week.map(({ date, inMonth }, di) => {
                  const dayNum = Number(date.split("-")[2]);
                  const dayEvents = eventsByDate.get(date) ?? [];
                  const hasEvents = dayEvents.length > 0;
                  const isToday = date === today;
                  const isSelected = date === selected;
                  return (
                    <button
                      key={date}
                      onClick={() => selectDay(date, inMonth)}
                      aria-label={`${formatDate(date)}${
                        hasEvents ? `, ${dayEvents.length} event(s)` : ""
                      }`}
                      aria-pressed={isSelected}
                      className={`relative flex min-h-16 flex-1 flex-col items-end p-1.5 text-right outline-none transition-colors focus-visible:z-10 focus-visible:shadow-ring ${
                        di === 6 ? "" : "border-r border-paper-200"
                      } ${
                        isSelected
                          ? "bg-brand-50"
                          : inMonth
                          ? "bg-surface hover:bg-paper-50"
                          : "bg-paper-50/60 hover:bg-paper-100"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-sm tabular-nums ${
                          isToday
                            ? "bg-brand-500 font-semibold text-surface"
                            : isSelected
                            ? "font-semibold text-brand-700"
                            : inMonth
                            ? "text-paper-700"
                            : "text-paper-300"
                        }`}
                      >
                        {dayNum}
                      </span>
                      {hasEvents && (
                        <span className="mt-auto w-full truncate text-left text-xs font-medium text-brand-600">
                          {dayEvents.length === 1
                            ? dayEvents[0].title
                            : `${dayEvents.length} events`}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ── Selected-day panel: add / edit / delete events ── */}
      <div className="lg:col-span-1">
        <SectionCard title={formatDate(selected)}>
          <form onSubmit={submit} className="mb-4 space-y-2">
            <Field label="Event" htmlFor="cal-type">
              <select
                id="cal-type"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className={`${fieldClassName} w-full`}
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                <option value={CUSTOM_EVENT}>Custom…</option>
              </select>
            </Field>
            {isCustom && (
              <Field label="Custom event" htmlFor="cal-title">
                <input
                  id="cal-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Parent meeting"
                  className={`${fieldClassName} w-full`}
                />
              </Field>
            )}
            <Field label="Details (optional)" htmlFor="cal-note">
              <input
                id="cal-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. 3pm, staff room"
                className={`${fieldClassName} w-full`}
              />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                <Plus className="h-4 w-4" />
                {editingId ? "Update event" : "Add event"}
              </Button>
              {editingId && (
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>

          {selectedEvents.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-6 w-6" />}
              title="No events"
            >
              Add an event above — it will also flash in the Dashboard “Needs
              attention” section on the day.
            </EmptyState>
          ) : (
            <ul className="space-y-2">
              {selectedEvents.map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-start gap-2 rounded-lg border border-paper-100 bg-paper-50 p-3"
                >
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-paper-700">
                      {ev.title}
                    </p>
                    {ev.note && (
                      <p className="truncate text-xs text-paper-400">
                        {ev.note}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => startEdit(ev)}
                    aria-label={`Edit event: ${ev.title}`}
                    className="shrink-0 rounded-md p-1 text-paper-400 outline-none transition-colors hover:bg-paper-100 hover:text-brand-600 focus-visible:shadow-ring"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (editingId === ev.id) resetForm();
                      removeCalendarEvent(ev.id);
                    }}
                    aria-label={`Delete event: ${ev.title}`}
                    className="shrink-0 rounded-md p-1 text-paper-400 outline-none transition-colors hover:bg-paper-100 hover:text-danger focus-visible:shadow-ring"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
