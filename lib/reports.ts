import "server-only";
import { prisma } from "./prisma";
import { getSettings } from "./settings";
import {
  zonedMonthRange,
  zonedDayRange,
  zonedWeekday,
  zonedYMD,
} from "./time";
import type { PeriodSlot } from "./constants";

export type ReportRow = {
  teacherId: string;
  name: string;
  subject: string | null;
  sessions: number; // total check-ins
  onTime: number;
  late: number;
  lateMinutes: number; // total minutes late
  earlyLeave: number; // check-outs before period end
  leaveDays: number; // approved leave days in month
};

export type MonthlyReport = {
  month: string; // YYYY-MM
  rows: ReportRow[];
  totals: Omit<ReportRow, "teacherId" | "name" | "subject">;
};

/** Aggregate attendance + leave per teacher for a calendar month (school time). */
export async function getMonthlyReport(month: string): Promise<MonthlyReport> {
  const { gte, lt } = zonedMonthRange(month);

  const [teachers, attendances, leaves] = await Promise.all([
    prisma.teacher.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, subject: true, user: { select: { name: true } } },
    }),
    prisma.attendance.findMany({
      where: { checkIn: { gte, lt } },
      select: {
        teacherId: true,
        status: true,
        lateMinutes: true,
        earlyMinutes: true,
      },
    }),
    prisma.leave.findMany({
      where: { status: "approved", date: { gte, lt } },
      select: { teacherId: true },
    }),
  ]);

  const rowById = new Map<string, ReportRow>();
  for (const t of teachers) {
    rowById.set(t.id, {
      teacherId: t.id,
      name: t.user.name,
      subject: t.subject,
      sessions: 0,
      onTime: 0,
      late: 0,
      lateMinutes: 0,
      earlyLeave: 0,
      leaveDays: 0,
    });
  }

  for (const a of attendances) {
    const r = rowById.get(a.teacherId);
    if (!r) continue;
    r.sessions++;
    if (a.status === "late") {
      r.late++;
      r.lateMinutes += a.lateMinutes ?? 0;
    } else if (a.status === "on_time") {
      r.onTime++;
    }
    if ((a.earlyMinutes ?? 0) > 0) r.earlyLeave++;
  }

  for (const l of leaves) {
    const r = rowById.get(l.teacherId);
    if (r) r.leaveDays++;
  }

  const rows = [...rowById.values()];
  const totals = rows.reduce(
    (acc, r) => ({
      sessions: acc.sessions + r.sessions,
      onTime: acc.onTime + r.onTime,
      late: acc.late + r.late,
      lateMinutes: acc.lateMinutes + r.lateMinutes,
      earlyLeave: acc.earlyLeave + r.earlyLeave,
      leaveDays: acc.leaveDays + r.leaveDays,
    }),
    { sessions: 0, onTime: 0, late: 0, lateMinutes: 0, earlyLeave: 0, leaveDays: 0 },
  );

  return { month, rows, totals };
}

// ---------------------------------------------------------------------------
// Daily attendance grid: room x period, each cell = scheduled teacher + status
// ---------------------------------------------------------------------------

export type DailyCellStatus = "present" | "late" | "absent" | "leave" | "none";
export type DailyCell = {
  room: string;
  period: number;
  teacherName: string;
  subject: string;
  status: DailyCellStatus;
  checkIn: Date | null;
  checkOut: Date | null;
  lateMinutes: number | null;
};
export type DailyReport = {
  date: string;
  weekday: number | null;
  periods: PeriodSlot[];
  rooms: string[];
  cells: DailyCell[];
  holidayName: string | null;
  inTerm: boolean;
};

export async function getDailyReport(date: string): Promise<DailyReport> {
  const settings = await getSettings();
  // Anchor at mid-day Bangkok so the weekday/day range are unambiguous.
  const anchor = new Date(`${date}T06:00:00.000Z`);
  const weekday = zonedWeekday(anchor);
  const { gte, lte } = zonedDayRange(anchor);

  const holidayName = settings.holidays.find((h) => h.date === date)?.name ?? null;
  const inTerm =
    (!settings.termStart || date >= settings.termStart) &&
    (!settings.termEnd || date <= settings.termEnd);
  // A normal teaching day counts missing check-ins as "ขาดสอน".
  const countsAbsence = !!weekday && inTerm && !holidayName;

  if (!weekday) {
    return {
      date,
      weekday: null,
      periods: settings.periods,
      rooms: [],
      cells: [],
      holidayName,
      inTerm,
    };
  }

  const [schedules, attendances, leaves] = await Promise.all([
    prisma.schedule.findMany({
      where: {
        dayOfWeek: weekday,
        year: settings.currentYear,
        term: settings.currentTerm,
      },
      select: {
        id: true,
        room: true,
        period: true,
        subject: true,
        teacherId: true,
        teacher: { select: { user: { select: { name: true } } } },
      },
    }),
    prisma.attendance.findMany({
      where: { checkIn: { gte, lte } },
      select: {
        scheduleId: true,
        checkIn: true,
        checkOut: true,
        status: true,
        lateMinutes: true,
      },
    }),
    prisma.leave.findMany({
      where: { status: "approved", date: { gte, lte } },
      select: { teacherId: true },
    }),
  ]);

  const attBySchedule = new Map(
    attendances.filter((a) => a.scheduleId).map((a) => [a.scheduleId!, a]),
  );
  const onLeave = new Set(leaves.map((l) => l.teacherId));

  const cells: DailyCell[] = schedules.map((s) => {
    const att = attBySchedule.get(s.id);
    let status: DailyCellStatus;
    if (att) status = att.status === "late" ? "late" : "present";
    else if (onLeave.has(s.teacherId)) status = "leave";
    else status = countsAbsence ? "absent" : "none";
    return {
      room: s.room,
      period: s.period,
      teacherName: s.teacher.user.name,
      subject: s.subject,
      status,
      checkIn: att?.checkIn ?? null,
      checkOut: att?.checkOut ?? null,
      lateMinutes: att?.lateMinutes ?? null,
    };
  });

  const rooms = [...new Set(schedules.map((s) => s.room))].sort();
  return { date, weekday, periods: settings.periods, rooms, cells, holidayName, inTerm };
}

