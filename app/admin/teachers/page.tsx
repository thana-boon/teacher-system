"use client";

import { useEffect, useState, useCallback } from "react";

type Teacher = {
  id: string;
  name: string;
  username: string | null;
  email: string | null;
  subject: string | null;
  phone: string | null;
  hasPhoto: boolean;
  hasFace: boolean;
};

type FormState = {
  id?: string;
  name: string;
  username: string;
  email: string;
  password: string;
  subject: string;
  phone: string;
  photoBase64: string | null; // null = unchanged, "" = remove
  photoPreview: string | null;
};

const EMPTY: FormState = {
  name: "",
  username: "",
  email: "",
  password: "",
  subject: "",
  phone: "",
  photoBase64: null,
  photoPreview: null,
};

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/teachers");
    if (res.ok) setTeachers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setError("");
    setForm({ ...EMPTY });
  }

  async function openEdit(t: Teacher) {
    setError("");
    // Load existing photo so the admin can see/replace it.
    let photoPreview: string | null = null;
    if (t.hasPhoto) {
      const res = await fetch(`/api/teachers/${t.id}/photo`);
      if (res.ok) photoPreview = (await res.json()).photoBase64 ?? null;
    }
    setForm({
      id: t.id,
      name: t.name,
      username: t.username ?? "",
      email: t.email ?? "",
      password: "",
      subject: t.subject ?? "",
      phone: t.phone ?? "",
      photoBase64: null,
      photoPreview,
    });
  }

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setForm((f) => (f ? { ...f, photoBase64: dataUrl, photoPreview: dataUrl } : f));
    };
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    setError("");
    try {
      const isEdit = !!form.id;
      const url = isEdit ? `/api/teachers/${form.id}` : "/api/teachers";
      const method = isEdit ? "PATCH" : "POST";
      const payload: Record<string, unknown> = {
        name: form.name,
        username: form.username,
        email: form.email,
        subject: form.subject,
        phone: form.phone,
      };
      if (!isEdit) {
        payload.password = form.password;
      } else if (form.password) {
        payload.password = form.password;
      }
      if (form.photoBase64 !== null) payload.photoBase64 = form.photoBase64;

      const res = await fetch(url, {
        method,
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

  async function remove(t: Teacher) {
    if (!confirm(`ลบครู "${t.name}" และข้อมูลทั้งหมด?`)) return;
    const res = await fetch(`/api/teachers/${t.id}`, { method: "DELETE" });
    if (res.ok) await load();
    else alert("ลบไม่สำเร็จ");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">จัดการครู</h1>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          ➕ เพิ่มครู
        </button>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center p-10">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : teachers.length === 0 ? (
            <p className="p-10 text-center text-base-content/50">ยังไม่มีครูในระบบ</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>ชื่อ</th>
                    <th>ชื่อผู้ใช้</th>
                    <th>อีเมล</th>
                    <th>วิชา</th>
                    <th>เบอร์โทร</th>
                    <th>รูป/ใบหน้า</th>
                    <th className="text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((t) => (
                    <tr key={t.id}>
                      <td className="font-medium">{t.name}</td>
                      <td className="text-sm">{t.username ?? "-"}</td>
                      <td className="text-sm">{t.email ?? "-"}</td>
                      <td>{t.subject ?? "-"}</td>
                      <td>{t.phone ?? "-"}</td>
                      <td>
                        <div className="flex gap-1">
                          <span className={`badge badge-sm ${t.hasPhoto ? "badge-success" : "badge-ghost"}`}>
                            รูป
                          </span>
                          <span className={`badge badge-sm ${t.hasFace ? "badge-success" : "badge-ghost"}`}>
                            ใบหน้า
                          </span>
                        </div>
                      </td>
                      <td className="text-right">
                        <button className="btn btn-ghost btn-xs" onClick={() => openEdit(t)}>
                          ✏️ แก้ไข
                        </button>
                        <button className="btn btn-ghost btn-xs text-error" onClick={() => remove(t)}>
                          🗑️ ลบ
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

      {/* Add / Edit modal */}
      {form && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="text-lg font-bold">{form.id ? "แก้ไขข้อมูลครู" : "เพิ่มครูใหม่"}</h3>

            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-4">
                <div className="avatar avatar-placeholder">
                  <div className="w-16 rounded-full bg-base-300">
                    {form.photoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.photoPreview} alt="รูปครู" />
                    ) : (
                      <span className="text-2xl">👤</span>
                    )}
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="file-input file-input-bordered file-input-sm w-full"
                  onChange={onPickPhoto}
                />
              </div>

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
              <input
                className="input input-bordered w-full"
                placeholder={form.id ? "รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)" : "รหัสผ่าน (อย่างน้อย 6 ตัว)"}
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="input input-bordered w-full"
                  placeholder="วิชาที่สอน"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
                <input
                  className="input input-bordered w-full"
                  placeholder="เบอร์โทร"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

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
