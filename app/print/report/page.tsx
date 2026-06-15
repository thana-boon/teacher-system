import { redirect } from "next/navigation";
import { getSessionWithRole } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getMonthlyReport } from "@/lib/reports";
import AutoPrint from "@/components/AutoPrint";

export const dynamic = "force-dynamic";

function thaiMonth(ym: string) {
  return new Date(`${ym}-01T00:00:00`).toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric",
  });
}

export default async function ReportPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await getSessionWithRole("admin");
  if (!session) redirect("/login");

  const { month: monthParam } = await searchParams;
  const now = new Date();
  const month =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam)
      ? monthParam
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [report, settings] = await Promise.all([
    getMonthlyReport(month),
    getSettings(),
  ]);

  return (
    <div className="mx-auto max-w-4xl bg-white p-8 text-black">
      <AutoPrint />

      {/* Toolbar (hidden when printing) */}
      <div className="mb-4 flex justify-end print:hidden">
        <a href="/admin/reports" className="text-sm text-blue-600 underline">
          ← กลับไปหน้ารายงาน
        </a>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-center gap-4 border-b-2 border-black pb-4">
        {settings.logoBase64 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.logoBase64} alt="โลโก้" className="h-16 w-16 object-contain" />
        ) : null}
        <div>
          <div className="text-2xl font-bold">{settings.schoolName}</div>
          <div className="text-lg">รายงานการเช็คชื่อและการลา</div>
          <div className="text-base">ประจำเดือน {thaiMonth(month)}</div>
        </div>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 p-2 text-left">ครู</th>
            <th className="border border-gray-400 p-2 text-left">วิชา</th>
            <th className="border border-gray-400 p-2">เช็คชื่อ</th>
            <th className="border border-gray-400 p-2">ตรงเวลา</th>
            <th className="border border-gray-400 p-2">สาย</th>
            <th className="border border-gray-400 p-2">นาทีสาย</th>
            <th className="border border-gray-400 p-2">ออกก่อน</th>
            <th className="border border-gray-400 p-2">ลา(วัน)</th>
          </tr>
        </thead>
        <tbody>
          {report.rows.map((r) => (
            <tr key={r.teacherId}>
              <td className="border border-gray-400 p-2">{r.name}</td>
              <td className="border border-gray-400 p-2">{r.subject ?? "-"}</td>
              <td className="border border-gray-400 p-2 text-center">{r.sessions}</td>
              <td className="border border-gray-400 p-2 text-center">{r.onTime}</td>
              <td className="border border-gray-400 p-2 text-center">{r.late}</td>
              <td className="border border-gray-400 p-2 text-center">{r.lateMinutes}</td>
              <td className="border border-gray-400 p-2 text-center">{r.earlyLeave}</td>
              <td className="border border-gray-400 p-2 text-center">{r.leaveDays}</td>
            </tr>
          ))}
          <tr className="bg-gray-100 font-bold">
            <td className="border border-gray-400 p-2" colSpan={2}>
              รวม
            </td>
            <td className="border border-gray-400 p-2 text-center">{report.totals.sessions}</td>
            <td className="border border-gray-400 p-2 text-center">{report.totals.onTime}</td>
            <td className="border border-gray-400 p-2 text-center">{report.totals.late}</td>
            <td className="border border-gray-400 p-2 text-center">{report.totals.lateMinutes}</td>
            <td className="border border-gray-400 p-2 text-center">{report.totals.earlyLeave}</td>
            <td className="border border-gray-400 p-2 text-center">{report.totals.leaveDays}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-8 flex justify-between text-sm text-gray-600">
        <span>พิมพ์เมื่อ {now.toLocaleString("th-TH")}</span>
        <span>ผู้พิมพ์: {session.name}</span>
      </div>
    </div>
  );
}
