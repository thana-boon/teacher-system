import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import {
  zonedDayRange,
  zonedWeekday,
  zonedMinutes,
  hhmmToMinutes,
} from "@/lib/time";
import type { PeriodSlot } from "@/lib/constants";

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
  const today = zonedDayRange(now);
  const settings = await getSettings();
  const grace = settings.lateGraceMinutes ?? 5;

  function periodFor(p: number | null | undefined): PeriodSlot | undefined {
    return p ? settings.periods.find((x) => x.period === p) : undefined;
  }

  // The room's current open check-in today (if any).
  const openInRoom = await prisma.attendance.findFirst({
    where: { room, checkIn: { gte: today.gte, lte: today.lte }, checkOut: null },
    orderBy: { checkIn: "desc" },
    include: { teacher: { select: { user: { select: { name: true } } } } },
  });

  // Current school-time context (used for period matching + punctuality).
  const dow = zonedWeekday(now);
  const nowMin = zonedMinutes(now);
  const activePeriod = settings.periods.find(
    (p) => nowMin >= hhmmToMinutes(p.start) && nowMin <= hhmmToMinutes(p.end),
  );

  if (type === "in") {
    if (openInRoom) {
      // Same teacher tapping again — treat as already checked in.
      if (openInRoom.teacherId === teacherId) {
        return NextResponse.json({
          ok: true,
          already: true,
          name: teacher.user.name,
          checkIn: openInRoom.checkIn,
        });
      }

      // A different teacher wants the room. Allow a hand-over when the previous
      // teacher's period has ended (overstaying) OR the incoming teacher is
      // actually scheduled to teach this room right now — so the next teacher
      // isn't marked late just because the previous one didn't check out.
      let occupantPeriodEnded = false;
      if (openInRoom.scheduleId) {
        const occSched = await prisma.schedule.findUnique({
          where: { id: openInRoom.scheduleId },
          select: { period: true },
        });
        const occSlot = periodFor(occSched?.period);
        if (occSlot && nowMin > hhmmToMinutes(occSlot.end)) occupantPeriodEnded = true;
      }

      let incomingScheduledNow = false;
      if (dow && activePeriod) {
        const s = await prisma.schedule.findFirst({
          where: {
            teacherId,
            room,
            dayOfWeek: dow,
            period: activePeriod.period,
            year: settings.currentYear,
            term: settings.currentTerm,
          },
          select: { id: true },
        });
        incomingScheduledNow = !!s;
      }

      if (occupantPeriodEnded || incomingScheduledNow) {
        // Hand over: auto check-out the previous teacher.
        await prisma.attendance.update({
          where: { id: openInRoom.id },
          data: { checkOut: now },
        });
      } else {
        return NextResponse.json(
          {
            error: `ห้องนี้มี ${openInRoom.teacher.user.name} เช็คอินอยู่ กรุณาเช็คเอาท์ก่อน`,
          },
          { status: 409 },
        );
      }
    }

    // Attach the scheduled period + grade punctuality against the teacher's own period.
    let scheduleId: string | null = null;
    let status: string | null = null;
    let lateMinutes: number | null = null;

    if (dow && activePeriod) {
      const sched = await prisma.schedule.findFirst({
        where: {
          teacherId,
          room,
          dayOfWeek: dow,
          period: activePeriod.period,
          year: settings.currentYear,
          term: settings.currentTerm,
        },
        select: { id: true },
      });
      scheduleId = sched?.id ?? null;
      if (sched) {
        const diff = nowMin - hhmmToMinutes(activePeriod.start);
        lateMinutes = Math.max(0, diff);
        status = lateMinutes > grace ? "late" : "on_time";
      }
    }

    const created = await prisma.attendance.create({
      data: { teacherId, scheduleId, room, checkIn: now, method, status, lateMinutes },
    });
    return NextResponse.json({
      ok: true,
      name: teacher.user.name,
      checkIn: created.checkIn,
      status,
      lateMinutes,
    });
  }

  // type === "out"
  if (!openInRoom) {
    return NextResponse.json({ error: "ห้องนี้ยังไม่มีการเช็คอิน" }, { status: 400 });
  }
  if (openInRoom.teacherId !== teacherId) {
    return NextResponse.json(
      {
        error: `ครูที่เช็คอินในห้องนี้คือ ${openInRoom.teacher.user.name} — ให้ครูคนเดิมเช็คเอาท์`,
      },
      { status: 409 },
    );
  }

  // Early-leave is measured against the end of the checked-in period.
  let earlyMinutes: number | null = null;
  if (openInRoom.scheduleId) {
    const sched = await prisma.schedule.findUnique({
      where: { id: openInRoom.scheduleId },
      select: { period: true },
    });
    const slot = periodFor(sched?.period);
    if (slot) {
      const diff = hhmmToMinutes(slot.end) - zonedMinutes(now);
      earlyMinutes = Math.max(0, diff);
    }
  }

  const updated = await prisma.attendance.update({
    where: { id: openInRoom.id },
    data: { checkOut: now, earlyMinutes },
  });
  return NextResponse.json({
    ok: true,
    name: teacher.user.name,
    checkOut: updated.checkOut,
    earlyMinutes,
  });
}
