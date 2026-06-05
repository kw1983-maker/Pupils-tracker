import { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      {icon && (
        <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-paper-100 text-paper-400">
          {icon}
        </div>
      )}
      <p className="font-display text-lg font-semibold text-paper-600">
        {title}
      </p>
      {children && (
        <p className="max-w-sm text-sm text-paper-400">{children}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
