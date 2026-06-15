"use client";

import { useEffect, useState, useCallback } from "react";

type Row = {
  teacherId: string;
  name: string;
  subject: string | null;
  sessions: number;
  onTime: number;
  late: number;
  lateMinutes: number;
  earlyLeave: number;
  leaveDays: number;
};
type Report = { month: string; rows: Row[]; totals: Omit<Row, "teacherId" | "name" | "subject"> };

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function thaiMonth(ym: string) {
  return new Date(`${ym}-01T00:00:00`).toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric",
  });
}

export default function ReportsPage() {
  const [month, setMonth] = useState(currentMonth());
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/reports?month=${month}`);
    if (res.ok) setReport(await res.json());
    setLoading(false);
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  function exportCsv() {
    if (!report) return;
    const header = [
      "ครู",
      "วิชา",
      "เช็คชื่อ(ครั้ง)",
      "ตรงเวลา",
      "สาย",
      "รวมนาทีสาย",
      "ออกก่อน",
      "ลา(วัน)",
    ];
    const lines = report.rows.map((r) =>
      [r.name, r.subject ?? "", r.sessions, r.onTime, r.late, r.lateMinutes, r.earlyLeave, r.leaveDays]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = "﻿" + [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `รายงาน-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    window.open(`/print/report?month=${month}`, "_blank");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">รายงาน</h1>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            className="input input-bordered input-sm"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <button className="btn btn-outline btn-sm" onClick={exportCsv} disabled={!report}>
            ⬇️ Excel (CSV)
          </button>
          <button className="btn btn-primary btn-sm" onClick={exportPdf} disabled={!report}>
            🖨️ PDF
          </button>
        </div>
      </div>

      <p className="text-base-content/60">สรุปการเช็คชื่อและการลา — {thaiMonth(month)}</p>

      <div className="card bg-base-100 shadow">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center p-10">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : !report || report.rows.length === 0 ? (
            <p className="p-10 text-center text-base-content/50">ไม่มีข้อมูล</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>ครู</th>
                    <th>วิชา</th>
                    <th className="text-center">เช็คชื่อ</th>
                    <th className="text-center">ตรงเวลา</th>
                    <th className="text-center">สาย</th>
                    <th className="text-center">นาทีสาย</th>
                    <th className="text-center">ออกก่อน</th>
                    <th className="text-center">ลา (วัน)</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r) => (
                    <tr key={r.teacherId}>
                      <td className="font-medium">{r.name}</td>
                      <td>{r.subject ?? "-"}</td>
                      <td className="text-center">{r.sessions}</td>
                      <td className="text-center text-success">{r.onTime}</td>
                      <td className="text-center text-error">{r.late}</td>
                      <td className="text-center">{r.lateMinutes}</td>
                      <td className="text-center">{r.earlyLeave}</td>
                      <td className="text-center">{r.leaveDays}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td colSpan={2}>รวม</td>
                    <td className="text-center">{report.totals.sessions}</td>
                    <td className="text-center">{report.totals.onTime}</td>
                    <td className="text-center">{report.totals.late}</td>
                    <td className="text-center">{report.totals.lateMinutes}</td>
                    <td className="text-center">{report.totals.earlyLeave}</td>
                    <td className="text-center">{report.totals.leaveDays}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
