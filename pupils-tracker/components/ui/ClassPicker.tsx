"use client";

import { Plus, Users } from "lucide-react";
import { useTracker } from "@/lib/store";

export function ClassPicker() {
  const { classes, currentClassId, setCurrentClass, addClass } = useTracker();

  return (
    <div className="flex items-center gap-2">
      <Users className="hidden h-4 w-4 text-paper-400 sm:block" aria-hidden />
      <label htmlFor="class-select" className="sr-only">
        Choose class
      </label>
      <select
        id="class-select"
        value={currentClassId}
        onChange={(e) => setCurrentClass(e.target.value)}
        className="rounded-md border border-paper-200 bg-surface px-3 py-1.5 text-sm font-semibold text-paper-700 outline-none transition-colors focus:border-brand-400 focus:shadow-ring"
      >
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            Class {c.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        aria-label="Add class"
        onClick={() => {
          const name = prompt("New class name (e.g. 3A)");
          if (name && name.trim()) addClass(name.trim());
        }}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-paper-200 text-paper-500 outline-none transition-colors hover:border-brand-400 hover:text-brand-600 focus-visible:shadow-ring"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
