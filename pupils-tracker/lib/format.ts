// Display a stored ISO date (YYYY-MM-DD) as DD-MM-YYYY. Dates are kept in ISO
// internally so they sort correctly; this is for presentation only.
export function formatDMY(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}
