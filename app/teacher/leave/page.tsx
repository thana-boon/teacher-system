"use client";

import { useEffect, useState, useCallback } from "react";
import { LEAVE_TYPES, LEAVE_STATUS, leaveTypeLabel, formatThaiDate } from "@/lib/constants";

type Leave = {
  id: string;
  date: string;
  reason: string;
  type: string;
  status: string;
  createdAt: string;
};

export default function TeacherLeavePage() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");
  const [type, setType] = useState("sick");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/leaves");
    if (res.ok) setLeaves(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, type, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "ส่งคำขอไม่สำเร็จ");
        return;
      }
      setDate("");
      setReason("");
      setType("sick");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function withdraw(id: string) {
    if (!confirm("ถอนคำขอลานี้?")) return;
    const res = await fetch(`/api/leaves/${id}`, { method: "DELETE" });
    if (res.ok) await load();
    else alert("ถอนคำขอไม่สำเร็จ");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ยื่นลา</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form */}
        <div className="card bg-base-100 shadow lg:col-span-1">
          <div className="card-body">
            <h2 className="card-title text-lg">คำขอลาใหม่</h2>
            <form onSubmit={submit} className="space-y-3">
              <label className="form-control w-full">
                <span className="label-text mb-1">วันที่ลา</span>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text mb-1">ประเภทการลา</span>
                <select
                  className="select select-bordered w-full"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-control w-full">
                <span className="label-text mb-1">เหตุผล</span>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="ระบุเหตุผลการลา"
                  required
                />
              </label>
              {error && (
                <div className="alert alert-error py-2 text-sm">
                  <span>{error}</span>
                </div>
              )}
              <button className="btn btn-primary w-full" disabled={submitting}>
                {submitting && <span className="loading loading-spinner loading-sm" />}
                ส่งคำขอลา
              </button>
            </form>
          </div>
        </div>

        {/* History */}
        <div className="card bg-base-100 shadow lg:col-span-2">
          <div className="card-body">
            <h2 className="card-title text-lg">ประวัติการลา</h2>
            {loading ? (
              <div className="flex justify-center p-8">
                <span className="loading loading-spinner loading-lg" />
              </div>
            ) : leaves.length === 0 ? (
              <p className="py-8 text-center text-base-content/50">ยังไม่มีประวัติการลา</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>วันที่ลา</th>
                      <th>ประเภท</th>
                      <th>เหตุผล</th>
                      <th>สถานะ</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((l) => {
                      const st = LEAVE_STATUS[l.status];
                      return (
                        <tr key={l.id}>
                          <td>{formatThaiDate(l.date)}</td>
                          <td>{leaveTypeLabel(l.type)}</td>
                          <td className="max-w-xs truncate" title={l.reason}>
                            {l.reason}
                          </td>
                          <td>
                            <span className={`badge ${st?.badge ?? ""} badge-sm`}>
                              {st?.label ?? l.status}
                            </span>
                          </td>
                          <td className="text-right">
                            {l.status === "pending" && (
                              <button
                                className="btn btn-ghost btn-xs text-error"
                                onClick={() => withdraw(l.id)}
                              >
                                ถอน
                              </button>
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
      </div>
    </div>
  );
}
