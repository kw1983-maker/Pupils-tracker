"use client";

import { useState } from "react";
import {
  GraduationCap,
  Download,
  Cloud,
  CloudOff,
  RefreshCw,
  Database,
} from "lucide-react";
import { TrackerProvider, useTracker } from "@/lib/store";
import { Tab } from "@/lib/types";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { ClassPicker } from "@/components/ui/ClassPicker";
import { HeaderDate } from "@/components/ui/HeaderDate";
import { PanelSwap } from "@/components/ui/motion";
import { Dashboard } from "@/components/pages/Dashboard";
import { HomeworkTracker } from "@/components/pages/HomeworkTracker";
import { Attendance } from "@/components/pages/Attendance";
import { Behavior } from "@/components/pages/Behavior";
import { Students } from "@/components/pages/Students";
import { Analytics } from "@/components/pages/Analytics";
import { CloudSyncModal } from "@/components/ui/CloudSyncModal";
import { ClassTimer } from "@/components/ui/ClassTimer";
import { MonitorControl } from "@/components/ui/MonitorControl";
import { PupilPicker } from "@/components/ui/PupilPicker";

function Shell() {
  const {
    pupils,
    assignments,
    exportToCSV,
    hydrated,
    currentClassId,
    teacherId,
    syncStatus,
    saveToCloud,
  } = useTracker();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [isSyncOpen, setIsSyncOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      {/* App bar */}
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-paper-200 bg-surface px-4 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-surface">
            <GraduationCap className="h-5 w-5" />
          </div>
          <h1 className="hidden font-display text-xl font-semibold tracking-tight text-paper-900 md:block">
            ClassTrack <span className="text-brand-600">Pro</span>
          </h1>
          <ClassPicker />
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-3 text-sm font-medium text-paper-500 lg:flex">
            <span className="rounded-full bg-paper-100 px-3 py-1 text-paper-600">
              {pupils.length} Pupils
            </span>
            <span className="text-paper-300">|</span>
            <span>{assignments.length} Assignments</span>
          </div>
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
          <button
            onClick={() => setIsSyncOpen(true)}
            className="text-paper-400 hover:text-brand-600 outline-none p-2 rounded-md hover:bg-paper-100 transition-colors"
            title="Cloud Database Settings"
          >
            <Database className="h-4 w-4" />
          </button>
          <Button onClick={exportToCSV}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export Report</span>
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="sticky top-16 z-20 shrink-0 border-b border-paper-200 bg-surface">
        <Tabs active={tab} onChange={setTab} />
      </div>

      {/* Content */}
      <main className="flex-1 p-4 sm:p-8">
        {!hydrated ? (
          <p className="py-20 text-center text-sm text-paper-400">Loading…</p>
        ) : (
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
              {tab === "behavior" && <Behavior />}
              {tab === "students" && <Students />}
              {tab === "analytics" && <Analytics />}
            </PanelSwap>
          </div>
        )}
      </main>

      <CloudSyncModal isOpen={isSyncOpen} onClose={() => setIsSyncOpen(false)} />
      <div className="fixed bottom-4 right-4 z-40 flex items-end gap-3">
        <PupilPicker />
        <MonitorControl />
        <ClassTimer />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <TrackerProvider>
      <Shell />
    </TrackerProvider>
  );
}
