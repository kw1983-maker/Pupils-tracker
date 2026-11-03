"use client";

import { useState } from "react";
import { BellRing, BellOff } from "lucide-react";
import type { ReminderSettings } from "@/lib/phone-reminders";
import { Button } from "@/components/ui/Button";
import { Field, fieldClassName } from "@/components/ui/Field";
import { useReminders } from "./ReminderScheduler";

const TOGGLES: { key: "spelling" | "events" | "homework"; label: string; hint: string }[] = [
  { key: "spelling", label: "Spelling & dictation", hint: "Each class's sitting and weekly day" },
  { key: "events", label: "Calendar events", hint: "Events from the Calendar tab" },
  { key: "homework", label: "Homework reminders", hint: "Open items in “Needs attention”" },
];

/** Phone "Reminders" tab: what gets a notification, and when. */
export function RemindersTab() {
  const { native, settings, update, planned, permission, askPermission, sendTest } =
    useReminders();
  const [testSent, setTestSent] = useState(false);

  const setTime = (key: keyof Pick<ReminderSettings, "eveningTime" | "morningTime">) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.value) update({ [key]: e.target.value });
    };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-paper-800">Reminders</h2>
        <p className="text-xs text-paper-500">
          A nudge the evening before and on the morning, for every class.
        </p>
      </div>

      {!native && (
        <p className="rounded-card bg-warning-bg p-3 text-sm font-semibold text-warning-ink">
          Notifications work in the Android app. Here you can still see what&apos;s coming up.
        </p>
      )}
      {native && permission === false && (
        <div className="space-y-2 rounded-card bg-danger-bg p-3 text-sm text-danger-ink">
          <p className="flex items-center gap-2 font-semibold">
            <BellOff className="h-4 w-4" /> Notifications are switched off for this app.
          </p>
          <Button size="sm" variant="secondary" onClick={() => void askPermission()}>
            Allow notifications
          </Button>
        </div>
      )}

      <section className="divide-y divide-paper-100 rounded-card bg-surface shadow-float">
        {TOGGLES.map((t) => (
          <label key={t.key} className="flex items-center justify-between gap-3 px-4 py-3">
            <span>
              <span className="block text-sm font-semibold text-paper-700">{t.label}</span>
              <span className="block text-xs text-paper-400">{t.hint}</span>
            </span>
            <input
              type="checkbox"
              checked={settings[t.key]}
              onChange={(e) => update({ [t.key]: e.target.checked })}
              className="h-5 w-5 accent-brand-500"
            />
          </label>
        ))}
        <div className="grid grid-cols-2 gap-3 px-4 py-3">
          <Field label="Evening before" htmlFor="rem-evening">
            <input
              id="rem-evening"
              type="time"
              value={settings.eveningTime}
              onChange={setTime("eveningTime")}
              className={`${fieldClassName} w-full`}
            />
          </Field>
          <Field label="On the day" htmlFor="rem-morning">
            <input
              id="rem-morning"
              type="time"
              value={settings.morningTime}
              onChange={setTime("morningTime")}
              className={`${fieldClassName} w-full`}
            />
          </Field>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-2xs font-bold uppercase tracking-wider text-paper-400">
          Coming up · next 2 weeks
        </h3>
        {planned.length === 0 ? (
          <p className="text-sm text-paper-400">Nothing scheduled.</p>
        ) : (
          <ul className="divide-y divide-paper-100 rounded-card bg-surface shadow-float">
            {planned.slice(0, 30).map((n) => (
              <li key={n.id} className="px-4 py-2">
                <p className="text-sm font-semibold text-paper-700">{n.title}</p>
                <p className="text-xs text-paper-400">
                  {n.at.toLocaleString(undefined, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                  · {n.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {native && (
        <Button
          variant="secondary"
          className="w-full"
          onClick={async () => {
            await sendTest();
            setTestSent(true);
          }}
        >
          <BellRing className="h-4 w-4" />
          {testSent ? "Test coming in about a minute" : "Send a test notification"}
        </Button>
      )}
    </div>
  );
}
