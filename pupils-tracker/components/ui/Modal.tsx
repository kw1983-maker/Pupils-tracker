"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Accessible modal shell — the single source of truth for dialog behaviour:
 * role="dialog" + aria-modal, labelled title, Escape to close, backdrop click,
 * focus trap, and focus restore on close. Reuse this rather than hand-rolling
 * overlays so every dialog behaves the same for keyboard and screen-reader users.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  titleIcon,
  children,
  footer,
  maxWidthClass = "max-w-lg",
}: {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  titleIcon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClass?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const card = cardRef.current;
    // Focus the first focusable element (fallback to the card itself).
    const focusables = card?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    (focusables?.[0] ?? card)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab" && card) {
        const items = card.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])'
        );
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-paper-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`card flex max-h-[85vh] w-full ${maxWidthClass} flex-col overflow-hidden shadow-lift outline-none motion-reduce:animate-none animate-[pop_.3s_ease-out]`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-paper-200 bg-surface px-6 py-4">
          <h2 id={titleId} className="flex items-center gap-2 font-display text-lg font-bold text-paper-800">
            {titleIcon}
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-paper-400 outline-none transition-colors hover:text-paper-600 focus-visible:shadow-ring"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="thin-scroll flex-1 overflow-y-auto bg-paper-50/30 p-6">{children}</div>

        {footer && (
          <div className="flex justify-end border-t border-paper-200 bg-surface px-6 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}
