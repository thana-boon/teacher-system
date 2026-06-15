"use client";

import { useEffect, useState } from "react";
import FaceEnrollModal from "@/components/FaceEnrollModal";
import { fileToDataUrl } from "@/lib/image";
import { getDescriptorFromDataUrl } from "@/lib/face";

type Profile = {
  name: string;
  username: string | null;
  email: string | null;
  subject: string | null;
  phone: string | null;
  photoBase64: string | null;
  hasFace: boolean;
};

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [hasFace, setHasFace] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [photo, setPhoto] = useState<string | null>(null); // current preview / data url
  const [photoChanged, setPhotoChanged] = useState(false);
  const [pendingFace, setPendingFace] = useState<string | null>(null); // JSON faceData from uploaded photo
  const [faceMsg, setFaceMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((p: Profile) => {
        setName(p.name ?? "");
        setUsername(p.username ?? "");
        setEmail(p.email ?? "");
        setSubject(p.subject ?? "");
        setPhone(p.phone ?? "");
        setPhoto(p.photoBase64 ?? null);
        setHasFace(p.hasFace);
        setLoading(false);
      });
  }, []);

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file, { maxSize: 512, quality: 0.85 });
    setPhoto(dataUrl);
    setPhotoChanged(true);

    // Derive face data from the uploaded photo (no live scan needed).
    setFaceMsg("กำลังตรวจจับใบหน้าในรูป…");
    try {
      const desc = await getDescriptorFromDataUrl(dataUrl);
      if (desc) {
        setPendingFace(JSON.stringify([desc]));
        setFaceMsg("✓ ตรวจพบใบหน้า — กด “บันทึก” เพื่อใช้สแกนเช็คชื่อ");
      } else {
        setPendingFace(null);
        setFaceMsg("⚠ ไม่พบใบหน้าในรูป — ลองรูปที่เห็นหน้าชัด หรือใช้การสแกนสด");
      }
    } catch {
      setFaceMsg("⚠ ประมวลผลใบหน้าไม่สำเร็จ");
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const payload: Record<string, unknown> = { name, subject, phone };
      if (password) payload.password = password;
      if (photoChanged) payload.photoBase64 = photo;
      if (pendingFace) payload.faceData = pendingFace;
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ type: "error", text: data.error ?? "บันทึกไม่สำเร็จ" });
        return;
      }
      setPassword("");
      setPhotoChanged(false);
      if (pendingFace) {
        setHasFace(true);
        setPendingFace(null);
        setFaceMsg("");
      }
      setMsg({ type: "success", text: "บันทึกข้อมูลเรียบร้อย" });
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
      <h1 className="text-2xl font-bold">ข้อมูลส่วนตัว</h1>

      <div className="card mx-auto max-w-xl bg-base-100 shadow">
        <div className="card-body">
          <form onSubmit={save} className="space-y-4">
            {/* Photo */}
            <div className="flex flex-col items-center gap-3">
              <div className="avatar avatar-placeholder">
                <div className="w-28 rounded-full bg-base-300">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt="รูปครู" />
                  ) : (
                    <span className="text-4xl">👤</span>
                  )}
                </div>
              </div>
              <input
                type="file"
                accept="image/*"
                className="file-input file-input-bordered file-input-sm w-full max-w-xs"
                onChange={onPickPhoto}
              />
              <div className="flex flex-col items-center gap-1 text-xs">
                <div>
                  สถานะข้อมูลใบหน้า:{" "}
                  {hasFace ? (
                    <span className="badge badge-success badge-sm">เก็บแล้ว</span>
                  ) : (
                    <span className="badge badge-ghost badge-sm">ยังไม่ได้เก็บ</span>
                  )}
                </div>
                {faceMsg && <span className="text-center">{faceMsg}</span>}
                <span className="text-base-content/50">
                  อัปรูปที่เห็นหน้าชัดด้านบน ระบบจะดึงใบหน้าให้อัตโนมัติ
                </span>
                <div className="divider my-1 text-xs">หรือ</div>
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  onClick={() => setEnrolling(true)}
                >
                  📸 สแกนสดจากกล้อง
                </button>
                <span className="text-base-content/50">
                  ใช้สำหรับสแกนเช็คชื่อที่หน้า Kiosk
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="form-control w-full">
                <span className="label-text mb-1">ชื่อผู้ใช้</span>
                <input
                  className="input input-bordered w-full"
                  value={username || "-"}
                  disabled
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text mb-1">อีเมล</span>
                <input
                  className="input input-bordered w-full"
                  value={email || "-"}
                  disabled
                />
              </label>
            </div>
            <label className="form-control w-full">
              <span className="label-text mb-1">ชื่อ-นามสกุล</span>
              <input
                className="input input-bordered w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="form-control w-full">
                <span className="label-text mb-1">วิชาที่สอน</span>
                <input
                  className="input input-bordered w-full"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text mb-1">เบอร์โทร</span>
                <input
                  className="input input-bordered w-full"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
            </div>
            <label className="form-control w-full">
              <span className="label-text mb-1">เปลี่ยนรหัสผ่าน (เว้นว่างถ้าไม่เปลี่ยน)</span>
              <input
                type="password"
                className="input input-bordered w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)"
              />
            </label>

            {msg && (
              <div className={`alert py-2 text-sm ${msg.type === "success" ? "alert-success" : "alert-error"}`}>
                <span>{msg.text}</span>
              </div>
            )}

            <button className="btn btn-primary w-full" disabled={saving}>
              {saving && <span className="loading loading-spinner loading-sm" />}
              บันทึก
            </button>
          </form>
        </div>
      </div>

      {enrolling && (
        <FaceEnrollModal
          onClose={() => setEnrolling(false)}
          onSaved={() => {
            setHasFace(true);
            setMsg({ type: "success", text: "เก็บข้อมูลใบหน้าเรียบร้อย" });
          }}
        />
      )}
    </div>
  );
}
