// School-timezone helpers. Vercel runs in UTC, but periods/dates are in local
// school time, so all "what day / what minute is it" logic must be zone-aware.
// Thailand (Asia/Bangkok) is UTC+7 year-round (no DST).

export const SCHOOL_TZ = "Asia/Bangkok";
const OFFSET = "+07:00";

function zonedParts(date: Date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHOOL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const p = Object.fromEntries(
    fmt.formatToParts(date).map((x) => [x.type, x.value]),
  ) as Record<string, string>;
  return p;
}

/** "YYYY-MM-DD" for the given instant in school time. */
export function zonedYMD(date: Date = new Date()): string {
  const p = zonedParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Minutes since midnight in school time (e.g. 08:30 -> 510). */
export function zonedMinutes(date: Date = new Date()): number {
  const p = zonedParts(date);
  let h = Number(p.hour);
  if (h === 24) h = 0; // some runtimes emit "24" at midnight
  return h * 60 + Number(p.minute);
}

/** dayOfWeek 1..5 (Mon..Fri) in school time, or null on weekends. */
export function zonedWeekday(date: Date = new Date()): number | null {
  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 0,
  };
  const w = map[zonedParts(date).weekday];
  return w >= 1 && w <= 5 ? w : null;
}

/** UTC Date bounds for the school-local day containing `date`. */
export function zonedDayRange(date: Date = new Date()): { gte: Date; lte: Date } {
  const ymd = zonedYMD(date);
  return {
    gte: new Date(`${ymd}T00:00:00.000${OFFSET}`),
    lte: new Date(`${ymd}T23:59:59.999${OFFSET}`),
  };
}

/** "HH:MM" -> minutes since midnight. */
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** UTC bounds for a calendar month ("YYYY-MM") in school time. `lt` is exclusive. */
export function zonedMonthRange(ym: string): { gte: Date; lt: Date } {
  const [y, m] = ym.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return {
    gte: new Date(`${ym}-01T00:00:00.000${OFFSET}`),
    lt: new Date(`${next}-01T00:00:00.000${OFFSET}`),
  };
}
