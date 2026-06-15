"use client";

import { useEffect, useState, useCallback } from "react";
import { DAYS, DEFAULT_PERIODS, periodTime, type PeriodSlot } from "@/lib/constants";

type Teacher = { id: string; name: string; subject: string | null };
type Schedule = {
  id: string;
  teacherId: string;
  dayOfWeek: number;
  period: number;
  room: string;
  subject: string;
};
type CellForm = {
  id?: string;
  dayOfWeek: number;
  period: number;
  room: string;
  subject: string;
};

export default function SchedulePage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [periods, setPeriods] = useState<PeriodSlot[]>(DEFAULT_PERIODS);
  const [loading, setLoading] = useState(false);
  const [cell, setCell] = useState<CellForm | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/teachers")
      .then((r) => r.json())
      .then((list: Teacher[]) => {
        setTeachers(list);
        if (list.length) setTeacherId(list[0].id);
      });
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s: { periods?: PeriodSlot[] }) => {
        if (s.periods?.length) setPeriods(s.periods);
      });
  }, []);

  const loadSchedules = useCallback(async () => {
    if (!teacherId) return;
    setLoading(true);
    const res = await fetch(`/api/schedules?teacherId=${teacherId}`);
    if (res.ok) setSchedules(await res.json());
    setLoading(false);
  }, [teacherId]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const currentTeacher = teachers.find((t) => t.id === teacherId);

  function cellAt(day: number, period: number) {
    return schedules.find((s) => s.dayOfWeek === day && s.period === period);
  }

  function openCell(day: number, period: number) {
    const existing = cellAt(day, period);
    setCell({
      id: existing?.id,
      dayOfWeek: day,
      period,
      room: existing?.room ?? "",
      subject: existing?.subject ?? currentTeacher?.subject ?? "",
    });
  }

  async function saveCell() {
    if (!cell || !teacherId) return;
    setSaving(true);
    try {
      const isEdit = !!cell.id;
      const res = await fetch(
        isEdit ? `/api/schedules/${cell.id}` : "/api/schedules",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teacherId,
            dayOfWeek: cell.dayOfWeek,
            period: cell.period,
            room: cell.room,
            subject: cell.subject,
          }),
        },
      );
      if (res.ok) {
        setCell(null);
        await loadSchedules();
      } else {
        alert((await res.json().catch(() => ({}))).error ?? "บันทึกไม่สำเร็จ");
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteCell() {
    if (!cell?.id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/schedules/${cell.id}`, { method: "DELETE" });
      if (res.ok) {
        setCell(null);
        await loadSchedules();
      } else alert("ลบไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">ตารางสอน</h1>
        <select
          className="select select-bordered select-sm"
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
        >
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.subject ? ` (${t.subject})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body p-2 sm:p-4">
          {loading ? (
            <div className="flex justify-center p-10">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : (
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
                        <div className="font-normal text-base-content/50">{periodTime(p)}</div>
                      </td>
                      {DAYS.map((d) => {
                        const c = cellAt(d.value, p.period);
                        return (
                          <td key={d.value} className="p-1">
                            <button
                              className={`btn btn-block btn-sm h-auto min-h-12 flex-col py-1 ${
                                c ? "btn-primary" : "btn-ghost border border-dashed border-base-300"
                              }`}
                              onClick={() => openCell(d.value, p.period)}
                            >
                              {c ? (
                                <>
                                  <span className="font-semibold">{c.room}</span>
                                  <span className="text-xs font-normal opacity-80">{c.subject}</span>
                                </>
                              ) : (
                                <span className="text-base-content/30">+</span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {cell && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="text-lg font-bold">
              {cell.id ? "แก้ไขคาบสอน" : "เพิ่มคาบสอน"}
            </h3>
            <p className="text-sm text-base-content/60">
              {currentTeacher?.name} · วัน{DAYS.find((d) => d.value === cell.dayOfWeek)?.label} · คาบ {cell.period}
            </p>

            <div className="mt-4 space-y-3">
              <input
                className="input input-bordered w-full"
                placeholder="ห้องเรียน (เช่น ม.1/1)"
                value={cell.room}
                onChange={(e) => setCell({ ...cell, room: e.target.value })}
              />
              <input
                className="input input-bordered w-full"
                placeholder="วิชา"
                value={cell.subject}
                onChange={(e) => setCell({ ...cell, subject: e.target.value })}
              />
            </div>

            <div className="modal-action">
              {cell.id && (
                <button className="btn btn-error btn-outline mr-auto" onClick={deleteCell} disabled={saving}>
                  🗑️ ลบ
                </button>
              )}
              <button className="btn btn-ghost" onClick={() => setCell(null)} disabled={saving}>
                ยกเลิก
              </button>
              <button className="btn btn-primary" onClick={saveCell} disabled={saving}>
                {saving && <span className="loading loading-spinner loading-sm" />}
                บันทึก
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop" onClick={() => setCell(null)}>
            <button>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
