import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/auth";
import { DAYS, periodTime } from "@/lib/constants";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function TeacherSchedule() {
  const session = await getSessionWithRole("teacher");
  if (!session?.teacherId) redirect("/login");

  const [schedules, settings] = await Promise.all([
    prisma.schedule.findMany({
      where: { teacherId: session.teacherId },
      select: { dayOfWeek: true, period: true, room: true, subject: true },
    }),
    getSettings(),
  ]);
  const periods = settings.periods;

  const at = (day: number, period: number) =>
    schedules.find((s) => s.dayOfWeek === day && s.period === period);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">ตารางสอนของฉัน</h1>

      <div className="card bg-base-100 shadow">
        <div className="card-body p-2 sm:p-4">
          <div className="overflow-x-auto">
            <table className="table-sm table border-collapse text-center">
              <thead>
                <tr>
                  <th className="bg-base-200">คาบ</th>
                  {DAYS.map((d) => (
                    <th key={d.value} className="bg-base-200">
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr key={p.period}>
                    <td className="bg-base-200 text-xs font-semibold">
                      <div>คาบ {p.period}</div>
                      <div className="font-normal text-base-content/50">
                        {periodTime(p)}
                      </div>
                    </td>
                    {DAYS.map((d) => {
                      const c = at(d.value, p.period);
                      return (
                        <td key={d.value} className="p-1">
                          {c ? (
                            <div className="rounded-lg bg-primary/10 px-2 py-2 text-primary">
                              <div className="font-semibold">{c.room}</div>
                              <div className="text-xs opacity-80">{c.subject}</div>
                            </div>
                          ) : (
                            <span className="text-base-content/20">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
