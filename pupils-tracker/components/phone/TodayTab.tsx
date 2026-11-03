"use client";

import { useMemo, type ComponentType, type ReactNode } from "react";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Eye,
  PartyPopper,
} from "lucide-react";
import { todayISO, useTracker } from "@/lib/store";
import { SPELLING_SCHEDULE } from "@/lib/spelling-schedule";
import { buildToday, type TodayItem, type When } from "@/lib/today";
import { shortenName } from "@/lib/pupil-name";
import { HighlighterTag, markerFor } from "@/components/ui/HighlighterTag";
import { Button } from "@/components/ui/Button";

const WHEN_LABEL: Record<When, string> = { today: "Today", tomorrow: "Tomorrow", later: "" };

function greeting(now: Date): string {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function ClassTag({ name }: { name: string }) {
  return <HighlighterTag marker={markerFor(name)}>{name}</HighlighterTag>;
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-paper-400">
        <Icon className="h-3.5 w-3.5" /> {title}
      </h3>
      <ul className="divide-y divide-paper-100 overflow-hidden rounded-card bg-surface shadow-float">
        {children}
      </ul>
    </section>
  );
}

function ItemRow({ item, dayLabel }: { item: TodayItem; dayLabel?: string }) {
  const urgent = item.when === "today";
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <ClassTag name={item.className} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-paper-700">{item.title}</p>
        {item.detail && <p className="text-xs text-paper-400">{item.detail}</p>}
      </div>
      {dayLabel && (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-2xs font-bold ${
            urgent ? "bg-danger-bg text-danger-ink" : "bg-warning-bg text-warning-ink"
          }`}
        >
          {dayLabel}
        </span>
      )}
    </li>
  );
}

/** "Mon 9 Nov" for an event later in the week. */
function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * Phone "Today" tab — the first screen: today's roll call for the current
 * class, then everything needing attention across ALL classes (spelling,
 * the week's calendar events, open homework reminders, the watch list).
 */
export function TodayTab({ onTakeRollCall }: { onTakeRollCall: () => void }) {
  const { classes, getClassData, pupils, attendance, currentClassName } = useTracker();
  const now = new Date();

  const summary = useMemo(
    () =>
      buildToday({
        now,
        classes,
        dataFor: (id) => {
          const d = getClassData(id);
          return d
            ? {
                pupils: d.pupils ?? [],
                nextSpelling: d.nextSpelling ?? null,
                calendarEvents: d.calendarEvents ?? [],
                homeworkReminders: d.homeworkReminders ?? [],
                watchList: d.watchList ?? [],
              }
            : undefined;
        },
        schedule: SPELLING_SCHEDULE,
      }),
    // `now` is per render; the day only matters when data changes or the
    // tab re-mounts, which happens every time it's opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [classes, getClassData]
  );

  // Roll call for the current class, keyed the same way the Roll call tab saves it.
  const todays = attendance[todayISO()] ?? {};
  const marked = pupils.filter((p) => todays[p.id]).length;
  const rollCallDone = pupils.length > 0 && marked === pupils.length;
  const absent = pupils.filter((p) => todays[p.id] === "absent").length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-semibold text-paper-800">{greeting(now)}</h2>
        <p className="text-sm text-paper-500">
          {now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {pupils.length > 0 && (
        <div
          className={`flex items-center gap-3 rounded-card p-4 shadow-float ${
            rollCallDone ? "bg-success-bg" : "bg-surface"
          }`}
        >
          {rollCallDone ? (
            <CheckCircle2 className="h-6 w-6 shrink-0 text-success" />
          ) : (
            <ClipboardCheck className="h-6 w-6 shrink-0 text-warning" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-paper-800">
              {rollCallDone
                ? `Roll call done for ${currentClassName}`
                : `Roll call not taken for ${currentClassName}`}
            </p>
            <p className="text-xs text-paper-500">
              {rollCallDone
                ? absent > 0
                  ? `${absent} absent today`
                  : "Everyone's in"
                : marked > 0
                  ? `${marked} of ${pupils.length} marked`
                  : `${pupils.length} pupils`}
            </p>
          </div>
          {!rollCallDone && (
            <Button size="sm" onClick={onTakeRollCall}>
              Take it
            </Button>
          )}
        </div>
      )}

      {summary.count === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card bg-surface px-6 py-10 text-center shadow-float">
          <PartyPopper className="h-8 w-8 text-brand-500" />
          <p className="font-display text-lg font-semibold text-paper-700">All clear</p>
          <p className="text-sm text-paper-400">
            No spelling, events, homework reminders or watched pupils today.
          </p>
        </div>
      ) : (
        <>
          {summary.spelling.length > 0 && (
            <Section title="Spelling & dictation" icon={BookOpen}>
              {summary.spelling.map((s) => (
                <ItemRow key={`${s.classId}-sp`} item={s} dayLabel={WHEN_LABEL[s.when]} />
              ))}
            </Section>
          )}

          {summary.events.length > 0 && (
            <Section title="This week" icon={CalendarDays}>
              {summary.events.map((e, i) => (
                <ItemRow
                  key={`${e.classId}-ev-${i}`}
                  item={e}
                  dayLabel={e.when === "later" && e.date ? shortDate(e.date) : WHEN_LABEL[e.when]}
                />
              ))}
            </Section>
          )}

          {summary.homework.length > 0 && (
            <Section title="Homework reminders" icon={ClipboardList}>
              {summary.homework.map((h, i) => (
                <ItemRow key={`${h.classId}-hw-${i}`} item={h} />
              ))}
            </Section>
          )}

          {summary.watch.length > 0 && (
            <Section title="Watch list" icon={Eye}>
              {summary.watch.map((g) => (
                <li key={g.classId} className="flex items-start gap-3 px-4 py-3">
                  <ClassTag name={g.className} />
                  <p className="min-w-0 flex-1 text-sm font-semibold text-paper-700">
                    {g.names.map(shortenName).join(", ")}
                  </p>
                </li>
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
}
