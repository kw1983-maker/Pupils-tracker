import { ReactNode } from "react";

export type Status = "success" | "warning" | "danger" | "info" | "neutral";

const STATUS: Record<Status, string> = {
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
  neutral: "bg-paper-100 text-paper-400",
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
