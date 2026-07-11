"use client";

import { BookOpen, FileText, X } from "lucide-react";
import { RESOURCES, RESOURCE_GROUPS, type PdfResource } from "@/lib/resources";

/**
 * Picker for the bundled Resources PDFs so a book can be opened straight on
 * the Spelling/Dictation board. Modal shell follows CloudSyncModal.
 */
export function BookPickerModal({
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
        aria-label="Open a book on the board"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-paper-100 px-5 py-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-paper-900">
            <BookOpen className="h-5 w-5 text-brand-600" /> Open a book
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
          {RESOURCE_GROUPS.map((group) => {
            const pdfs = RESOURCES.filter(
              (r): r is PdfResource => r.group === group && r.kind === "pdf"
            );
            if (pdfs.length === 0) return null;
            return (
              <div key={group}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-paper-400">
                  {group}
                </p>
                <ul className="grid gap-2">
                  {pdfs.map((r) => (
                    <li key={r.file}>
                      <button
                        type="button"
                        onClick={() => {
                          onPick(`/books/${r.file}`, r.title);
                          onClose();
                        }}
                        className="group flex w-full items-center gap-3 rounded-md border border-paper-100 p-3 text-left outline-none transition hover:border-brand-300 hover:bg-brand-50 focus-visible:shadow-ring"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-mark-pink text-mark-pink-ink">
                          <FileText className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-semibold text-paper-800">
                          {r.title}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
