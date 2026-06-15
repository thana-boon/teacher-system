import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatThaiDate, formatThaiTime, leaveTypeLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export default async function AdminDashboard() {
  const today = { gte: startOfToday(), lte: endOfToday() };

  const [teacherCount, checkInsToday, pendingLeaves, leavesToday, recentPending, recentCheckIns] =
    await Promise.all([
      prisma.teacher.count(),
      prisma.attendance.count({ where: { checkIn: today } }),
      prisma.leave.count({ where: { status: "pending" } }),
      prisma.leave.count({ where: { status: "approved", date: today } }),
      prisma.leave.findMany({
        where: { status: "pending" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          date: true,
          type: true,
          reason: true,
          teacher: { select: { user: { select: { name: true } } } },
        },
      }),
      prisma.attendance.findMany({
        where: { checkIn: today },
        orderBy: { checkIn: "desc" },
        take: 5,
        select: {
          id: true,
          checkIn: true,
          checkOut: true,
          method: true,
          teacher: { select: { user: { select: { name: true } } } },
          schedule: { select: { room: true, subject: true } },
        },
      }),
    ]);

  const stats = [
    { label: "ครูทั้งหมด", value: teacherCount, icon: "👩‍🏫", color: "text-primary" },
    { label: "เช็คชื่อวันนี้", value: checkInsToday, icon: "✅", color: "text-success" },
    { label: "รออนุมัติการลา", value: pendingLeaves, icon: "⏳", color: "text-warning" },
    { label: "ลาวันนี้", value: leavesToday, icon: "🏖️", color: "text-info" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ภาพรวม</h1>
        <p className="text-base-content/60">{formatThaiDate(new Date())}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card bg-base-100 shadow">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-base-content/60">{s.label}</span>
                <span className="text-2xl">{s.icon}</span>
              </div>
              <span className={`text-3xl font-bold ${s.color}`}>{s.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending leaves */}
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <h2 className="card-title text-lg">การลารออนุมัติ</h2>
              <Link href="/admin/leaves" className="link link-primary text-sm">
                ดูทั้งหมด
              </Link>
            </div>
            {recentPending.length === 0 ? (
              <p className="py-4 text-center text-base-content/50">ไม่มีรายการรออนุมัติ</p>
            ) : (
              <ul className="divide-y divide-base-200">
                {recentPending.map((l) => (
                  <li key={l.id} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium">{l.teacher.user.name}</div>
                      <div className="text-sm text-base-content/60">
                        {leaveTypeLabel(l.type)} · {formatThaiDate(l.date)}
                      </div>
                    </div>
                    <span className="badge badge-warning badge-sm">รออนุมัติ</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recent check-ins */}
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title text-lg">การเช็คชื่อล่าสุดวันนี้</h2>
            {recentCheckIns.length === 0 ? (
              <p className="py-4 text-center text-base-content/50">ยังไม่มีการเช็คชื่อวันนี้</p>
            ) : (
              <ul className="divide-y divide-base-200">
                {recentCheckIns.map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium">{a.teacher.user.name}</div>
                      <div className="text-sm text-base-content/60">
                        {a.schedule
                          ? `${a.schedule.room} · ${a.schedule.subject}`
                          : "—"}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-success">เข้า {formatThaiTime(a.checkIn)}</div>
                      {a.checkOut && (
                        <div className="text-base-content/50">ออก {formatThaiTime(a.checkOut)}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
