import { redirect } from "next/navigation";
import { getSessionWithRole } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getTeacherReport } from "@/lib/reports";
import { THAI_MONTHS, formatThaiDate } from "@/lib/constants";
import PrintHeader from "@/components/PrintHeader";

export const dynamic = "force-dynamic";

function thaiMonthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return `${THAI_MONTHS[m - 1]} พ.ศ. ${y + 543}`;
}

export default async function TeacherPrint({
  searchParams,
}: {
  searchParams: Promise<{ teacherId?: string; month?: string }>;
}) {
  if (!(await getSessionWithRole("admin"))) redirect("/login");
  const { teacherId, month: mp } = await searchParams;
  const now = new Date();
  const month =
    mp && /^\d{4}-\d{2}$/.test(mp)
      ? mp
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const settings = await getSettings();
  const report = teacherId ? await getTeacherReport(teacherId, month) : null;

  if (!report) {
    return <div className="p-8">ไม่พบข้อมูลครู</div>;
  }

  const stats: [string, number][] = [
    ["คาบที่ต้องสอน", report.expected],
    ["เข้าสอน", report.present],
    ["ตรงเวลา", report.onTime],
    ["สาย", report.late],
    ["ออกก่อน", report.earlyLeave],
    ["ลา", report.onLeave],
    ["ขาดสอน", report.absent],
  ];

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-black">
      <PrintHeader
        schoolName={settings.schoolName}
        logoBase64={settings.logoBase64}
        title="รายงานการเข้าสอนรายบุคคล"
        subtitle={`${report.name} — ${thaiMonthLabel(month)}`}
      />

      <table className="mb-6 w-full border-collapse text-sm">
        <tbody>
          {stats.map(([label, value]) => (
            <tr key={label}>
              <td className="border border-gray-400 p-2">{label}</td>
              <td className="border border-gray-400 p-2 text-center font-semibold">{value}</td>
            </tr>
          ))}
          <tr>
            <td className="border border-gray-400 p-2">รวมเวลาสาย (นาที)</td>
            <td className="border border-gray-400 p-2 text-center font-semibold">
              {report.lateMinutes}
            </td>
          </tr>
        </tbody>
      </table>

      <h3 className="mb-2 font-bold">รายการขาดสอน ({report.absent})</h3>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 p-2 text-left">วันที่</th>
            <th className="border border-gray-400 p-2">คาบ</th>
            <th className="border border-gray-400 p-2">ห้อง</th>
            <th className="border border-gray-400 p-2 text-left">วิชา</th>
          </tr>
        </thead>
        <tbody>
          {report.absences.length === 0 ? (
            <tr>
              <td colSpan={4} className="border border-gray-400 p-4 text-center">
                ไม่มีการขาดสอน
              </td>
            </tr>
          ) : (
            report.absences.map((a, i) => (
              <tr key={i}>
                <td className="border border-gray-400 p-2">{formatThaiDate(`${a.date}T00:00:00`)}</td>
                <td className="border border-gray-400 p-2 text-center">{a.period}</td>
                <td className="border border-gray-400 p-2 text-center">{a.room}</td>
                <td className="border border-gray-400 p-2">{a.subject}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="mt-8 text-right text-sm text-gray-600">
        พิมพ์เมื่อ {now.toLocaleString("th-TH")}
      </div>
    </div>
  );
}
