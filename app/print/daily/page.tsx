import { redirect } from "next/navigation";
import { getSessionWithRole } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getDailyReport } from "@/lib/reports";
import { dayLabel, formatThaiDate, formatThaiTime } from "@/lib/constants";
import PrintHeader from "@/components/PrintHeader";

export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = {
  present: "เข้าสอน",
  late: "สาย",
  absent: "ขาดสอน",
  leave: "ลา",
  none: "-",
};

export default async function DailyPrint({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  if (!(await getSessionWithRole("admin"))) redirect("/login");
  const { date: dp } = await searchParams;
  const now = new Date();
  const date =
    dp && /^\d{4}-\d{2}-\d{2}$/.test(dp)
      ? dp
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const [report, settings] = await Promise.all([getDailyReport(date), getSettings()]);
  const cellAt = (room: string, period: number) =>
    report.cells.find((c) => c.room === room && c.period === period);

  return (
    <div className="mx-auto max-w-5xl bg-white p-8 text-black">
      <PrintHeader
        schoolName={settings.schoolName}
        logoBase64={settings.logoBase64}
        title="ตารางการเข้าสอนรายวัน"
        subtitle={`วัน${report.weekday ? dayLabel(report.weekday) + "ที่ " : ""}${formatThaiDate(`${date}T00:00:00`)}${report.holidayName ? ` (วันหยุด: ${report.holidayName})` : ""}`}
      />

      {report.weekday === null ? (
        <p className="text-center">วันหยุดสุดสัปดาห์ ไม่มีคาบสอน</p>
      ) : report.rooms.length === 0 ? (
        <p className="text-center">ไม่มีตารางสอนในวันนี้</p>
      ) : (
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 p-1">ห้อง \ คาบ</th>
              {report.periods.map((p) => (
                <th key={p.period} className="border border-gray-400 p-1">
                  คาบ {p.period}
                  <div className="font-normal">{p.start}-{p.end}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.rooms.map((room) => (
              <tr key={room}>
                <td className="border border-gray-400 p-1 text-center font-semibold">{room}</td>
                {report.periods.map((p) => {
                  const c = cellAt(room, p.period);
                  if (!c)
                    return (
                      <td key={p.period} className="border border-gray-400 p-1 text-center text-gray-300">
                        -
                      </td>
                    );
                  return (
                    <td key={p.period} className="border border-gray-400 p-1 align-top">
                      <div className="font-medium">{c.teacherName}</div>
                      <div className="text-gray-500">{c.subject}</div>
                      <div>
                        {LABEL[c.status]}
                        {c.status === "late" && c.lateMinutes ? ` ${c.lateMinutes}'` : ""}
                      </div>
                      {c.checkIn && (
                        <div className="text-gray-500">
                          {formatThaiTime(c.checkIn)}
                          {c.checkOut ? `-${formatThaiTime(c.checkOut)}` : ""}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-8 text-right text-sm text-gray-600">
        พิมพ์เมื่อ {now.toLocaleString("th-TH")}
      </div>
    </div>
  );
}
