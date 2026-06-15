"use client";

import { useEffect, useState, useCallback } from "react";
import { LEAVE_STATUS, leaveTypeLabel, formatThaiDate } from "@/lib/constants";

type Leave = {
  id: string;
  teacherName: string;
  date: string;
  reason: string;
  type: string;
  status: string;
  createdAt: string;
};

const FILTERS = [
  { value: "", label: "ทั้งหมด" },
  { value: "pending", label: "รออนุมัติ" },
  { value: "approved", label: "อนุมัติแล้ว" },
  { value: "rejected", label: "ไม่อนุมัติ" },
];

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");

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

  async function decide(id: string, status: "approved" | "rejected") {
    setBusyId(id);
    const res = await fetch(`/api/leaves/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
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
                                onClick={() => decide(l.id, "approved")}
                              >
                                อนุมัติ
                              </button>
                              <button
                                className="btn btn-error btn-xs btn-outline"
                                disabled={busyId === l.id}
                                onClick={() => decide(l.id, "rejected")}
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
    </div>
  );
}
