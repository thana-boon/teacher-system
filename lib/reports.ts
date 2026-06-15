import "server-only";
import { prisma } from "./prisma";
import { zonedMonthRange } from "./time";

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
