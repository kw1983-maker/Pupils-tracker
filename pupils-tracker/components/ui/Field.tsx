import { ReactNode } from "react";

/** Shared control styling (inputs, selects, textareas). Add `w-full` where needed. */
export const fieldClassName =
  "rounded-sm border border-paper-200 p-2 text-sm outline-none focus:border-brand-400 focus:shadow-ring";

/** Optional eyebrow label + control wrapper. */
export function Field({
  label,
  htmlFor,
  children,
  className = "",
}: {
  label?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="mb-1 block text-2xs font-bold uppercase tracking-wider text-paper-400"
        >
          {label}
        </label>
      )}
      {children}
    </div>
  );
}
