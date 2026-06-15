"use client";

import { useEffect, useRef, useState } from "react";
import {
  loadFaceModels,
  getDescriptor,
  findMatch,
  MATCH_THRESHOLD,
  type FaceCandidate,
} from "@/lib/face";

type Props = {
  room: string;
  type: "in" | "out";
  onClose: () => void;
};

type TeacherLite = { teacherId: string; name: string; photo?: string | null };

export default function KioskScanModal({ room, type, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const candidatesRef = useRef<FaceCandidate[]>([]);
  const thresholdRef = useRef<number>(MATCH_THRESHOLD);
  const scanningRef = useRef(false);

  const [status, setStatus] = useState("กำลังเตรียมกล้อง…");
  const [ready, setReady] = useState(false);
  const [result, setResult] = useState<{
    name: string;
    ok: boolean;
    text: string;
    photo?: string | null;
  } | null>(null);
  const [manual, setManual] = useState(false);
  const [allTeachers, setAllTeachers] = useState<TeacherLite[]>([]);
  const [manualId, setManualId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const label = type === "in" ? "เช็คชื่อเข้าสอน" : "เช็คชื่อออกจากห้อง";

  async function doCheckin(teacherId: string, method: "face" | "manual") {
    setSubmitting(true);
    const photo =
      candidatesRef.current.find((c) => c.teacherId === teacherId)?.photo ??
      allTeachers.find((t) => t.teacherId === teacherId)?.photo ??
      null;
    const res = await fetch("/api/kiosk/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherId, room, type, method }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setResult({ name: "", ok: false, text: data.error ?? "ทำรายการไม่สำเร็จ" });
      return;
    }
    const verb = type === "in" ? "เข้าสอน" : "ออกจากห้อง";
    let suffix = "";
    if (type === "in" && data.status === "late" && data.lateMinutes) {
      suffix = ` (สาย ${data.lateMinutes} นาที)`;
    } else if (type === "in" && data.status === "on_time") {
      suffix = " (ตรงเวลา)";
    } else if (type === "out" && data.earlyMinutes) {
      suffix = ` (ก่อนหมดคาบ ${data.earlyMinutes} นาที)`;
    }
    setResult({
      name: data.name,
      ok: true,
      photo,
      text: data.already
        ? `${data.name} เช็คชื่อไปแล้ว`
        : `${data.name} ${verb}สำเร็จ${suffix}`,
    });
    // Auto-close after a few seconds.
    setTimeout(onClose, 3000);
  }

  // Continuous face scan loop.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      if (cancelled || !scanningRef.current || !videoRef.current) return;
      const d = await getDescriptor(videoRef.current);
      if (cancelled) return;
      if (d) {
        const match = await findMatch(d, candidatesRef.current, thresholdRef.current);
        if (match) {
          scanningRef.current = false;
          setStatus("");
          await doCheckin(match.teacherId, "face");
          return;
        }
        setStatus("ไม่รู้จักใบหน้า — ลองใหม่ หรือใช้การกรอกเอง");
      } else {
        setStatus("จัดใบหน้าให้อยู่กลางกรอบ…");
      }
      timer = setTimeout(tick, 1200);
    }

    (async () => {
      try {
        await loadFaceModels();
        const [stream, teachersRes, settingsRes] = await Promise.all([
          navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } }),
          fetch("/api/kiosk/teachers").then((r) => r.json()),
          fetch("/api/settings").then((r) => r.json()).catch(() => ({})),
        ]);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        candidatesRef.current = teachersRes.teachers ?? [];
        if (typeof settingsRes.faceThreshold === "number")
          thresholdRef.current = settingsRes.faceThreshold;
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
        scanningRef.current = true;
        setStatus("จัดใบหน้าให้อยู่กลางกรอบ…");
        tick();
      } catch (e) {
        setStatus(
          "เปิดกล้องไม่ได้ — โปรดอนุญาตการใช้กล้อง หรือใช้การกรอกเอง (" +
            (e instanceof Error ? e.message : "error") +
            ")",
        );
      }
    })();

    return () => {
      cancelled = true;
      scanningRef.current = false;
      if (timer) clearTimeout(timer);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openManual() {
    scanningRef.current = false;
    setManual(true);
    if (!allTeachers.length) {
      fetch("/api/kiosk/teachers?all=1")
        .then((r) => r.json())
        .then((d) => setAllTeachers(d.teachers ?? []));
    }
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-md">
        <h3 className="text-lg font-bold">
          {label} · ห้อง {room}
        </h3>

        {result ? (
          <div className="py-8 text-center">
            {result.ok && result.photo ? (
              <div className="avatar">
                <div className="mx-auto w-32 rounded-full ring-4 ring-success ring-offset-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={result.photo} alt={result.name} />
                </div>
              </div>
            ) : (
              <div className="text-7xl">{result.ok ? "✅" : "❌"}</div>
            )}
            {result.ok && result.photo && <div className="mt-2 text-5xl">✅</div>}
            <p className="mt-3 text-2xl font-bold">{result.text}</p>
          </div>
        ) : manual ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-base-content/70">เลือกชื่อครูเพื่อเช็คชื่อ</p>
            <select
              className="select select-bordered w-full"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
            >
              <option value="">— เลือกครู —</option>
              {allTeachers.map((t) => (
                <option key={t.teacherId} value={t.teacherId}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              className="btn btn-primary w-full"
              disabled={!manualId || submitting}
              onClick={() => doCheckin(manualId, "manual")}
            >
              {submitting && <span className="loading loading-spinner loading-sm" />}
              ยืนยัน{label}
            </button>
            <button className="btn btn-ghost btn-sm w-full" onClick={() => setManual(false)}>
              ↩ กลับไปสแกนใบหน้า
            </button>
          </div>
        ) : (
          <>
            <div className="mt-3 overflow-hidden rounded-box bg-black">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
            </div>
            <p className="mt-2 text-center text-sm text-base-content/70">
              {submitting ? "กำลังบันทึก…" : status}
            </p>
            <button
              className="btn btn-outline btn-sm mt-2 w-full"
              onClick={openManual}
              disabled={!ready && !status.includes("เปิดกล้องไม่ได้")}
            >
              กรอกเอง (สแกนไม่ได้)
            </button>
          </>
        )}

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>
            ปิด
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button>close</button>
      </form>
    </dialog>
  );
}
