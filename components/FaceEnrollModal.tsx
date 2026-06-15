"use client";

import { useEffect, useRef, useState } from "react";
import { loadFaceModels, getDescriptor } from "@/lib/face";

const MAX_SAMPLES = 5;

export default function FaceEnrollModal({
  onClose,
  onSaved,
  saveUrl = "/api/profile",
}: {
  onClose: () => void;
  onSaved: () => void;
  saveUrl?: string; // PATCH target accepting { faceData }; defaults to own profile
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState("กำลังโหลดโมเดล…");
  const [ready, setReady] = useState(false);
  const [samples, setSamples] = useState<number[][]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadFaceModels();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
        setStatus("จัดใบหน้าให้อยู่กลางกรอบ แล้วกด “เก็บภาพ”");
      } catch (e) {
        setStatus(
          "เปิดกล้องไม่ได้ — โปรดอนุญาตการใช้กล้อง (" +
            (e instanceof Error ? e.message : "error") +
            ")",
        );
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function capture() {
    if (!videoRef.current || busy) return;
    setBusy(true);
    setStatus("กำลังตรวจจับใบหน้า…");
    const d = await getDescriptor(videoRef.current);
    if (!d) {
      setStatus("ไม่พบใบหน้า ลองใหม่อีกครั้ง");
    } else {
      setSamples((s) => [...s, d].slice(0, MAX_SAMPLES));
      setStatus("เก็บภาพแล้ว ✓ (เก็บได้หลายมุมเพื่อความแม่นยำ)");
    }
    setBusy(false);
  }

  async function save() {
    if (!samples.length) return;
    setSaving(true);
    const res = await fetch(saveUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ faceData: JSON.stringify(samples) }),
    });
    setSaving(false);
    if (res.ok) {
      onSaved();
      onClose();
    } else {
      setStatus("บันทึกไม่สำเร็จ");
    }
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <h3 className="text-lg font-bold">เก็บข้อมูลใบหน้า</h3>
        <div className="mt-3 overflow-hidden rounded-box bg-black">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
        </div>
        <p className="mt-2 text-center text-sm text-base-content/70">{status}</p>
        <div className="mt-1 text-center text-sm">
          เก็บแล้ว {samples.length}/{MAX_SAMPLES} ภาพ
        </div>

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            ยกเลิก
          </button>
          <button
            className="btn btn-outline"
            onClick={capture}
            disabled={!ready || busy || samples.length >= MAX_SAMPLES}
          >
            {busy ? <span className="loading loading-spinner loading-sm" /> : "📸"} เก็บภาพ
          </button>
          <button className="btn btn-primary" onClick={save} disabled={!samples.length || saving}>
            {saving && <span className="loading loading-spinner loading-sm" />}
            บันทึก
          </button>
        </div>
      </div>
    </dialog>
  );
}
