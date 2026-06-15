"use client";

import { useEffect, useState, useCallback } from "react";
import { LEAVE_STATUS, leaveTypeLabel, formatThaiDate, dayLabel } from "@/lib/constants";

type Leave = {
  id: string;
  teacherId: string;
  teacherName: string;
  date: string;
  reason: string;
  type: string;
  status: string;
  substituteId: string | null;
  substituteName: string | null;
  createdAt: string;
};

type Teacher = { id: string; name: string; subject: string | null };
type ScheduleRow = {
  id: string;
  dayOfWeek: number;
  period: number;
  room: string;
  subject: string;
};

const FILTERS = [
  { value: "", label: "ทั้งหมด" },
  { value: "pending", label: "รออนุมัติ" },
  { value: "approved", label: "อนุมัติแล้ว" },
  { value: "rejected", label: "ไม่อนุมัติ" },
];

// JS getDay() (0=Sun..6=Sat) -> our dayOfWeek (1..5 = Mon..Fri, else null)
function leaveDow(dateStr: string): number | null {
  const d = new Date(dateStr).getDay();
  return d >= 1 && d <= 5 ? d : null;
}

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [term, setTerm] = useState<{ year: number; term: number }>({ year: 2569, term: 1 });
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");

  // Approve modal state
  const [approving, setApproving] = useState<Leave | null>(null);
  const [dayClasses, setDayClasses] = useState<ScheduleRow[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [substituteId, setSubstituteId] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = filter ? `?status=${filter}` : "";
    const res = await fetch(`/api/leaves${qs}`);
    if (res.ok) setLeaves(await res.json());
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/teachers")
      .then((r) => r.json())
      .then(setTeachers);
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => setTerm({ year: s.currentYear ?? 2569, term: s.currentTerm ?? 1 }));
  }, []);

  async function openApprove(l: Leave) {
    setApproving(l);
    setSubstituteId("");
    setDayClasses([]);
    const dow = leaveDow(l.date);
    if (dow) {
      setLoadingClasses(true);
      const res = await fetch(
        `/api/schedules?teacherId=${l.teacherId}&year=${term.year}&term=${term.term}`,
      );
      if (res.ok) {
        const all: ScheduleRow[] = await res.json();
        setDayClasses(all.filter((s) => s.dayOfWeek === dow).sort((a, b) => a.period - b.period));
      }
      setLoadingClasses(false);
    }
  }

  async function confirmApprove() {
    if (!approving) return;
    setSaving(true);
    const res = await fetch(`/api/leaves/${approving.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved", substituteId: substituteId || null }),
    });
    setSaving(false);
    if (res.ok) {
      setApproving(null);
      await load();
    } else alert("ทำรายการไม่สำเร็จ");
  }

  async function reject(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/leaves/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    if (res.ok) await load();
    else alert("ทำรายการไม่สำเร็จ");
    setBusyId("");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">การลา</h1>
        <div role="tablist" className="tabs tabs-box tabs-sm">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              role="tab"
              className={`tab ${filter === f.value ? "tab-active" : ""}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center p-10">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : leaves.length === 0 ? (
            <p className="p-10 text-center text-base-content/50">ไม่มีรายการ</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>ครู</th>
                    <th>วันที่ลา</th>
                    <th>ประเภท</th>
                    <th>เหตุผล</th>
                    <th>สอนแทน</th>
                    <th>สถานะ</th>
                    <th className="text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((l) => {
                    const st = LEAVE_STATUS[l.status];
                    return (
                      <tr key={l.id}>
                        <td className="font-medium">{l.teacherName}</td>
                        <td>{formatThaiDate(l.date)}</td>
                        <td>{leaveTypeLabel(l.type)}</td>
                        <td className="max-w-xs truncate" title={l.reason}>
                          {l.reason}
                        </td>
                        <td className="text-sm">
                          {l.substituteName ? (
                            <span className="badge badge-info badge-sm">{l.substituteName}</span>
                          ) : (
                            <span className="text-base-content/30">-</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${st?.badge ?? ""} badge-sm`}>
                            {st?.label ?? l.status}
                          </span>
                        </td>
                        <td className="text-right">
                          {l.status === "pending" ? (
                            <div className="flex justify-end gap-1">
                              <button
                                className="btn btn-success btn-xs"
                                disabled={busyId === l.id}
                                onClick={() => openApprove(l)}
                              >
                                อนุมัติ
                              </button>
                              <button
                                className="btn btn-error btn-xs btn-outline"
                                disabled={busyId === l.id}
                                onClick={() => reject(l.id)}
                              >
                                ไม่อนุมัติ
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-base-content/40">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Approve modal */}
      {approving && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="text-lg font-bold">อนุมัติการลา</h3>
            <p className="text-sm text-base-content/70">
              {approving.teacherName} · {leaveTypeLabel(approving.type)} ·{" "}
              {formatThaiDate(approving.date)}
            </p>

            <div className="mt-4">
              <h4 className="mb-1 font-semibold">
                คาบสอนในวัน{leaveDow(approving.date) ? dayLabel(leaveDow(approving.date)!) : "หยุด"} (ปี {term.year}/เทอม {term.term})
              </h4>
              {loadingClasses ? (
                <span className="loading loading-spinner loading-sm" />
              ) : leaveDow(approving.date) === null ? (
                <p className="text-sm text-base-content/50">วันนี้เป็นวันหยุด ไม่มีคาบสอน</p>
              ) : dayClasses.length === 0 ? (
                <p className="text-sm text-base-content/50">ไม่มีคาบสอนในวันนี้ — ไม่ต้องหาครูสอนแทน</p>
              ) : (
                <ul className="rounded-box bg-base-200 p-3 text-sm">
                  {dayClasses.map((c) => (
                    <li key={c.id} className="flex justify-between py-0.5">
                      <span>คาบ {c.period} · {c.room}</span>
                      <span className="text-base-content/60">{c.subject}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {leaveDow(approving.date) !== null && dayClasses.length > 0 && (
              <label className="form-control mt-4 w-full">
                <span className="label-text mb-1">ครูสอนแทน (ถ้ามี)</span>
                <select
                  className="select select-bordered w-full"
                  value={substituteId}
                  onChange={(e) => setSubstituteId(e.target.value)}
                >
                  <option value="">— ยังไม่ระบุ —</option>
                  {teachers
                    .filter((t) => t.id !== approving.teacherId)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.subject ? ` (${t.subject})` : ""}
                      </option>
                    ))}
                </select>
              </label>
            )}

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setApproving(null)} disabled={saving}>
                ยกเลิก
              </button>
              <button className="btn btn-success" onClick={confirmApprove} disabled={saving}>
                {saving && <span className="loading loading-spinner loading-sm" />}
                ยืนยันอนุมัติ
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop" onClick={() => setApproving(null)}>
            <button>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
