import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/auth";
import {
  DAYS,
  periodTime,
  formatThaiDate,
  formatThaiTime,
} from "@/lib/constants";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { gte: start, lte: end };
}

function weekRange() {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // 0 = Monday
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { gte: start, lte: end };
}

export default async function TeacherDashboard() {
  const session = await getSessionWithRole("teacher");
  if (!session?.teacherId) redirect("/login");

  const jsDay = new Date().getDay(); // 0=Sun..6=Sat
  const todayDow = jsDay === 0 || jsDay === 6 ? null : jsDay; // 1..5 weekdays
  const today = todayRange();
  const week = weekRange();

  const [todaySchedules, todayAttendance, weekCheckIns, pendingLeaves, settings] =
    await Promise.all([
      todayDow
        ? prisma.schedule.findMany({
            where: { teacherId: session.teacherId, dayOfWeek: todayDow },
            orderBy: { period: "asc" },
            select: { id: true, period: true, room: true, subject: true },
          })
        : Promise.resolve([]),
      prisma.attendance.findMany({
        where: { teacherId: session.teacherId, checkIn: today },
        select: { scheduleId: true, checkIn: true, checkOut: true },
      }),
      prisma.attendance.count({
        where: { teacherId: session.teacherId, checkIn: week },
      }),
      prisma.leave.count({
        where: { teacherId: session.teacherId, status: "pending" },
      }),
      getSettings(),
    ]);

  const attBySchedule = new Map(
    todayAttendance.filter((a) => a.scheduleId).map((a) => [a.scheduleId!, a]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">สวัสดี, {session.name} 🦆</h1>
        <p className="text-base-content/60">{formatThaiDate(new Date())}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="card bg-base-100 shadow">
          <div className="card-body p-4">
            <span className="text-sm text-base-content/60">คาบสอนวันนี้</span>
            <span className="text-3xl font-bold text-primary">
              {todaySchedules.length}
            </span>
          </div>
        </div>
        <div className="card bg-base-100 shadow">
          <div className="card-body p-4">
            <span className="text-sm text-base-content/60">เช็คชื่อสัปดาห์นี้</span>
            <span className="text-3xl font-bold text-success">{weekCheckIns}</span>
          </div>
        </div>
        <div className="card bg-base-100 shadow">
          <div className="card-body p-4">
            <span className="text-sm text-base-content/60">ลารออนุมัติ</span>
            <span className="text-3xl font-bold text-warning">{pendingLeaves}</span>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-lg">
              ตารางสอนวันนี้
              {todayDow && (
                <span className="text-base font-normal text-base-content/60">
                  (วัน{DAYS.find((d) => d.value === todayDow)?.label})
                </span>
              )}
            </h2>
            <Link href="/teacher/schedule" className="link link-primary text-sm">
              ดูทั้งสัปดาห์
            </Link>
          </div>

          {!todayDow ? (
            <p className="py-6 text-center text-base-content/50">
              วันนี้เป็นวันหยุด ไม่มีคาบสอน 🎉
            </p>
          ) : todaySchedules.length === 0 ? (
            <p className="py-6 text-center text-base-content/50">
              วันนี้ไม่มีคาบสอน
            </p>
          ) : (
            <ul className="divide-y divide-base-200">
              {todaySchedules.map((s) => {
                const att = attBySchedule.get(s.id);
                const period = settings.periods.find((p) => p.period === s.period);
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <span className="text-xs">คาบ</span>
                        <span className="text-lg font-bold leading-none">
                          {s.period}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">
                          {s.subject} · {s.room}
                        </div>
                        <div className="text-sm text-base-content/60">
                          {period ? periodTime(period) : ""}
                        </div>
                      </div>
                    </div>
                    {att ? (
                      <div className="text-right text-sm">
                        <span className="badge badge-success badge-sm">
                          เช็คชื่อแล้ว
                        </span>
                        <div className="text-base-content/50">
                          {formatThaiTime(att.checkIn)}
                          {att.checkOut && ` - ${formatThaiTime(att.checkOut)}`}
                        </div>
                      </div>
                    ) : (
                      <span className="badge badge-ghost badge-sm">
                        ยังไม่เช็คชื่อ
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
