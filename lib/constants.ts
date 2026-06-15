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

// 8 teaching periods, with start times (for kiosk "current period" display).
export const PERIODS = [
  { value: 1, time: "08:30 - 09:20" },
  { value: 2, time: "09:20 - 10:10" },
  { value: 3, time: "10:10 - 11:00" },
  { value: 4, time: "11:00 - 11:50" },
  { value: 5, time: "12:50 - 13:40" },
  { value: 6, time: "13:40 - 14:30" },
  { value: 7, time: "14:30 - 15:20" },
  { value: 8, time: "15:20 - 16:10" },
] as const;

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
