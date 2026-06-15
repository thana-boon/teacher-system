import { redirect } from "next/navigation";
import { getSessionWithRole } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getLeaveReport } from "@/lib/reports";
import { THAI_MONTHS, leaveTypeLabel, LEAVE_STATUS, formatThaiDate } from "@/lib/constants";
import PrintHeader from "@/components/PrintHeader";

export const dynamic = "force-dynamic";

function thaiMonthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return `${THAI_MONTHS[m - 1]} พ.ศ. ${y + 543}`;
}

export default async function LeavesPrint({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  if (!(await getSessionWithRole("admin"))) redirect("/login");
  const { month: mp } = await searchParams;
  const now = new Date();
  const month =
    mp && /^\d{4}-\d{2}$/.test(mp)
      ? mp
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [report, settings] = await Promise.all([getLeaveReport(month), getSettings()]);

  return (
    <div className="mx-auto max-w-4xl bg-white p-8 text-black">
      <PrintHeader
        schoolName={settings.schoolName}
        logoBase64={settings.logoBase64}
        title="รายงานการลา"
        subtitle={`ประจำเดือน ${thaiMonthLabel(month)}`}
      />
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 p-2 text-left">ครู</th>
            <th className="border border-gray-400 p-2 text-left">วันที่</th>
            <th className="border border-gray-400 p-2">ประเภท</th>
            <th className="border border-gray-400 p-2">สถานะ</th>
            <th className="border border-gray-400 p-2">สอนแทน(คาบ)</th>
          </tr>
        </thead>
        <tbody>
          {report.items.length === 0 ? (
            <tr>
              <td colSpan={5} className="border border-gray-400 p-4 text-center">
                ไม่มีการลาในเดือนนี้
              </td>
            </tr>
          ) : (
            report.items.map((l) => (
              <tr key={l.id}>
                <td className="border border-gray-400 p-2">{l.teacherName}</td>
                <td className="border border-gray-400 p-2">{formatThaiDate(l.date)}</td>
                <td className="border border-gray-400 p-2 text-center">{leaveTypeLabel(l.type)}</td>
                <td className="border border-gray-400 p-2 text-center">
                  {LEAVE_STATUS[l.status]?.label ?? l.status}
                </td>
                <td className="border border-gray-400 p-2 text-center">{l.substituteCount || "-"}</td>
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
