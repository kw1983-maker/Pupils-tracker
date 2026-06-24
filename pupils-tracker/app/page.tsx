"use client";

import { useState } from "react";
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Database,
  LogOut,
  MoreHorizontal,
  Users,
  ClipboardCheck,
} from "lucide-react";
import { TrackerProvider, useTracker } from "@/lib/store";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LoginScreen } from "@/components/ui/LoginScreen";
import { Tab } from "@/lib/types";
import { Sidebar } from "@/components/ui/Sidebar";
import { Button } from "@/components/ui/Button";
import { ClassPicker } from "@/components/ui/ClassPicker";
import { HeaderDate } from "@/components/ui/HeaderDate";
import { PanelSwap } from "@/components/ui/motion";
import { Dashboard } from "@/components/pages/Dashboard";
import { HomeworkTracker } from "@/components/pages/HomeworkTracker";
import { Attendance } from "@/components/pages/Attendance";
import { Calendar } from "@/components/pages/Calendar";
import { Students } from "@/components/pages/Students";
import { Analytics } from "@/components/pages/Analytics";
import { SpinningRules } from "@/components/pages/SpinningRules";
import { SpellingBoard, type TeachRequest } from "@/components/pages/SpellingBoard";
import { Resources } from "@/components/pages/Resources";
import { Games } from "@/components/pages/Games";
import { Tutor } from "@/components/pages/Tutor";
import { CloudSyncModal } from "@/components/ui/CloudSyncModal";
import { FloatingToolbar } from "@/components/ui/FloatingToolbar";
import { CelebrationProvider } from "@/components/ui/Celebration";
import { TimerProvider } from "@/lib/useTimer";

// Counts + database + log out now live behind a single "•••" menu so the top
// bar holds only what a teacher touches mid-lesson (class, date, save).
function OverflowMenu() {
  const { pupils, assignments } = useTracker();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          title="More"
          className="flex h-9 w-9 items-center justify-center rounded-md text-paper-400 outline-none transition-colors hover:bg-paper-100 hover:text-paper-700 focus-visible:shadow-ring"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div
              role="menu"
              className="absolute right-0 top-11 z-50 w-56 rounded-card bg-surface p-2 shadow-float"
            >
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="flex items-center gap-2 text-sm font-semibold text-paper-600">
                  <Users className="h-4 w-4 text-paper-400" />
                  {pupils.length} pupils
                </span>
                <span className="flex items-center gap-2 text-sm font-semibold text-paper-600">
                  <ClipboardCheck className="h-4 w-4 text-paper-400" />
                  {assignments.length}
                </span>
              </div>
              <div className="my-1 h-px bg-paper-100" />
              <button
                role="menuitem"
                onClick={() => {
                  setIsSyncOpen(true);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold text-paper-700 outline-none transition-colors hover:bg-paper-100 focus-visible:shadow-ring"
              >
                <Database className="h-4 w-4 text-paper-400" />
                Cloud database settings
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  logout();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold text-danger outline-none transition-colors hover:bg-danger-bg focus-visible:shadow-ring"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          </>
        )}
      </div>

      <CloudSyncModal isOpen={isSyncOpen} onClose={() => setIsSyncOpen(false)} />
    </>
  );
}

function Shell() {
  const { hydrated, currentClassId, syncStatus, saveToCloud } = useTracker();
  const [tab, setTab] = useState<Tab>("dashboard");
  // A Resources book queued for the spelling board ("Teach on board").
  const [teachRequest, setTeachRequest] = useState<TeachRequest | null>(null);

  return (
    <TimerProvider>
    <CelebrationProvider>
      <div className="flex min-h-screen">
        {/* Left sidebar nav (replaces the horizontal tab bar) */}
        <Sidebar active={tab} onChange={setTab} />

        {/* Right column: slim header + content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-paper-200 bg-surface px-4 sm:px-8 print:hidden">
            <ClassPicker />
            <div className="flex items-center gap-3">
              <HeaderDate />
              <Button variant="secondary" onClick={saveToCloud} disabled={!hydrated}>
                {syncStatus === "saving" ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-warning" />
                ) : syncStatus === "error" ? (
                  <CloudOff className="h-4 w-4 text-danger" />
                ) : (
                  <Cloud className="h-4 w-4 text-success" />
                )}
                <span className="hidden sm:inline">
                  {syncStatus === "saving"
                    ? "Saving..."
                    : syncStatus === "error"
                    ? "Sync Error"
                    : "Save to Cloud"}
                </span>
              </Button>
              <OverflowMenu />
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-8">
            {!hydrated ? (
              <p className="py-20 text-center text-sm text-paper-400">Loading…</p>
            ) : (
              <>
                {tab !== "spelling" && (
                  <div
                    role="tabpanel"
                    id={`panel-${tab}`}
                    aria-labelledby={`tab-${tab}`}
                    tabIndex={0}
                    className="outline-none"
                  >
                    <PanelSwap id={`${tab}-${currentClassId}`}>
                      {tab === "dashboard" && <Dashboard onNavigate={setTab} />}
                      {tab === "homework" && <HomeworkTracker />}
                      {tab === "attendance" && <Attendance />}
                      {tab === "calendar" && <Calendar />}
                      {tab === "students" && <Students />}
                      {tab === "analytics" && <Analytics />}
                      {tab === "rules" && <SpinningRules />}
                      {tab === "resources" && (
                        <Resources
                          onTeach={(url, name) => {
                            setTeachRequest({ url, name });
                            setTab("spelling");
                          }}
                        />
                      )}
                      {tab === "games" && <Games />}
                      {tab === "tutor" && <Tutor />}
                    </PanelSwap>
                  </div>
                )}
                {/* The spelling board stays mounted (CSS-hidden) so the opened
                    file and ink survive visits to other tabs. */}
                <div
                  role="tabpanel"
                  id="panel-spelling"
                  aria-labelledby="tab-spelling"
                  tabIndex={0}
                  className={tab === "spelling" ? "outline-none" : "hidden"}
                >
                  <SpellingBoard
                    active={tab === "spelling"}
                    teachRequest={teachRequest}
                    onTeachHandled={() => setTeachRequest(null)}
                  />
                </div>
              </>
            )}
          </main>
        </div>

        <FloatingToolbar />
      </div>
    </CelebrationProvider>
    </TimerProvider>
  );
}

function Gate() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper-50">
        <p className="text-sm text-paper-400">Loading…</p>
      </main>
    );
  }
  if (!user) return <LoginScreen />;
  return (
    <TrackerProvider>
      <Shell />
    </TrackerProvider>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
