"use client";

import { useState } from "react";
import { CloudDownload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, fieldClassName } from "@/components/ui/Field";

/**
 * Paste-a-link opener for public Google Drive files and Google Slides
 * presentations ("Anyone with the link can view"). Modal shell follows
 * BookPickerModal / CloudSyncModal.
 */
export function DriveLinkModal({
  isOpen,
  onClose,
  onOpenLink,
  loading,
  error,
}: {
  isOpen: boolean;
  onClose: () => void;
  /** Resolves true when the file opened successfully. */
  onOpenLink: (link: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}) {
  const [link, setLink] = useState("");

  if (!isOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !link.trim()) return;
    if (await onOpenLink(link)) {
      setLink("");
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-paper-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card flex w-full max-w-lg flex-col overflow-hidden shadow-lift motion-reduce:animate-none animate-[pop_.3s_ease-out]"
        role="dialog"
        aria-modal="true"
        aria-label="Open a Google Drive file"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-paper-100 px-5 py-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-paper-900">
            <CloudDownload className="h-5 w-5 text-brand-600" /> Open from
            Google Drive
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

        <form onSubmit={submit} className="space-y-4 px-5 py-4">
          <p className="text-sm text-paper-500">
            In Drive, set the file&apos;s sharing to{" "}
            <strong className="font-semibold text-paper-700">
              &ldquo;Anyone with the link can view&rdquo;
            </strong>
            , copy the link, and paste it here. PDFs, images, and Google
            Slides presentations work — PowerPoint files stored on Drive open
            as slides too.
          </p>
          <Field label="Google Drive or Slides link" htmlFor="drive-link">
            <input
              id="drive-link"
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://drive.google.com/… or https://docs.google.com/presentation/…"
              autoFocus
              className={fieldClassName}
            />
          </Field>
          {error && <p className="text-sm font-medium text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !link.trim()}>
              <CloudDownload className="h-4 w-4" />
              {loading ? "Opening…" : "Open on board"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
