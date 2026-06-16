"use client";

import { useEffect, useState, useCallback } from "react";
import ThaiMonthPicker from "@/components/ThaiMonthPicker";
import ThaiDatePicker from "@/components/ThaiDatePicker";
import {
  THAI_MONTHS,
  dayLabel,
  leaveTypeLabel,
  LEAVE_STATUS,
  formatThaiDate,
  formatThaiTime,
  type PeriodSlot,
} from "@/lib/constants";

type DailyStatus = "present" | "late" | "absent" | "leave" | "activity" | "none";
type DailyCell = {
  room: string;
  period: number;
  teacherName: string;
  subject: string;
  status: DailyStatus;
  checkIn: string | null;
  checkOut: string | null;
  lateMinutes: number | null;
};
type DailyReport = {
  date: string;
  weekday: number | null;
  periods: PeriodSlot[];
  rooms: string[];
  cells: DailyCell[];
  holidayName: string | null;
  inTerm: boolean;
};
type TeacherReport = {
  name: string;
  expected: number;
  present: number;
  onTime: number;
  late: number;
  lateMinutes: number;
  earlyLeave: number;
  onLeave: number;
  absent: number;
  absences: { date: string; period: number; room: string; subject: string }[];
};
type LeaveItem = {
  id: string;
  teacherName: string;
  date: string;
  type: string;
  status: string;
  substituteCount: number;
};
type Teacher = { id: string; name: string };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function monthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function thaiMonthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return `${THAI_MONTHS[m - 1]} พ.ศ. ${y + 543}`;
}

const STATUS_BADGE: Record<DailyStatus, { label: string; cls: string }> = {
  present: { label: "เข้าสอน", cls: "badge-success" },
  late: { label: "สาย", cls: "badge-error" },
  absent: { label: "ขาดสอน", cls: "badge-warning" },
  leave: { label: "ลา", cls: "badge-info" },
  activity: { label: "กิจกรรม", cls: "badge-secondary" },
  none: { label: "-", cls: "badge-ghost" },
};

export default function ReportsPage() {
  const [tab, setTab] = useState<"attendance" | "leave">("attendance");
  const [sub, setSub] = useState<"daily" | "person">("daily");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold print:hidden">รายงาน</h1>

      {/* Main selector */}
      <div role="tablist" className="tabs tabs-box print:hidden">
        <button
          role="tab"
          className={`tab ${tab === "attendance" ? "tab-active" : ""}`}
          onClick={() => setTab("attendance")}
        >
          📥 การเข้าสอน
        </button>
        <button
          role="tab"
          className={`tab ${tab === "leave" ? "tab-active" : ""}`}
          onClick={() => setTab("leave")}
        >
          📝 การลา
        </button>
      </div>

      {tab === "attendance" ? (
        <>
          <div role="tablist" className="tabs tabs-sm tabs-bordered print:hidden">
            <button
              role="tab"
              className={`tab ${sub === "daily" ? "tab-active" : ""}`}
              onClick={() => setSub("daily")}
            >
              ตารางรายวัน
            </button>
            <button
              role="tab"
              className={`tab ${sub === "person" ? "tab-active" : ""}`}
              onClick={() => setSub("person")}
            >
              รายบุคคล
            </button>
          </div>
          {sub === "daily" ? <DailyView /> : <PersonView />}
        </>
      ) : (
        <LeaveView />
      )}
    </div>
  );
}

