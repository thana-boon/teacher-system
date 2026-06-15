import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/schedules?teacherId=... — admin sees all (or filtered), teacher sees own
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  let teacherId = searchParams.get("teacherId") ?? undefined;

  if (session.role === "teacher") {
    teacherId = session.teacherId; // teachers are locked to their own data
  } else if (session.role !== "admin") {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const schedules = await prisma.schedule.findMany({
    where: teacherId ? { teacherId } : undefined,
    orderBy: [{ dayOfWeek: "asc" }, { period: "asc" }],
    select: {
      id: true,
      teacherId: true,
      dayOfWeek: true,
      period: true,
      room: true,
      subject: true,
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

  if (
    !teacherId ||
    !room ||
    !subject ||
    !(dayOfWeek >= 1 && dayOfWeek <= 5) ||
    !(period >= 1 && period <= 8)
  ) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
  }

  const created = await prisma.schedule.create({
    data: { teacherId, dayOfWeek, period, room, subject },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
