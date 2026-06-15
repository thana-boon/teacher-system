import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/kiosk/room-status?room=... — is anyone currently checked in to this
// room today? Public (kiosk has no login). Drives which button the kiosk shows.
export async function GET(request: Request) {
  const room = (new URL(request.url).searchParams.get("room") ?? "").trim();
  if (!room) {
    return NextResponse.json({ error: "ต้องระบุห้อง" }, { status: 400 });
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const open = await prisma.attendance.findFirst({
    where: { room, checkIn: { gte: start, lte: end }, checkOut: null },
    orderBy: { checkIn: "desc" },
    select: {
      checkIn: true,
      teacherId: true,
      teacher: { select: { user: { select: { name: true } } } },
    },
  });

  return NextResponse.json(
    open
      ? {
          occupied: true,
          teacherId: open.teacherId,
          teacherName: open.teacher.user.name,
          checkIn: open.checkIn,
        }
      : { occupied: false },
  );
}
