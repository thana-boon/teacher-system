"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ROOM_KEY = "kioskRoom";

export default function KioskLanding() {
  const router = useRouter();
  const [rooms, setRooms] = useState<string[]>([]);
  const [school, setSchool] = useState<{ schoolName: string; logoBase64: string | null }>({
    schoolName: "",
    logoBase64: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If a room was already chosen on this device, jump straight in.
    const saved = typeof window !== "undefined" ? localStorage.getItem(ROOM_KEY) : null;
    if (saved) {
      router.replace(`/kiosk/room/${encodeURIComponent(saved)}`);
      return;
    }
    Promise.all([
      fetch("/api/kiosk/rooms").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]).then(([roomsData, s]) => {
      setRooms(roomsData.rooms ?? []);
      setSchool({ schoolName: s.schoolName ?? "", logoBase64: s.logoBase64 ?? null });
      setLoading(false);
    });
  }, [router]);

  function chooseRoom(room: string) {
    localStorage.setItem(ROOM_KEY, room);
    router.replace(`/kiosk/room/${encodeURIComponent(room)}`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-base-200 p-6">
      <div className="mb-6 text-center">
        {school.logoBase64 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={school.logoBase64} alt="โลโก้" className="mx-auto mb-2 h-20 w-20 object-contain" />
        ) : (
          <div className="mb-2 text-6xl">🦆</div>
        )}
        <h1 className="text-3xl font-bold">{school.schoolName || "ระบบเช็คชื่อ"}</h1>
        <p className="mt-1 text-base-content/60">เลือกห้องสำหรับเครื่องนี้</p>
      </div>

      {loading ? (
        <span className="loading loading-spinner loading-lg" />
      ) : rooms.length === 0 ? (
        <p className="text-base-content/50">ยังไม่มีห้องในตารางสอน</p>
      ) : (
        <div className="grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
          {rooms.map((room) => (
            <button
              key={room}
              className="btn btn-primary btn-lg h-20 text-xl"
              onClick={() => chooseRoom(room)}
            >
              {room}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
