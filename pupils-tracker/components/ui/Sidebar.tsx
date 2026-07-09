"use client";

import { useEffect, useRef } from "react";
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
  Sparkles,
  Puzzle,
  X,
} from "lucide-react";
import { Tab } from "@/lib/types";

type Item = { id: Tab; label: string; icon: React.ReactNode };

// Same destinations as the old tab bar, now grouped so all 10 are visible at once.
const GROUPS: { label: string; items: Item[] }[] = [
  {
    label: "Track",
    items: [
      { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
      { id: "homework", label: "Homework", icon: <ClipboardCheck className="h-5 w-5" /> },
      { id: "attendance", label: "Attendance", icon: <CalendarCheck className="h-5 w-5" /> },
      { id: "calendar", label: "Calendar", icon: <CalendarDays className="h-5 w-5" /> },
      { id: "students", label: "Students", icon: <Users className="h-5 w-5" /> },
      { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-5 w-5" /> },
    ],
  },
  {
    label: "Teach & tools",
    items: [
      { id: "tutor", label: "Tutor", icon: <Sparkles className="h-5 w-5" /> },
      { id: "spelling", label: "Spelling", icon: <PenLine className="h-5 w-5" /> },
      { id: "resources", label: "Resources", icon: <BookOpen className="h-5 w-5" /> },
      { id: "games", label: "Games", icon: <Gamepad2 className="h-5 w-5" /> },
      { id: "rules", label: "Rule Wheel", icon: <Disc3 className="h-5 w-5" /> },
      { id: "remedial", label: "Remedial", icon: <Puzzle className="h-5 w-5" /> },
    ],
  },
];

const FLAT: Item[] = GROUPS.flatMap((g) => g.items);

export function Sidebar({
  active,
  onChange,
  mobileOpen = false,
  onClose,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
  /** Whether the drawer is open on small (<lg) screens. */
  mobileOpen?: boolean;
  /** Close the mobile drawer. */
  onClose?: () => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  // Close the drawer on Escape (small screens only).
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen, onClose]);

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

  const select = (id: Tab) => {
    onChange(id);
    onClose?.(); // dismiss the drawer after picking a destination on mobile
  };

  return (
    <>
      {/* Backdrop (small screens only) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-paper-900/40 backdrop-blur-sm lg:hidden print:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <nav
        role="tablist"
        aria-orientation="vertical"
        aria-label="Sections"
        onKeyDown={onKeyDown}
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-60 shrink-0 flex-col gap-1 overflow-y-auto border-r border-paper-200 bg-brand-50/60 px-3 py-4 transition-transform duration-(--duration-base) lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 print:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="mb-2 flex items-center gap-2.5 px-2 py-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500 text-surface">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-paper-900">
            ClassTrack
          </span>
          {/* Close (small screens only) */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="ml-auto rounded-md p-1 text-paper-400 outline-none transition-colors hover:text-paper-700 focus-visible:shadow-ring lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
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
                  onClick={() => select(tab.id)}
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
    </>
  );
}
