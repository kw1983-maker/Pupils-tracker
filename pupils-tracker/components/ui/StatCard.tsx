import { ReactNode } from "react";

type Tone = "brand" | "success" | "warning" | "danger" | "info";

const TONES: Record<Tone, string> = {
  brand: "bg-brand-100 text-brand-700",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
};

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = "brand",
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="card flex items-center gap-4 p-5">
      {icon && (
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${TONES[tone]}`}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-2xs font-bold uppercase tracking-wider text-paper-400">
          {label}
        </p>
        <p className="truncate font-display text-2xl font-semibold tabular-nums text-paper-800">
          {value}
        </p>
        {sub && <p className="text-xs text-paper-400">{sub}</p>}
      </div>
    </div>
  );
}
