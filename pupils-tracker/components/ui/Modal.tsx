"use client";

import { useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useDialog } from "@/components/ui/useDialog";

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
  const titleId = useId();

  useDialog(cardRef, isOpen, onClose);

  if (!isOpen) return null;

  // Portal to <body> so this "fixed" overlay always covers the real viewport —
  // nesting it under an ancestor with a transform/filter (e.g. a Framer Motion
  // page-transition wrapper) would otherwise turn that ancestor into the
  // containing block and shrink the overlay down to that ancestor's box.
  return createPortal(
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
            className="-m-1 rounded-md p-2 text-paper-400 outline-none transition-colors hover:text-paper-600 focus-visible:shadow-ring"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="thin-scroll flex-1 overflow-y-auto bg-paper-50/30 p-6">{children}</div>

        {footer && (
          <div className="flex justify-end border-t border-paper-200 bg-surface px-6 py-4">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}

/**
 * The full-screen sibling of `Modal`, for the "big screen" moments (Pet PK, the
 * fight showcase, a pet hatching) that bring their own look instead of a card.
 * Same dialog behaviour — portal, Escape, focus trap and restore, scroll lock —
 * so none of them has to hand-roll it again.
 *
 * `onBackdrop` is separate from `onEscape` on purpose: a stray click on the dark
 * margin in the middle of a duel should not be able to end it.
 */
export function Overlay({
  label,
  onEscape,
  onBackdrop,
  className,
  children,
}: {
  label: string;
  onEscape: () => void;
  /** Omit to make the backdrop inert. */
  onBackdrop?: () => void;
  className: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDialog(ref, true, onEscape);

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      className={`fixed inset-0 flex items-center justify-center outline-none ${className}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onBackdrop?.();
      }}
    >
      {children}
    </div>,
    document.body
  );
}
