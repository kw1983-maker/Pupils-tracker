"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { Bell, Camera, ClipboardCheck, LogOut, Sparkles, Sun } from "lucide-react";
import { useTracker } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { ClassPicker } from "@/components/ui/ClassPicker";
import { PanelSwap } from "@/components/ui/motion";
import { TodayTab } from "./TodayTab";
import { RemoteTab } from "./RemoteTab";
import { AttendanceTab } from "./AttendanceTab";
import { PhotoTab } from "./PhotoTab";
import { RemindersTab } from "./RemindersTab";
import { ReminderProvider } from "./ReminderScheduler";
import { isDialogOpen } from "@/components/ui/useDialog";
import { exitApp, onBackButton } from "@/lib/native";
import { useReconnectOnResume } from "@/lib/useReconnectOnResume";

type PhoneTab = "today" | "remote" | "attendance" | "photo" | "reminders";

const TABS: { id: PhoneTab; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "today", label: "Today", icon: Sun },
  { id: "remote", label: "Points", icon: Sparkles },
  { id: "attendance", label: "Roll call", icon: ClipboardCheck },
  { id: "photo", label: "Photo", icon: Camera },
  { id: "reminders", label: "Reminders", icon: Bell },
];

/** Phone layout: slim header with class switcher, content, bottom tab bar. */
export function PhoneShell() {
  const { hydrated, currentClassId } = useTracker();
  const { logout } = useAuth();
  const [tab, setTab] = useState<PhoneTab>("today");
  const tabRef = useRef(tab);
  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);

  // Reconnect at once after the phone is unlocked / the app reopened.
  useReconnectOnResume();

  // Android Back: close the open popup, else go back to Today, else quit —
  // instead of always quitting the app.
  useEffect(
    () =>
      onBackButton(() => {
        if (isDialogOpen()) {
          document.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
          );
        } else if (tabRef.current !== "today") {
          setTab("today");
        } else {
          void exitApp();
        }
      }),
    []
  );

  return (
    <ReminderProvider>
    <div className="flex min-h-screen flex-col bg-paper-50 pt-[env(safe-area-inset-top)]">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-paper-200 bg-surface px-4">
        <ClassPicker />
        <button
          type="button"
          onClick={logout}
          aria-label="Log out"
          className="flex h-9 w-9 items-center justify-center rounded-md text-paper-400 outline-none transition-colors hover:bg-paper-100 hover:text-paper-700 focus-visible:shadow-ring"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      <main
        id={`phone-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`phone-tab-${tab}`}
        className="flex-1 px-4 pb-28 pt-4"
      >
        {!hydrated ? (
          <p className="py-20 text-center text-sm text-paper-400">Loading…</p>
        ) : (
          <PanelSwap id={`${tab}-${currentClassId}`}>
            {tab === "today" && <TodayTab onTakeRollCall={() => setTab("attendance")} />}
            {tab === "remote" && <RemoteTab />}
            {tab === "attendance" && <AttendanceTab />}
            {tab === "photo" && <PhotoTab />}
            {tab === "reminders" && <RemindersTab />}
          </PanelSwap>
        )}
      </main>

      <nav
        role="tablist"
        aria-label="Phone sections"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-paper-200 bg-surface pb-[env(safe-area-inset-bottom)]"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              id={`phone-tab-${id}`}
              role="tab"
              aria-selected={active}
              aria-controls={`phone-panel-${id}`}
              onClick={() => setTab(id)}
              className={`flex flex-col items-center gap-0.5 py-2 text-2xs font-bold outline-none transition-colors focus-visible:shadow-ring ${
                active ? "text-brand-600" : "text-paper-400"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          );
        })}
      </nav>
    </div>
    </ReminderProvider>
  );
}
