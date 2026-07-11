import { ReactNode } from "react";

export type Status = "success" | "warning" | "danger" | "info" | "neutral";

const STATUS: Record<Status, string> = {
  success: "bg-success-bg text-success-ink",
  warning: "bg-warning-bg text-warning-ink",
  danger: "bg-danger-bg text-danger-ink",
  info: "bg-info-bg text-info-ink",
  neutral: "bg-paper-100 text-paper-600",
};

export function StatusPill({
  status,
  icon,
  children,
  className = "",
}: {
  status: Status;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS[status]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}
