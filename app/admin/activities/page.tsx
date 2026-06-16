"use client";

import { useCallback, useEffect, useState } from "react";
import ThaiDatePicker from "@/components/ThaiDatePicker";
import { useDialog } from "@/components/DialogProvider";
import {
  dayLabel,
  formatThaiDate,
  periodTime,
  type PeriodSlot,
} from "@/lib/constants";

type Teacher = { id: string; name: string; subject: string | null };
type ScheduleRow = {
  id: string;
  dayOfWeek: number;
  period: number;
  room: string;
  subject: string;
};
type ActivityRow = { id: string; period: number; name: string };
type OfficialLeave = {
  id: string;
  teacherId: string;
  teacherName: string;
  date: string;
  reason: string;
  type: string;
  substitutions: { period: number; substituteName: string | null }[];
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
// "YYYY-MM-DD" -> our dayOfWeek (1..5 = Mon..Fri), else null.
function dowOf(dateStr: string): number | null {
  const d = new Date(`${dateStr}T00:00:00`).getDay();
  return d >= 1 && d <= 5 ? d : null;
}

export default function ActivitiesPage() {
  const [tab, setTab] = useState<"activity" | "official">("activity");
  const [periods, setPeriods] = useState<PeriodSlot[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [term, setTerm] = useState<{ year: number; term: number }>({ year: 2569, term: 1 });

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        setPeriods(s.periods ?? []);
        setTerm({ year: s.currentYear ?? 2569, term: s.currentTerm ?? 1 });
      });
    fetch("/api/teachers")
      .then((r) => r.json())
      .then(setTeachers);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">กิจกรรม / ไปราชการ</h1>

      <div role="tablist" className="tabs tabs-box">
        <button
          role="tab"
          className={`tab ${tab === "activity" ? "tab-active" : ""}`}
          onClick={() => setTab("activity")}
        >
          📌 กิจกรรมประจำวัน
        </button>
        <button
          role="tab"
          className={`tab ${tab === "official" ? "tab-active" : ""}`}
          onClick={() => setTab("official")}
        >
          🚗 ไปราชการ
        </button>
      </div>

      {tab === "activity" ? (
        <ActivityTab periods={periods} />
      ) : (
        <OfficialTab teachers={teachers} term={term} />
      )}
    </div>
  );
}

