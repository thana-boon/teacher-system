"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import KioskScanModal from "@/components/KioskScanModal";
import {
  currentPeriod,
  periodTime,
  formatThaiDate,
  type PeriodSlot,
} from "@/lib/constants";

const ROOM_KEY = "kioskRoom";

type Settings = {
  schoolName: string;
  logoBase64: string | null;
  periods: PeriodSlot[];
  currentYear: number;
  currentTerm: number;
};

export default function KioskRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const room = decodeURIComponent(id);
  const router = useRouter();

  const [now, setNow] = useState(() => new Date());
  const [settings, setSettings] = useState<Settings | null>(null);
  const [scan, setScan] = useState<null | "in" | "out">(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings);
  }, []);

  function changeRoom() {
    localStorage.removeItem(ROOM_KEY);
    router.replace("/kiosk");
  }

  const period = settings ? currentPeriod(settings.periods, now) : null;
  const clock = now.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="flex min-h-screen flex-col bg-base-200">
      {/* Header */}
      <header className="navbar bg-primary text-primary-content shadow">
        <div className="flex flex-1 items-center gap-2 px-2">
          {settings?.logoBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logoBase64} alt="โลโก้" className="h-9 w-9 rounded bg-base-100 object-contain p-0.5" />
          ) : (
            <span className="text-2xl">🦆</span>
          )}
          <span className="text-lg font-bold">{settings?.schoolName || "ระบบเช็คชื่อ"}</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={changeRoom}>
          🔄 เปลี่ยนห้อง
        </button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
        {/* Clock / date / room */}
        <div className="text-center">
          <div className="badge badge-lg badge-primary mb-3 text-lg">ห้อง {room}</div>
          <div className="font-mono text-6xl font-bold sm:text-8xl">{clock}</div>
          <div className="mt-2 text-lg text-base-content/70">{formatThaiDate(now)}</div>
          <div className="mt-1 text-base-content/60">
            {settings ? (
              period ? (
                <>
                  คาบ {period.period} ({periodTime(period)})
                </>
              ) : (
                "ขณะนี้ไม่อยู่ในช่วงคาบเรียน"
              )
            ) : (
              "…"
            )}
            {settings && (
              <span className="ml-2 text-sm">
                · ปี {settings.currentYear}/เทอม {settings.currentTerm}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid w-full max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            className="btn btn-success h-28 flex-col text-2xl"
            onClick={() => setScan("in")}
          >
            <span className="text-4xl">📥</span>
            เช็คชื่อเข้าสอน
          </button>
          <button
            className="btn btn-warning h-28 flex-col text-2xl"
            onClick={() => setScan("out")}
          >
            <span className="text-4xl">📤</span>
            เช็คชื่อออกจากห้อง
          </button>
        </div>

        <p className="text-sm text-base-content/50">
          แตะปุ่มแล้วหันหน้าเข้ากล้องเพื่อสแกนใบหน้า
        </p>
      </main>

      {scan && (
        <KioskScanModal room={room} type={scan} onClose={() => setScan(null)} />
      )}
    </div>
  );
}
