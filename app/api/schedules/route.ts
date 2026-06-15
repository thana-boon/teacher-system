import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

// GET /api/schedules?teacherId=... — admin sees all (or filtered), teacher sees own
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  let teacherId = searchParams.get("teacherId") ?? undefined;
  const yearParam = searchParams.get("year");
  const termParam = searchParams.get("term");

  if (session.role === "teacher") {
    teacherId = session.teacherId; // teachers are locked to their own data
  } else if (session.role !== "admin") {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const where: { teacherId?: string; year?: number; term?: number } = {};
  if (teacherId) where.teacherId = teacherId;
  if (yearParam) where.year = Number(yearParam);
  if (termParam) where.term = Number(termParam);

  const schedules = await prisma.schedule.findMany({
    where,
    orderBy: [{ dayOfWeek: "asc" }, { period: "asc" }],
    select: {
      id: true,
      teacherId: true,
      dayOfWeek: true,
      period: true,
      room: true,
      subject: true,
      year: true,
      term: true,
      teacher: { select: { user: { select: { name: true } } } },
    },
  });

  return NextResponse.json(
    schedules.map((s) => ({
      id: s.id,
      teacherId: s.teacherId,
      teacherName: s.teacher.user.name,
      dayOfWeek: s.dayOfWeek,
      period: s.period,
      room: s.room,
      subject: s.subject,
      year: s.year,
      term: s.term,
    })),
  );
}

// POST /api/schedules — create a schedule entry (admin)
export async function POST(request: Request) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const teacherId = String(body?.teacherId ?? "");
  const dayOfWeek = Number(body?.dayOfWeek);
  const period = Number(body?.period);
  const room = String(body?.room ?? "").trim();
  const subject = String(body?.subject ?? "").trim();

  // Fall back to the active academic period if the client doesn't specify one.
  const settings = await getSettings();
  const year = Number(body?.year) || settings.currentYear;
  const term = [1, 2].includes(Number(body?.term))
    ? Number(body.term)
    : settings.currentTerm;

  if (
    !teacherId ||
    !room ||
    !subject ||
    !(dayOfWeek >= 1 && dayOfWeek <= 5) ||
    !(period >= 1 && period <= 50)
  ) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
  }

  const created = await prisma.schedule.create({
    data: { teacherId, dayOfWeek, period, room, subject, year, term },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
