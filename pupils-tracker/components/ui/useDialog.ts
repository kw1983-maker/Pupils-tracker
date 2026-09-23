"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Open dialogs, innermost last. Only the top one answers Escape and Tab —
 * otherwise a quiz opened over the pet modal closed both on one Escape, and the
 * two focus traps fought over every Tab.
 */
const stack: symbol[] = [];

/**
 * Dialog behaviour shared by `Modal` and the full-screen pet overlays: Escape to
 * close, a focus trap, focus restored on close, and the page behind locked from
 * scrolling.
 *
 * Runs once per open. `onEscape` is read through a ref, because callers pass an
 * inline arrow: keying the effect on it re-ran the whole thing on every parent
 * render, which threw focus back to the page and then onto the close button
 * after each click inside the dialog.
 */
export function useDialog(
  ref: RefObject<HTMLElement | null>,
  isOpen: boolean,
  onEscape: () => void
) {
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!isOpen) return;
    const id = Symbol("dialog");
    stack.push(id);
    const isTop = () => stack[stack.length - 1] === id;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>("[autofocus]") ??
      el?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? el)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isTop()) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onEscapeRef.current();
        return;
      }
      if (e.key === "Tab" && el) {
        const items = el.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (items.length === 0) return;
        const head = items[0];
        const tail = items[items.length - 1];
        if (!el.contains(document.activeElement)) {
          e.preventDefault();
          head.focus();
        } else if (e.shiftKey && document.activeElement === head) {
          e.preventDefault();
          tail.focus();
        } else if (!e.shiftKey && document.activeElement === tail) {
          e.preventDefault();
          head.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const at = stack.indexOf(id);
      if (at >= 0) stack.splice(at, 1);
      // The outermost dialog restores the page's own value; an inner one leaves
      // the lock its parent still needs.
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen, ref]);
}
