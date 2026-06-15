"use client";

import { useEffect, useState } from "react";
import type { PeriodSlot } from "@/lib/constants";
import { formatThaiDate } from "@/lib/constants";
import { fileToDataUrl } from "@/lib/image";
import ThaiDatePicker from "@/components/ThaiDatePicker";

type Holiday = { date: string; name: string };
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [logoChanged, setLogoChanged] = useState(false);
  const [periods, setPeriods] = useState<PeriodSlot[]>([]);
  const [currentYear, setCurrentYear] = useState(2569);
  const [currentTerm, setCurrentTerm] = useState(1);
  const [lateGrace, setLateGrace] = useState(5);
  const [faceThreshold, setFaceThreshold] = useState(0.45);
  const [termStart, setTermStart] = useState("");
  const [termEnd, setTermEnd] = useState("");
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [hDate, setHDate] = useState(todayStr());
  const [hName, setHName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        setSchoolName(s.schoolName ?? "");
        setLogo(s.logoBase64 ?? null);
        setPeriods(s.periods ?? []);
        setCurrentYear(s.currentYear ?? 2569);
        setCurrentTerm(s.currentTerm ?? 1);
        setLateGrace(s.lateGraceMinutes ?? 5);
        setFaceThreshold(s.faceThreshold ?? 0.45);
        setTermStart(s.termStart ?? "");
        setTermEnd(s.termEnd ?? "");
        setHolidays(s.holidays ?? []);
        setLoading(false);
      });
  }, []);

  async function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // PNG keeps logo transparency; smaller max size since it's just a logo.
    const dataUrl = await fileToDataUrl(file, { maxSize: 256, mime: "image/png" });
    setLogo(dataUrl);
    setLogoChanged(true);
  }

  function removeLogo() {
    setLogo(null);
    setLogoChanged(true);
  }

  function updatePeriod(idx: number, key: "start" | "end", value: string) {
    setPeriods((ps) => ps.map((p, i) => (i === idx ? { ...p, [key]: value } : p)));
  }
  function addPeriod() {
    setPeriods((ps) => [
      ...ps,
      { period: ps.length + 1, start: "08:00", end: "08:50" },
    ]);
  }
  function removePeriod(idx: number) {
    setPeriods((ps) => ps.filter((_, i) => i !== idx).map((p, i) => ({ ...p, period: i + 1 })));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const payload: Record<string, unknown> = {
        schoolName,
        periods,
        currentYear,
        currentTerm,
        lateGraceMinutes: lateGrace,
        faceThreshold,
        termStart: termStart || null,
        termEnd: termEnd || null,
        holidays,
      };
      if (logoChanged) payload.logoBase64 = logo;
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ type: "error", text: data.error ?? "บันทึกไม่สำเร็จ" });
        return;
      }
      setLogoChanged(false);
      setMsg({ type: "success", text: "บันทึกการตั้งค่าเรียบร้อย — รีเฟรชหน้าเพื่อเห็นโลโก้/ชื่อใหม่ทุกที่" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">ตั้งค่าเว็บไซต์</h1>

      {/* School identity */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title text-lg">ข้อมูลโรงเรียน</h2>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl bg-base-200">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="โลโก้โรงเรียน" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-4xl">🏫</span>
                )}
              </div>
              {logo && (
                <button className="btn btn-ghost btn-xs text-error" onClick={removeLogo}>
                  ลบโลโก้
                </button>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <label className="form-control w-full">
                <span className="label-text mb-1">ชื่อโรงเรียน</span>
                <input
                  className="input input-bordered w-full"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="เช่น โรงเรียนเทศบาล ๑"
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text mb-1">โลโก้โรงเรียน (รูปภาพ)</span>
                <input
                  type="file"
                  accept="image/*"
                  className="file-input file-input-bordered file-input-sm w-full"
                  onChange={onPickLogo}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Academic period */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title text-lg">ปีการศึกษา / ภาคเรียน ปัจจุบัน</h2>
          <p className="text-sm text-base-content/60">
            ระบบจะแสดงตารางสอนของปี/ภาคเรียนนี้ให้ครูและหน้าเช็คชื่อ (แต่ละปี/เทอมมีตารางแยกกัน)
          </p>
          <div className="grid max-w-md grid-cols-2 gap-3">
            <label className="form-control w-full">
              <span className="label-text mb-1">ปีการศึกษา (พ.ศ.)</span>
              <input
                type="number"
                className="input input-bordered w-full"
                value={currentYear}
                onChange={(e) => setCurrentYear(Number(e.target.value))}
              />
            </label>
            <label className="form-control w-full">
              <span className="label-text mb-1">ภาคเรียน</span>
              <select
                className="select select-bordered w-full"
                value={currentTerm}
                onChange={(e) => setCurrentTerm(Number(e.target.value))}
              >
                <option value={1}>ภาคเรียนที่ 1</option>
                <option value={2}>ภาคเรียนที่ 2</option>
              </select>
            </label>
            <label className="form-control col-span-2 w-full">
              <span className="label-text mb-1">อนุโลมเข้าสายได้ (นาที)</span>
              <input
                type="number"
                min={0}
                className="input input-bordered w-full"
                value={lateGrace}
                onChange={(e) => setLateGrace(Number(e.target.value))}
              />
              <span className="mt-1 text-xs text-base-content/50">
                เช็คอินหลังเวลาเริ่มคาบเกินจำนวนนาทีนี้ = นับว่า “เข้าสาย”
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Term range + holidays */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title text-lg">ช่วงเปิดเทอม และวันหยุด</h2>
          <p className="text-sm text-base-content/60">
            รายงานจะนับ “ขาดสอน” เฉพาะวันทำการในช่วงเปิดเทอม และไม่ใช่วันหยุด
          </p>
          <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
            <div>
              <span className="label-text mb-1 block">วันเปิดเทอม</span>
              <ThaiDatePicker value={termStart || todayStr()} onChange={setTermStart} />
            </div>
            <div>
              <span className="label-text mb-1 block">วันปิดเทอม</span>
              <ThaiDatePicker value={termEnd || todayStr()} onChange={setTermEnd} />
            </div>
          </div>

          <div className="divider my-2">วันหยุด</div>
          <div className="flex flex-wrap items-end gap-2">
            <ThaiDatePicker value={hDate} onChange={setHDate} />
            <input
              className="input input-bordered input-sm"
              placeholder="ชื่อวันหยุด (เช่น วันสงกรานต์)"
              value={hName}
              onChange={(e) => setHName(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                if (holidays.some((h) => h.date === hDate)) return;
                setHolidays(
                  [...holidays, { date: hDate, name: hName.trim() || "วันหยุด" }].sort((a, b) =>
                    a.date.localeCompare(b.date),
                  ),
                );
                setHName("");
              }}
            >
              ➕ เพิ่มวันหยุด
            </button>
          </div>
          {holidays.length > 0 && (
            <ul className="mt-2 divide-y divide-base-200 rounded-box border border-base-200">
              {holidays.map((h) => (
                <li key={h.date} className="flex items-center justify-between px-3 py-2">
                  <span>
                    <span className="font-medium">{formatThaiDate(`${h.date}T00:00:00`)}</span>
                    <span className="ml-2 text-base-content/60">{h.name}</span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs text-error"
                    onClick={() => setHolidays(holidays.filter((x) => x.date !== h.date))}
                  >
                    ลบ
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Face recognition */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title text-lg">การจดจำใบหน้า (Kiosk)</h2>
          <label className="form-control w-full max-w-md">
            <span className="label-text mb-1">ระดับความเข้มงวด</span>
            <select
              className="select select-bordered w-full"
              value={faceThreshold}
              onChange={(e) => setFaceThreshold(Number(e.target.value))}
            >
              <option value={0.4}>เข้มงวดมาก (กันจับผิดสูงสุด แต่อาจจำยาก)</option>
              <option value={0.45}>เข้มงวด (แนะนำ)</option>
              <option value={0.5}>ปานกลาง</option>
              <option value={0.55}>ผ่อนปรน (จำง่าย แต่เสี่ยงจับผิด)</option>
            </select>
            <span className="mt-1 text-xs text-base-content/50">
              ถ้าระบบจับหน้าผิดคน → เลือกเข้มงวดขึ้น · ถ้าจำคนถูกไม่ค่อยได้ → ผ่อนปรนลง
              (เก็บใบหน้าหลายมุม/รูปชัดช่วยได้มาก)
            </span>
          </label>
        </div>
      </div>

      {/* Periods */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="card-title text-lg">คาบเรียน</h2>
              <p className="text-sm text-base-content/60">
                กำหนดจำนวนคาบและช่วงเวลาเริ่ม–สิ้นสุดของแต่ละคาบ
              </p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={addPeriod}>
              ➕ เพิ่มคาบ
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>คาบ</th>
                  <th>เวลาเริ่ม</th>
                  <th>เวลาสิ้นสุด</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p, idx) => (
                  <tr key={idx}>
                    <td className="font-semibold">{idx + 1}</td>
                    <td>
                      <input
                        type="time"
                        className="input input-bordered input-sm"
                        value={p.start}
                        onChange={(e) => updatePeriod(idx, "start", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        className="input input-bordered input-sm"
                        value={p.end}
                        onChange={(e) => updatePeriod(idx, "end", e.target.value)}
                      />
                    </td>
                    <td className="text-right">
                      <button
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() => removePeriod(idx)}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
                {periods.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-base-content/50">
                      ยังไม่มีคาบ — กด “เพิ่มคาบ”
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`alert ${msg.type === "success" ? "alert-success" : "alert-error"}`}>
          <span>{msg.text}</span>
        </div>
      )}

      <div className="flex justify-end">
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving && <span className="loading loading-spinner loading-sm" />}
          บันทึกการตั้งค่า
        </button>
      </div>
    </div>
  );
}
