import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { currentPeriod, weekdayOf } from "@/lib/constants";

// POST /api/kiosk/checkin — record a teacher check-in / check-out from a kiosk.
// Public (kiosk has no login); identified by teacherId resolved via face match.
// Body: { teacherId, room, type: "in" | "out", method?: "face" | "manual" }
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

  // Try to attach the matching scheduled period (this room, now).
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

  if (type === "in") {
    // Avoid duplicate check-in for the same schedule/day.
    const existing = await prisma.attendance.findFirst({
      where: {
        teacherId,
        checkIn: { gte: startOfDay, lte: endOfDay },
        ...(scheduleId ? { scheduleId } : {}),
      },
      orderBy: { checkIn: "desc" },
    });
    if (existing) {
      return NextResponse.json({
        ok: true,
        already: true,
        name: teacher.user.name,
        checkIn: existing.checkIn,
      });
    }
    const created = await prisma.attendance.create({
      data: { teacherId, scheduleId, checkIn: now, method },
    });
    return NextResponse.json({ ok: true, name: teacher.user.name, checkIn: created.checkIn });
  }

  // type === "out": close the latest open attendance today.
  const open = await prisma.attendance.findFirst({
    where: {
      teacherId,
      checkIn: { gte: startOfDay, lte: endOfDay },
      checkOut: null,
    },
    orderBy: { checkIn: "desc" },
  });
  if (!open) {
    return NextResponse.json(
      { error: "ยังไม่ได้เช็คชื่อเข้า หรือเช็คออกไปแล้ว" },
      { status: 400 },
    );
  }
  const updated = await prisma.attendance.update({
    where: { id: open.id },
    data: { checkOut: now },
  });
  return NextResponse.json({ ok: true, name: teacher.user.name, checkOut: updated.checkOut });
}