/* ---------------- Daily grid ---------------- */
function DailyView() {
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/reports/daily?date=${date}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [date]);
  useEffect(() => {
    load();
  }, [load]);

  const cellAt = (room: string, period: number) =>
    data?.cells.find((c) => c.room === room && c.period === period);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <span className="text-sm">เลือกวันที่:</span>
        <ThaiDatePicker value={date} onChange={setDate} />
        <button
          className="btn btn-primary btn-sm"
          onClick={() => window.open(`/print/daily?date=${date}`, "_blank")}
        >
          🖨️ ดูตัวอย่าง/พิมพ์
        </button>
      </div>
      <p className="text-base-content/70">
        ตารางการเข้าสอน — วัน{data?.weekday ? dayLabel(data.weekday) + "ที่ " : ""}
        {formatThaiDate(`${date}T00:00:00`)}
      </p>

      {data && data.holidayName && (
        <div className="alert alert-info py-2">
          <span>🎌 วันหยุด: {data.holidayName} (ไม่นับขาดสอน)</span>
        </div>
      )}
      {data && !data.inTerm && (
        <div className="alert alert-warning py-2">
          <span>⚠ อยู่นอกช่วงเปิดเทอม (ไม่นับขาดสอน)</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-10">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : !data || data.weekday === null ? (
        <div className="card bg-base-100 shadow">
          <div className="card-body items-center text-base-content/50">
            วันหยุด ไม่มีคาบสอน 🎉
          </div>
        </div>
      ) : data.rooms.length === 0 ? (
        <div className="card bg-base-100 shadow">
          <div className="card-body items-center text-base-content/50">
            ไม่มีตารางสอนในวันนี้
          </div>
        </div>
      ) : (
        <div className="card bg-base-100 shadow">
          <div className="card-body p-2 sm:p-4">
            <div className="overflow-x-auto">
              <table className="table-sm table border-collapse text-center">
                <thead>
                  <tr>
                    <th className="bg-base-200">ห้อง \ คาบ</th>
                    {data.periods.map((p) => (
                      <th key={p.period} className="bg-base-200">
                        คาบ {p.period}
                        <div className="text-xs font-normal opacity-60">
                          {p.start}-{p.end}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rooms.map((room) => (
                    <tr key={room}>
                      <td className="bg-base-200 font-semibold">{room}</td>
                      {data.periods.map((p) => {
                        const c = cellAt(room, p.period);
                        if (!c)
                          return (
                            <td key={p.period} className="text-base-content/20">
                              -
                            </td>
                          );
                        const b = STATUS_BADGE[c.status];
                        return (
                          <td key={p.period} className="p-1">
                            <div className="rounded-lg border border-base-200 p-1 text-left">
                              <div className="text-xs font-medium">{c.teacherName}</div>
                              <div className="truncate text-[10px] opacity-60">{c.subject}</div>
                              <span className={`badge badge-xs ${b.cls}`}>
                                {b.label}
                                {c.status === "late" && c.lateMinutes ? ` ${c.lateMinutes}'` : ""}
                              </span>
                              {c.checkIn && (
                                <div className="text-[10px] opacity-70">
                                  {formatThaiTime(c.checkIn)}
                                  {c.checkOut ? `-${formatThaiTime(c.checkOut)}` : ""}
                                </div>
                              )}
                            </div>
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
      )}
    </div>
  );
}

/* ---------------- Per-person ---------------- */
function PersonView() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [month, setMonth] = useState(monthStr());
  const [data, setData] = useState<TeacherReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/teachers")
      .then((r) => r.json())
      .then((list: Teacher[]) => {
        setTeachers(list);
        if (list.length) setTeacherId(list[0].id);
      });
  }, []);

  const load = useCallback(async () => {
    if (!teacherId) return;
    setLoading(true);
    const res = await fetch(`/api/reports/teacher?teacherId=${teacherId}&month=${month}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [teacherId, month]);
  useEffect(() => {
    load();
  }, [load]);

  const stats = data
    ? [
        { label: "คาบที่ต้องสอน", value: data.expected, cls: "" },
        { label: "เข้าสอน", value: data.present, cls: "text-success" },
        { label: "ตรงเวลา", value: data.onTime, cls: "text-success" },
        { label: "สาย", value: data.late, cls: "text-error" },
        { label: "ออกก่อน", value: data.earlyLeave, cls: "text-warning" },
        { label: "ลา", value: data.onLeave, cls: "text-info" },
        { label: "ขาดสอน", value: data.absent, cls: "text-error" },
      ]
    : [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <select
          className="select select-bordered select-sm"
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
        >
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <ThaiMonthPicker value={month} onChange={setMonth} />
        <button
          className="btn btn-primary btn-sm"
          onClick={() =>
            window.open(`/print/teacher?teacherId=${teacherId}&month=${month}`, "_blank")
          }
          disabled={!teacherId}
        >
          🖨️ ดูตัวอย่าง/พิมพ์
        </button>
      </div>

      {loading || !data ? (
        <div className="flex justify-center p-10">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : (
        <>
          <p className="text-base-content/70">
            {data.name} — {thaiMonthLabel(month)}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {stats.map((s) => (
              <div key={s.label} className="card bg-base-100 shadow">
                <div className="card-body p-3">
                  <span className="text-xs text-base-content/60">{s.label}</span>
                  <span className={`text-2xl font-bold ${s.cls}`}>{s.value}</span>
                </div>
              </div>
            ))}
          </div>
          {data.late > 0 && (
            <p className="text-sm text-base-content/60">รวมเวลาสาย {data.lateMinutes} นาที</p>
          )}

          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h3 className="card-title text-base">รายการขาดสอน ({data.absent})</h3>
              {data.absences.length === 0 ? (
                <p className="py-3 text-center text-base-content/50">ไม่มีการขาดสอน 🎉</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-sm table">
                    <thead>
                      <tr>
                        <th>วันที่</th>
                        <th>คาบ</th>
                        <th>ห้อง</th>
                        <th>วิชา</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.absences.map((a, i) => (
                        <tr key={i}>
                          <td>{formatThaiDate(`${a.date}T00:00:00`)}</td>
                          <td>{a.period}</td>
                          <td>{a.room}</td>
                          <td>{a.subject}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- Leave ---------------- */
function LeaveView() {
  const [month, setMonth] = useState(monthStr());
  const [items, setItems] = useState<LeaveItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/reports/leaves?month=${month}`);
    if (res.ok) setItems((await res.json()).items);
    setLoading(false);
  }, [month]);
  useEffect(() => {
    load();
  }, [load]);

  function exportCsv() {
    const header = ["ครู", "วันที่", "ประเภท", "สถานะ", "สอนแทน(คาบ)"];
    const lines = items.map((l) =>
      [
        l.teacherName,
        formatThaiDate(l.date),
        leaveTypeLabel(l.type),
        LEAVE_STATUS[l.status]?.label ?? l.status,
        l.substituteCount,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = "﻿" + [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `รายงานการลา-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <ThaiMonthPicker value={month} onChange={setMonth} />
        <button className="btn btn-outline btn-sm" onClick={exportCsv} disabled={!items.length}>
          ⬇️ Excel (CSV)
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => window.open(`/print/leaves?month=${month}`, "_blank")}
        >
          🖨️ ดูตัวอย่าง/พิมพ์
        </button>
      </div>
      <p className="text-base-content/70">รายงานการลา — {thaiMonthLabel(month)}</p>

      <div className="card bg-base-100 shadow">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center p-10">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : items.length === 0 ? (
            <p className="p-10 text-center text-base-content/50">ไม่มีการลาในเดือนนี้</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>ครู</th>
                    <th>วันที่</th>
                    <th>ประเภท</th>
                    <th>สถานะ</th>
                    <th className="text-center">สอนแทน (คาบ)</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((l) => (
                    <tr key={l.id}>
                      <td className="font-medium">{l.teacherName}</td>
                      <td>{formatThaiDate(l.date)}</td>
                      <td>{leaveTypeLabel(l.type)}</td>
                      <td>
                        <span className={`badge badge-sm ${LEAVE_STATUS[l.status]?.badge ?? ""}`}>
                          {LEAVE_STATUS[l.status]?.label ?? l.status}
                        </span>
                      </td>
                      <td className="text-center">{l.substituteCount || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
