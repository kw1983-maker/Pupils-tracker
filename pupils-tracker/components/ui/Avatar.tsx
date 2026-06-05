const SIZES = {
  sm: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-2xl",
} as const;

export function Avatar({
  name,
  size = "sm",
  decorative = true,
}: {
  name: string;
  size?: keyof typeof SIZES;
  decorative?: boolean;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-display font-bold text-brand-700 ${SIZES[size]}`}
      aria-hidden={decorative}
      aria-label={decorative ? undefined : name}
    >
      {initial}
    </div>
  );
}
