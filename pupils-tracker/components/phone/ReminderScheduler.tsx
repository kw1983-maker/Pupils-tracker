"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTracker } from "@/lib/store";
import { SPELLING_SCHEDULE } from "@/lib/spelling-schedule";
import {
  DEFAULT_REMINDER_SETTINGS,
  planReminders,
  type PlannedNotification,
  type ReminderSettings,
} from "@/lib/phone-reminders";
import {
  ensureNotificationPermission,
  isNativeApp,
  prefGet,
  prefSet,
  replaceScheduledNotifications,
} from "@/lib/native";

const SETTINGS_KEY = "pt-phone-reminders";

interface RemindersValue {
  native: boolean;
  settings: ReminderSettings;
  update: (patch: Partial<ReminderSettings>) => void;
  /** What's planned for the next two weeks (shown in the Reminders tab). */
  planned: PlannedNotification[];
  /** null until checked; false when the teacher said no. */
  permission: boolean | null;
  askPermission: () => Promise<void>;
  /** Fires a sample notification in one minute, to check it works. */
  sendTest: () => Promise<void>;
}

const RemindersContext = createContext<RemindersValue | null>(null);

/**
 * Keeps the phone's scheduled notifications in step with the tracker: every
 * time the classes' dates or the settings change, the next two weeks of
 * reminders are re-planned and rescheduled on the device (no server needed).
 */
export function ReminderProvider({ children }: { children: ReactNode }) {
  const { hydrated, classes, getClassData } = useTracker();
  const native = isNativeApp();
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_REMINDER_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [permission, setPermission] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void prefGet(SETTINGS_KEY).then((raw) => {
      if (cancelled) return;
      if (raw) {
        try {
          setSettings({ ...DEFAULT_REMINDER_SETTINGS, ...(JSON.parse(raw) as object) });
        } catch {
          /* bad saved value — keep defaults */
        }
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((patch: Partial<ReminderSettings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      void prefSet(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // A cheap fingerprint of the dated items, so typing elsewhere in the app
  // (marks, notes) doesn't re-run the scheduler.
  const datedKey = JSON.stringify(
    classes.map((c) => {
      const d = getClassData(c.id);
      return [c.id, c.name, d?.nextSpelling, d?.calendarEvents, d?.homeworkReminders];
    })
  );

  const planned = useMemo(
    () =>
      planReminders({
        now: new Date(),
        classes,
        dataFor: (id) => {
          const d = getClassData(id);
          return d
            ? {
                nextSpelling: d.nextSpelling ?? null,
                calendarEvents: d.calendarEvents ?? [],
                homeworkReminders: d.homeworkReminders ?? [],
              }
            : undefined;
        },
        schedule: SPELLING_SCHEDULE,
        settings,
      }),
    // datedKey stands in for classes/getClassData (new every render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [datedKey, settings]
  );

  const askPermission = useCallback(async () => {
    setPermission(await ensureNotificationPermission());
  }, []);

  // Ask once the app is up (Android 13+ shows the system prompt).
  useEffect(() => {
    if (!native || !hydrated) return;
    const t = setTimeout(() => void askPermission(), 0);
    return () => clearTimeout(t);
  }, [native, hydrated, askPermission]);

  useEffect(() => {
    if (!native || !hydrated || !loaded || !permission) return;
    void replaceScheduledNotifications(planned).catch((err) =>
      console.error("Scheduling reminders failed:", err)
    );
  }, [native, hydrated, loaded, permission, planned]);

  const sendTest = useCallback(async () => {
    if (!(await ensureNotificationPermission())) {
      setPermission(false);
      return;
    }
    await replaceScheduledNotifications([
      ...planned,
      {
        id: 1,
        title: "Pupil Tracker",
        body: "Test reminder — notifications are working.",
        at: new Date(Date.now() + 60_000),
      },
    ]);
  }, [planned]);

  return (
    <RemindersContext.Provider
      value={{ native, settings, update, planned, permission, askPermission, sendTest }}
    >
      {children}
    </RemindersContext.Provider>
  );
}

export function useReminders(): RemindersValue {
  const ctx = useContext(RemindersContext);
  if (!ctx) throw new Error("useReminders must be used within ReminderProvider");
  return ctx;
}
