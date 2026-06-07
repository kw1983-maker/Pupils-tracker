import { Class, AttendanceStatus, Attendance, Pupil } from "./types";
import { formatDMY } from "./format";

// Minimal shape this helper needs from each class's data slice (lib/store.tsx).
interface ClassDataLike {
  pupils: Pupil[];
  attendance: Attendance;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  late: "Late",
  absent: "Absent",
};

// Pad a number to two digits for ISO date assembly.
const pad = (n: number) => String(n).padStart(2, "0");

const toISO = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Monday (ISO) of the week containing the given YYYY-MM-DD date. Parse as a LOCAL
// date — `new Date("YYYY-MM-DD")` is treated as UTC and would drift across the day
// boundary in non-UTC zones.
export function mondayOf(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dow = date.getDay(); // 0 = Sun … 6 = Sat
  const diff = dow === 0 ? -6 : 1 - dow; // shift back to Monday
  date.setDate(date.getDate() + diff);
  return toISO(date);
}

// The five Mon→Fri ISO dates of the week containing `iso`.
function weekdaysOf(iso: string): string[] {
  const [y, m, d] = mondayOf(iso).split("-").map(Number);
  return WEEKDAY_LABELS.map((_, i) => {
    const date = new Date(y, m - 1, d + i);
    return toISO(date);
  });
}

// Build a single-sheet .xlsx with every class's Mon–Fri attendance stacked under
// its own heading, then trigger a browser download.
export async function exportWeeklyAttendanceWorkbook(
  classes: Class[],
  data: Record<string, ClassDataLike>,
  weekDateISO: string
): Promise<void> {
  const XLSX = await import("xlsx");
  const days = weekdaysOf(weekDateISO);
  const monday = days[0];
  const friday = days[4];

  const header = [
    "Pupil",
    ...WEEKDAY_LABELS.map((label, i) => `${label} ${formatDMY(days[i])}`),
  ];

  const aoa: (string | number)[][] = [
    [`Attendance — week of ${formatDMY(monday)} to ${formatDMY(friday)}`],
    [],
  ];

  classes.forEach((c) => {
    const cd = data[c.id];
    const pupils = cd?.pupils ?? [];
    const attendance = cd?.attendance ?? {};

    aoa.push([c.name]);
    aoa.push(header);
    pupils.forEach((p) => {
      aoa.push([
        p.name,
        ...days.map((day) => {
          const status = attendance[day]?.[p.id];
          return status ? STATUS_LABEL[status] : "—";
        }),
      ]);
    });
    aoa.push([]); // spacer row between classes
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Widen the pupil-name column and give the day columns a uniform width.
  ws["!cols"] = [{ wch: 24 }, ...WEEKDAY_LABELS.map(() => ({ wch: 14 }))];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  XLSX.writeFile(wb, `Attendance_Week_${monday}_to_${friday}.xlsx`);
}
