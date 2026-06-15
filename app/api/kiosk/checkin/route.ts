import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { currentPeriod, weekdayOf } from "@/lib/constants";

// POST /api/kiosk/checkin — record a teacher check-in / check-out from a kiosk.
// Public (kiosk has no login); identified by teacherId resolved via face match.
// Body: { teacherId, room, type: "in" | "out", method?: "face" | "manual" }
//
// Occupancy is tracked per ROOM: a room can hold one open check-in at a time.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const teacherId = String(body?.teacherId ?? "");
  const room = String(body?.room ?? "").trim();
  const type = body?.type === "out" ? "out" : "in";
  const method = body?.method === "manual" ? "manual" : "face";

  if (!teacherId || !room) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { id: true, user: { select: { name: true } } },
  });
  if (!teacher) {
    return NextResponse.json({ error: "ไม่พบครู" }, { status: 404 });
  }

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  // The room's current open check-in today (if any).
  const openInRoom = await prisma.attendance.findFirst({
    where: { room, checkIn: { gte: startOfDay, lte: endOfDay }, checkOut: null },
    orderBy: { checkIn: "desc" },
    include: { teacher: { select: { user: { select: { name: true } } } } },
  });

  if (type === "in") {
    if (openInRoom) {
      const who = openInRoom.teacher.user.name;
      if (openInRoom.teacherId === teacherId) {
        return NextResponse.json({
          ok: true,
          already: true,
          name: teacher.user.name,
          checkIn: openInRoom.checkIn,
        });
      }
      return NextResponse.json(
        { error: `ห้องนี้มี ${who} เช็คอินอยู่ กรุณาเช็คเอาท์ก่อน` },
        { status: 409 },
      );
    }

    // Attach the matching scheduled period if there is one.
    const settings = await getSettings();
    const dow = weekdayOf(now);
    const period = currentPeriod(settings.periods, now);
    let scheduleId: string | null = null;
    if (dow && period) {
      const sched = await prisma.schedule.findFirst({
        where: {
          teacherId,
          room,
          dayOfWeek: dow,
          period: period.period,
          year: settings.currentYear,
          term: settings.currentTerm,
        },
        select: { id: true },
      });
      scheduleId = sched?.id ?? null;
    }

    const created = await prisma.attendance.create({
      data: { teacherId, scheduleId, room, checkIn: now, method },
    });
    return NextResponse.json({ ok: true, name: teacher.user.name, checkIn: created.checkIn });
  }

  // type === "out"
  if (!openInRoom) {
    return NextResponse.json(
      { error: "ห้องนี้ยังไม่มีการเช็คอิน" },
      { status: 400 },
    );
  }
  if (openInRoom.teacherId !== teacherId) {
    return NextResponse.json(
      {
        error: `ครูที่เช็คอินในห้องนี้คือ ${openInRoom.teacher.user.name} — ให้ครูคนเดิมเช็คเอาท์`,
      },
      { status: 409 },
    );
  }

  const updated = await prisma.attendance.update({
    where: { id: openInRoom.id },
    data: { checkOut: now },
  });
  return NextResponse.json({ ok: true, name: teacher.user.name, checkOut: updated.checkOut });
}
