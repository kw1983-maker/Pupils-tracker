export function Donut({
  percentage,
  size = 120,
  stroke = 12,
  color = "var(--color-brand-500)",
  trackColor = "var(--color-brand-200)",
  label,
  sub,
}: {
  percentage: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  sub?: string;
}) {
  const pct = Math.max(0, Math.min(100, percentage));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      role="img"
      aria-label={`${pct}%${sub ? ` ${sub}` : ""}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition:
              "stroke-dashoffset var(--duration-draw) var(--ease-out-paper)",
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center text-center">
        <span className="font-display text-xl font-semibold text-paper-800">
          {label ?? `${pct}%`}
        </span>
        {sub && <span className="text-2xs text-paper-400">{sub}</span>}
      </div>
    </div>
  );
}