/* ---------------- Activity tab ---------------- */
function ActivityTab({ periods }: { periods: PeriodSlot[] }) {
  const { alert } = useDialog();
  const [date, setDate] = useState(todayStr());
  // period -> { checked, name }
  const [rows, setRows] = useState<Record<number, { checked: boolean; name: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/activities?date=${date}`);
    const existing: ActivityRow[] = res.ok ? await res.json() : [];
    const byPeriod = new Map(existing.map((a) => [a.period, a.name]));
    setRows(
      Object.fromEntries(
        periods.map((p) => [
          p.period,
          { checked: byPeriod.has(p.period), name: byPeriod.get(p.period) ?? "" },
        ]),
      ),
    );
    setLoading(false);
  }, [date, periods]);

  useEffect(() => {
    if (periods.length) load();
  }, [load, periods.length]);

  async function save() {
    setSaving(true);
    const items = periods
      .filter((p) => rows[p.period]?.checked)
      .map((p) => ({ period: p.period, name: rows[p.period]?.name ?? "" }));
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, items }),
    });
    setSaving(false);
    if (res.ok) await alert("บันทึกกิจกรรมเรียบร้อย");
    else await alert("บันทึกไม่สำเร็จ");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm">เลือกวันที่:</span>
        <ThaiDatePicker value={date} onChange={setDate} />
        <span className="text-sm text-base-content/60">
          ({dowOf(date) ? "วัน" + dayLabel(dowOf(date)!) : "วันหยุด"})
        </span>
      </div>
      <p className="text-sm text-base-content/60">
        ติ๊กคาบที่มีกิจกรรม — ครูทุกคนที่มีคาบนั้นจะไม่ถูกนับว่าขาดสอนในวันนี้
      </p>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          {loading ? (
            <div className="flex justify-center p-6">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : periods.length === 0 ? (
            <p className="text-center text-base-content/50">ยังไม่ได้ตั้งค่าคาบเรียน</p>
          ) : (
            <div className="space-y-2">
              {periods.map((p) => {
                const row = rows[p.period] ?? { checked: false, name: "" };
                return (
                  <div
                    key={p.period}
                    className="flex items-center gap-3 rounded-box bg-base-200 p-2"
                  >
                    <label className="flex w-40 shrink-0 cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary"
                        checked={row.checked}
                        onChange={(e) =>
                          setRows((m) => ({
                            ...m,
                            [p.period]: { ...row, checked: e.target.checked },
                          }))
                        }
                      />
                      <span className="text-sm">
                        <span className="font-semibold">คาบ {p.period}</span>
                        <div className="text-xs text-base-content/60">{periodTime(p)}</div>
                      </span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered input-sm flex-1"
                      placeholder="ชื่อกิจกรรม (เช่น กิจกรรมหน้าเสาธง)"
                      value={row.name}
                      disabled={!row.checked}
                      onChange={(e) =>
                        setRows((m) => ({
                          ...m,
                          [p.period]: { ...row, name: e.target.value },
                        }))
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}
          <div className="card-actions mt-2 justify-end">
            <button className="btn btn-primary" onClick={save} disabled={saving || loading}>
              {saving && <span className="loading loading-spinner loading-sm" />}
              บันทึก
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Official duty tab ---------------- */
function OfficialTab({
  teachers,
  term,
}: {
  teachers: Teacher[];
  term: { year: number; term: number };
}) {
  const { alert, confirm } = useDialog();
  const [date, setDate] = useState(todayStr());
  const [teacherId, setTeacherId] = useState("");
  const [reason, setReason] = useState("ไปราชการ");
  const [dayClasses, setDayClasses] = useState<ScheduleRow[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [subById, setSubById] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [list, setList] = useState<OfficialLeave[]>([]);

  const dow = dowOf(date);

  const loadList = useCallback(async () => {
    const res = await fetch("/api/leaves?status=approved");
    if (!res.ok) return;
    const all: OfficialLeave[] = await res.json();
    setList(
      all.filter(
        (l) => l.type === "official" && l.date.slice(0, 10) === date,
      ),
    );
  }, [date]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // Load the selected teacher's classes for the chosen weekday.
  const loadClasses = useCallback(async () => {
    setDayClasses([]);
    setSubById({});
    if (!teacherId || !dow) return;
    setLoadingClasses(true);
    const res = await fetch(
      `/api/schedules?teacherId=${teacherId}&year=${term.year}&term=${term.term}`,
    );
    if (res.ok) {
      const all: ScheduleRow[] = await res.json();
      setDayClasses(all.filter((s) => s.dayOfWeek === dow).sort((a, b) => a.period - b.period));
    }
    setLoadingClasses(false);
  }, [teacherId, dow, term.year, term.term]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  async function save() {
    if (!teacherId) {
      await alert("กรุณาเลือกครู");
      return;
    }
    setSaving(true);
    const substitutions = dayClasses
      .filter((c) => subById[c.id])
      .map((c) => ({ scheduleId: c.id, substituteId: subById[c.id] }));
    const res = await fetch("/api/leaves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherId, date, reason, type: "official", substitutions }),
    });
    setSaving(false);
    if (res.ok) {
      setSubById({});
      await loadList();
      await alert("บันทึกการไปราชการเรียบร้อย");
    } else await alert("บันทึกไม่สำเร็จ");
  }

  async function remove(id: string) {
    if (!(await confirm("ลบรายการไปราชการนี้?"))) return;
    const res = await fetch(`/api/leaves/${id}`, { method: "DELETE" });
    if (res.ok) await loadList();
    else await alert("ลบไม่สำเร็จ");
  }

  return (
    <div className="space-y-3">
      <div className="card bg-base-100 shadow">
        <div className="card-body space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="label py-1">
                <span className="label-text text-sm">วันที่</span>
              </label>
              <ThaiDatePicker value={date} onChange={setDate} />
            </div>
            <div className="flex-1">
              <label className="label py-1">
                <span className="label-text text-sm">ครูที่ไปราชการ</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
              >
                <option value="">— เลือกครู —</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.subject ? ` (${t.subject})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="label py-1">
                <span className="label-text text-sm">เหตุผล / รายละเอียด</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ไปราชการ"
              />
            </div>
          </div>

          <div>
            <h4 className="mb-2 font-semibold">
              เลือกครูสอนแทนรายคาบ — {dow ? "วัน" + dayLabel(dow) : "วันหยุด"} (ปี {term.year}/เทอม {term.term})
            </h4>
            {!teacherId ? (
              <p className="text-sm text-base-content/50">เลือกครูก่อนเพื่อดูคาบสอน</p>
            ) : dow === null ? (
              <p className="text-sm text-base-content/50">วันนี้เป็นวันหยุด ไม่มีคาบสอน</p>
            ) : loadingClasses ? (
              <span className="loading loading-spinner loading-sm" />
            ) : dayClasses.length === 0 ? (
              <p className="text-sm text-base-content/50">ครูคนนี้ไม่มีคาบสอนในวันนี้</p>
            ) : (
              <div className="space-y-2">
                {dayClasses.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 rounded-box bg-base-200 p-2">
                    <div className="w-28 shrink-0 text-sm">
                      <div className="font-semibold">คาบ {c.period}</div>
                      <div className="text-base-content/60">
                        {c.room} · {c.subject}
                      </div>
                    </div>
                    <select
                      className="select select-bordered select-sm flex-1"
                      value={subById[c.id] ?? ""}
                      onChange={(e) => setSubById((m) => ({ ...m, [c.id]: e.target.value }))}
                    >
                      <option value="">— ไม่มีครูสอนแทน —</option>
                      {teachers
                        .filter((t) => t.id !== teacherId)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                            {t.subject ? ` (${t.subject})` : ""}
                          </option>
                        ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card-actions justify-end">
            <button className="btn btn-primary" onClick={save} disabled={saving || !teacherId}>
              {saving && <span className="loading loading-spinner loading-sm" />}
              บันทึกการไปราชการ
            </button>
          </div>
        </div>
      </div>

      {/* Existing official-duty records for this date */}
      <div className="card bg-base-100 shadow">
        <div className="card-body p-0">
          <h3 className="px-4 pt-4 font-semibold">
            รายการไปราชการ — {formatThaiDate(`${date}T00:00:00`)}
          </h3>
          {list.length === 0 ? (
            <p className="p-6 text-center text-base-content/50">ยังไม่มีรายการในวันนี้</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>ครู</th>
                    <th>เหตุผล</th>
                    <th>สอนแทน</th>
                    <th className="text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((l) => (
                    <tr key={l.id}>
                      <td className="font-medium">{l.teacherName}</td>
                      <td>{l.reason}</td>
                      <td className="text-sm">
                        {l.substitutions.length ? (
                          <div className="flex flex-col gap-0.5">
                            {l.substitutions.map((s, i) => (
                              <span key={i}>
                                <span className="font-medium">คาบ {s.period}:</span>{" "}
                                {s.substituteName ?? "-"}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-base-content/30">-</span>
                        )}
                      </td>
                      <td className="text-right">
                        <button
                          className="btn btn-error btn-xs btn-outline"
                          onClick={() => remove(l.id)}
                        >
                          ลบ
                        </button>
                      </td>
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