// ---------------------------------------------------------------------------
// Per-teacher monthly report incl. absences (scheduled period with no check-in)
// ---------------------------------------------------------------------------

export type AbsenceItem = { date: string; period: number; room: string; subject: string };
export type TeacherReport = {
  teacherId: string;
  name: string;
  month: string;
  expected: number; // scheduled period-instances
  present: number;
  onTime: number;
  late: number;
  lateMinutes: number;
  earlyLeave: number;
  onLeave: number; // scheduled periods skipped due to approved leave
  absent: number; // scheduled periods with no check-in and no leave
  absences: AbsenceItem[];
};

export async function getTeacherReport(
  teacherId: string,
  month: string,
): Promise<TeacherReport | null> {
  const settings = await getSettings();
  const { gte, lt } = zonedMonthRange(month);

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { id: true, user: { select: { name: true } } },
  });
  if (!teacher) return null;

  const [schedules, attendances, leaves] = await Promise.all([
    prisma.schedule.findMany({
      where: { teacherId, year: settings.currentYear, term: settings.currentTerm },
      select: { id: true, dayOfWeek: true, period: true, room: true, subject: true },
    }),
    prisma.attendance.findMany({
      where: { teacherId, checkIn: { gte, lt } },
      select: {
        scheduleId: true,
        checkIn: true,
        status: true,
        lateMinutes: true,
        earlyMinutes: true,
      },
    }),
    prisma.leave.findMany({
      where: { teacherId, status: "approved", date: { gte, lt } },
      select: { date: true },
    }),
  ]);

  // attendance keyed by scheduleId + local date
  const attByKey = new Map(
    attendances
      .filter((a) => a.scheduleId)
      .map((a) => [`${a.scheduleId}|${zonedYMD(a.checkIn!)}`, a]),
  );
  const leaveDays = new Set(leaves.map((l) => zonedYMD(l.date)));
  const holidaySet = new Set(settings.holidays.map((h) => h.date));
  const byDow = new Map<number, typeof schedules>();
  for (const s of schedules) {
    if (!byDow.has(s.dayOfWeek)) byDow.set(s.dayOfWeek, []);
    byDow.get(s.dayOfWeek)!.push(s);
  }

  const r: TeacherReport = {
    teacherId: teacher.id,
    name: teacher.user.name,
    month,
    expected: 0,
    present: 0,
    onTime: 0,
    late: 0,
    lateMinutes: 0,
    earlyLeave: 0,
    onLeave: 0,
    absent: 0,
    absences: [],
  };

  // Iterate each calendar day in the month.
  const start = new Date(gte);
  for (let d = new Date(start); d < lt; d.setUTCDate(d.getUTCDate() + 1)) {
    const ymd = zonedYMD(d);
    const dow = zonedWeekday(d);
    if (!dow) continue;
    // Skip days outside the term or on holidays — no class is "expected" then.
    if (settings.termStart && ymd < settings.termStart) continue;
    if (settings.termEnd && ymd > settings.termEnd) continue;
    if (holidaySet.has(ymd)) continue;
    const daySchedules = byDow.get(dow) ?? [];
    for (const s of daySchedules) {
      r.expected++;
      const att = attByKey.get(`${s.id}|${ymd}`);
      if (att) {
        r.present++;
        if (att.status === "late") {
          r.late++;
          r.lateMinutes += att.lateMinutes ?? 0;
        } else if (att.status === "on_time") {
          r.onTime++;
        }
        if ((att.earlyMinutes ?? 0) > 0) r.earlyLeave++;
      } else if (leaveDays.has(ymd)) {
        r.onLeave++;
      } else {
        r.absent++;
        r.absences.push({ date: ymd, period: s.period, room: s.room, subject: s.subject });
      }
    }
  }

  return r;
}

// ---------------------------------------------------------------------------
// Leave report for a month
// ---------------------------------------------------------------------------

export type LeaveReportItem = {
  id: string;
  teacherName: string;
  date: Date;
  type: string;
  status: string;
  substituteCount: number;
};
export type LeaveReport = {
  month: string;
  items: LeaveReportItem[];
};

export async function getLeaveReport(month: string): Promise<LeaveReport> {
  const { gte, lt } = zonedMonthRange(month);
  const leaves = await prisma.leave.findMany({
    where: { date: { gte, lt } },
    orderBy: { date: "asc" },
    select: {
      id: true,
      date: true,
      type: true,
      status: true,
      teacher: { select: { user: { select: { name: true } } } },
      _count: { select: { substitutions: true } },
    },
  });
  return {
    month,
    items: leaves.map((l) => ({
      id: l.id,
      teacherName: l.teacher.user.name,
      date: l.date,
      type: l.type,
      status: l.status,
      substituteCount: l._count.substitutions,
    })),
  };
}
