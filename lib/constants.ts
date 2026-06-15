// Shared domain labels and helpers (Thai UI).

export const DAYS = [
  { value: 1, label: "จันทร์", short: "จ." },
  { value: 2, label: "อังคาร", short: "อ." },
  { value: 3, label: "พุธ", short: "พ." },
  { value: 4, label: "พฤหัสบดี", short: "พฤ." },
  { value: 5, label: "ศุกร์", short: "ศ." },
] as const;

export function dayLabel(day: number): string {
  return DAYS.find((d) => d.value === day)?.label ?? "-";
}

// A teaching period and its time window. The actual list is configurable per
// site (see lib/settings.ts / the admin settings page); this is the fallback.
export type PeriodSlot = { period: number; start: string; end: string };

export const DEFAULT_PERIODS: PeriodSlot[] = [
  { period: 1, start: "08:30", end: "09:20" },
  { period: 2, start: "09:20", end: "10:10" },
  { period: 3, start: "10:10", end: "11:00" },
  { period: 4, start: "11:00", end: "11:50" },
  { period: 5, start: "12:50", end: "13:40" },
  { period: 6, start: "13:40", end: "14:30" },
  { period: 7, start: "14:30", end: "15:20" },
  { period: 8, start: "15:20", end: "16:10" },
];

export function periodTime(p: PeriodSlot): string {
  return `${p.start} - ${p.end}`;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** The period whose time window contains `date` (local time), or null. */
export function currentPeriod(
  periods: PeriodSlot[],
  date: Date = new Date(),
): PeriodSlot | null {
  const now = date.getHours() * 60 + date.getMinutes();
  return periods.find((p) => now >= toMinutes(p.start) && now <= toMinutes(p.end)) ?? null;
}

/** JS getDay() (0=Sun..6=Sat) -> our dayOfWeek (1..5 = Mon..Fri), else null. */
export function weekdayOf(date: Date = new Date()): number | null {
  const d = date.getDay();
  return d >= 1 && d <= 5 ? d : null;
}

export const LEAVE_TYPES = [
  { value: "sick", label: "ลาป่วย" },
  { value: "personal", label: "ลากิจ" },
  { value: "other", label: "อื่น ๆ" },
] as const;

export function leaveTypeLabel(type: string): string {
  return LEAVE_TYPES.find((t) => t.value === type)?.label ?? type;
}

export const LEAVE_STATUS: Record<
  string,
  { label: string; badge: string }
> = {
  pending: { label: "รออนุมัติ", badge: "badge-warning" },
  approved: { label: "อนุมัติแล้ว", badge: "badge-success" },
  rejected: { label: "ไม่อนุมัติ", badge: "badge-error" },
};

const THAI_DATE = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "long",
});
const THAI_TIME = new Intl.DateTimeFormat("th-TH", {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatThaiDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  return THAI_DATE.format(new Date(d));
}

export function formatThaiTime(d: Date | string | null | undefined): string {
  if (!d) return "-";
  return THAI_TIME.format(new Date(d));
}
