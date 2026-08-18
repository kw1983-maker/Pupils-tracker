"use client";

import { GraduationCap, X } from "lucide-react";
import { LESSONS } from "@/lib/lessons";

/**
 * Picker for the bundled interactive HTML lessons so one can be opened
 * straight on the Spelling/Dictation board. Modal shell follows BookPickerModal.
 */
export function LessonPickerModal({
  isOpen,
  onClose,
  onPick,
}: {
  isOpen: boolean;
  onClose: () => void;
  onPick: (url: string, name: string) => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-paper-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden shadow-lift motion-reduce:animate-none animate-[pop_.3s_ease-out]"
        role="dialog"
        aria-modal="true"
        aria-label="Open a lesson on the board"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-paper-100 px-5 py-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-paper-900">
            <GraduationCap className="h-5 w-5 text-brand-600" /> Open a lesson
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-2 text-paper-400 outline-none transition-colors hover:bg-paper-100 hover:text-paper-700 focus-visible:shadow-ring"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-4">
          <ul className="grid gap-2">
            {LESSONS.map((lesson) => (
              <li key={lesson.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(lesson.path, lesson.title);
                    onClose();
                  }}
                  className="group flex w-full items-center gap-3 rounded-md border border-paper-100 p-3 text-left outline-none transition hover:border-brand-300 hover:bg-brand-50 focus-visible:shadow-ring"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-mark-green text-mark-green-ink">
                    <GraduationCap className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold text-paper-800">
                    {lesson.title}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
