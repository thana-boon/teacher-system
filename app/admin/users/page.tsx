"use client";

import { useEffect, useState, useCallback } from "react";

type User = {
  id: string;
  name: string;
  username: string | null;
  email: string | null;
  role: string;
  createdAt: string;
};

type FormState = {
  id?: string;
  name: string;
  username: string;
  email: string;
  password: string;
  role: string;
};

const EMPTY: FormState = {
  name: "",
  username: "",
  email: "",
  password: "",
  role: "admin",
};

const ROLE_LABEL: Record<string, { label: string; badge: string }> = {
  admin: { label: "ผู้ดูแลระบบ", badge: "badge-primary" },
  teacher: { label: "ครู", badge: "badge-info" },
  kiosk: { label: "Kiosk", badge: "badge-ghost" },
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setError("");
    setForm({ ...EMPTY });
  }
  function openEdit(u: User) {
    setError("");
    setForm({
      id: u.id,
      name: u.name,
      username: u.username ?? "",
      email: u.email ?? "",
      password: "",
      role: u.role,
    });
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    setError("");
    try {
      const isEdit = !!form.id;
      const url = isEdit ? `/api/users/${form.id}` : "/api/users";
      const payload: Record<string, unknown> = {
        name: form.name,
        role: form.role,
        username: form.username,
        email: form.email,
      };
      if (!isEdit) {
        payload.password = form.password;
      } else if (form.password) {
        payload.password = form.password;
      }
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "บันทึกไม่สำเร็จ");
        return;
      }
      setForm(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(u: User) {
    if (!confirm(`ลบผู้ใช้ "${u.name}" (${u.email})?`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    if (res.ok) await load();
    else alert((await res.json().catch(() => ({}))).error ?? "ลบไม่สำเร็จ");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">จัดการผู้ใช้</h1>
          <p className="text-sm text-base-content/60">
            สร้างและจัดการบัญชีทุก role (admin / ครู / kiosk)
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          ➕ เพิ่มผู้ใช้
        </button>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center p-10">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>ชื่อ</th>
                    <th>ชื่อผู้ใช้</th>
                    <th>อีเมล</th>
                    <th>Role</th>
                    <th className="text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const r = ROLE_LABEL[u.role] ?? { label: u.role, badge: "" };
                    return (
                      <tr key={u.id}>
                        <td className="font-medium">{u.name}</td>
                        <td className="text-sm">{u.username ?? "-"}</td>
                        <td className="text-sm">{u.email ?? "-"}</td>
                        <td>
                          <span className={`badge badge-sm ${r.badge}`}>{r.label}</span>
                        </td>
                        <td className="text-right">
                          <button className="btn btn-ghost btn-xs" onClick={() => openEdit(u)}>
                            ✏️ แก้ไข
                          </button>
                          <button className="btn btn-ghost btn-xs text-error" onClick={() => remove(u)}>
                            🗑️ ลบ
                          </button>
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

      {form && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="text-lg font-bold">{form.id ? "แก้ไขผู้ใช้" : "เพิ่มผู้ใช้ใหม่"}</h3>
            <div className="mt-4 space-y-3">
              <input
                className="input input-bordered w-full"
                placeholder="ชื่อ-นามสกุล"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                className="input input-bordered w-full"
                placeholder="ชื่อผู้ใช้ (สำหรับเข้าสู่ระบบ)"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
              <input
                className="input input-bordered w-full"
                placeholder="อีเมล (ไม่บังคับ)"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <p className="text-xs text-base-content/50">
                * กรอกชื่อผู้ใช้ หรืออีเมล อย่างน้อยหนึ่งอย่าง (ใช้เข้าสู่ระบบได้ทั้งคู่)
              </p>
              <input
                className="input input-bordered w-full"
                placeholder={form.id ? "รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)" : "รหัสผ่าน (อย่างน้อย 6 ตัว)"}
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <label className="form-control w-full">
                <span className="label-text mb-1">Role</span>
                <select
                  className="select select-bordered w-full"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="admin">ผู้ดูแลระบบ (admin)</option>
                  <option value="teacher">ครู (teacher)</option>
                  <option value="kiosk">Kiosk</option>
                </select>
              </label>
              {form.role === "teacher" && !form.id && (
                <p className="text-xs text-base-content/50">
                  * สร้างเป็นครูที่นี่จะได้บัญชีเปล่า แนะนำให้ตั้งค่า วิชา/รูป ที่หน้า “จัดการครู”
                </p>
              )}
              {error && (
                <div className="alert alert-error py-2 text-sm">
                  <span>{error}</span>
                </div>
              )}
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setForm(null)} disabled={saving}>
                ยกเลิก
              </button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving && <span className="loading loading-spinner loading-sm" />}
                บันทึก
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop" onClick={() => setForm(null)}>
            <button>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
