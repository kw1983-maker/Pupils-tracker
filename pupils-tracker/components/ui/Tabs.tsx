"use client";

import { useRef } from "react";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  ClipboardCheck,
  CalendarCheck,
  Smile,
  Users,
  BarChart3,
  Disc3,
  BookOpen,
  CalendarDays,
} from "lucide-react";
import { Tab } from "@/lib/types";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "homework", label: "Homework", icon: <ClipboardCheck className="h-4 w-4" /> },
  { id: "attendance", label: "Attendance", icon: <CalendarCheck className="h-4 w-4" /> },
  { id: "calendar", label: "Calendar", icon: <CalendarDays className="h-4 w-4" /> },
  { id: "behavior", label: "Behavior", icon: <Smile className="h-4 w-4" /> },
  { id: "students", label: "Students", icon: <Users className="h-4 w-4" /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "rules", label: "Rule Wheel", icon: <Disc3 className="h-4 w-4" /> },
  { id: "resources", label: "Resources", icon: <BookOpen className="h-4 w-4" /> },
];

export function Tabs({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const idx = TABS.findIndex((t) => t.id === active);
    let next = idx;
    if (e.key === "ArrowRight") next = (idx + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    onChange(TABS[next].id);
    refs.current[next]?.focus();
  };

  return (
    <nav
      role="tablist"
      aria-label="Sections"
      onKeyDown={onKeyDown}
      className="thin-scroll flex gap-1 overflow-x-auto px-4 sm:px-8"
    >
      {TABS.map((tab, i) => {
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
            className={`relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-semibold outline-none transition-colors duration-(--duration-fast) focus-visible:shadow-ring ${
              isActive
                ? "text-brand-700"
                : "text-paper-400 hover:text-paper-600"
            }`}
          >
            {tab.icon}
            {tab.label}
            {isActive && (
              <motion.span
                layoutId="tab-underline"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-500"
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
