"use client";

import { useRef } from "react";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  ClipboardCheck,
  CalendarCheck,
  CalendarDays,
  Users,
  BarChart3,
  PenLine,
  BookOpen,
  Gamepad2,
  Disc3,
  GraduationCap,
} from "lucide-react";
import { Tab } from "@/lib/types";

type Item = { id: Tab; label: string; icon: React.ReactNode };

// Same destinations as the old tab bar, now grouped so all 10 are visible at once.
const GROUPS: { label: string; items: Item[] }[] = [
  {
    label: "Track",
    items: [
      { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-[18px] w-[18px]" /> },
      { id: "homework", label: "Homework", icon: <ClipboardCheck className="h-[18px] w-[18px]" /> },
      { id: "attendance", label: "Attendance", icon: <CalendarCheck className="h-[18px] w-[18px]" /> },
      { id: "calendar", label: "Calendar", icon: <CalendarDays className="h-[18px] w-[18px]" /> },
      { id: "students", label: "Students", icon: <Users className="h-[18px] w-[18px]" /> },
      { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-[18px] w-[18px]" /> },
    ],
  },
  {
    label: "Teach & tools",
    items: [
      { id: "spelling", label: "Spelling", icon: <PenLine className="h-[18px] w-[18px]" /> },
      { id: "resources", label: "Resources", icon: <BookOpen className="h-[18px] w-[18px]" /> },
      { id: "games", label: "Games", icon: <Gamepad2 className="h-[18px] w-[18px]" /> },
      { id: "rules", label: "Rule Wheel", icon: <Disc3 className="h-[18px] w-[18px]" /> },
    ],
  },
];

const FLAT: Item[] = GROUPS.flatMap((g) => g.items);

export function Sidebar({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const idx = FLAT.findIndex((t) => t.id === active);
    let next = idx;
    if (e.key === "ArrowDown") next = (idx + 1) % FLAT.length;
    else if (e.key === "ArrowUp") next = (idx - 1 + FLAT.length) % FLAT.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = FLAT.length - 1;
    else return;
    e.preventDefault();
    onChange(FLAT[next].id);
    refs.current[next]?.focus();
  };

  return (
    <nav
      role="tablist"
      aria-orientation="vertical"
      aria-label="Sections"
      onKeyDown={onKeyDown}
      className="sticky top-0 flex h-screen w-60 shrink-0 flex-col gap-1 overflow-y-auto border-r border-paper-200 bg-brand-50/60 px-3 py-4 print:hidden"
    >
      {/* Brand */}
      <div className="mb-2 flex items-center gap-2.5 px-2 py-1">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500 text-surface">
          <GraduationCap className="h-[18px] w-[18px]" />
        </span>
        <span className="font-display text-lg font-semibold tracking-tight text-paper-900">
          ClassTrack
        </span>
      </div>

      {GROUPS.map((group) => (
        <div key={group.label} className="mb-1">
          <p className="px-3 pb-1 pt-2 text-2xs font-bold uppercase tracking-wider text-paper-400">
            {group.label}
          </p>
          {group.items.map((tab) => {
            const i = FLAT.findIndex((t) => t.id === tab.id);
            const isActive = tab.id === active;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onChange(tab.id)}
                className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold outline-none transition-colors duration-(--duration-fast) focus-visible:shadow-ring ${
                  isActive
                    ? "text-brand-700"
                    : "text-paper-500 hover:bg-brand-100/50 hover:text-paper-700"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-0 -z-10 rounded-xl bg-brand-100"
                    transition={{ type: "spring", stiffness: 260, damping: 24 }}
                  />
                )}
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
