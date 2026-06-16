import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/leaves?status=pending — admin: all (optionally filtered), teacher: own
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;

  const where: { teacherId?: string; status?: string } = {};
  if (session.role === "teacher") {
    where.teacherId = session.teacherId;
  } else if (session.role !== "admin") {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }
  if (status) where.status = status;

  const leaves = await prisma.leave.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      date: true,
      reason: true,
      type: true,
      status: true,
      createdAt: true,
      teacherId: true,
      teacher: { select: { user: { select: { name: true } } } },
      substitutions: {
        select: {
          scheduleId: true,
          substituteId: true,
          schedule: { select: { period: true, room: true, subject: true } },
        },
      },
    },
  });

  // Resolve substitute teacher names (substituteId is a plain Teacher id).
  const subIds = [
    ...new Set(leaves.flatMap((l) => l.substitutions.map((s) => s.substituteId))),
  ];
  const subs = subIds.length
    ? await prisma.teacher.findMany({
        where: { id: { in: subIds } },
        select: { id: true, user: { select: { name: true } } },
      })
    : [];
  const subName = new Map(subs.map((t) => [t.id, t.user.name]));

  return NextResponse.json(
    leaves.map((l) => ({
      id: l.id,
      teacherId: l.teacherId,
      teacherName: l.teacher.user.name,
      date: l.date,
      reason: l.reason,
      type: l.type,
      status: l.status,
      createdAt: l.createdAt,
      substitutions: l.substitutions
        .map((s) => ({
          scheduleId: s.scheduleId,
          period: s.schedule.period,
          room: s.schedule.room,
          subject: s.schedule.subject,
          substituteId: s.substituteId,
          substituteName: subName.get(s.substituteId) ?? null,
        }))
        .sort((a, b) => a.period - b.period),
    })),
  );
}

// POST /api/leaves
//  - teacher: submit a leave request (status pending)
//  - admin: record an official duty (ไปราชการ) for a teacher — auto-approved with
//    per-period substitutes. Body: { teacherId, date, reason, substitutions:[{scheduleId,substituteId}] }
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const date = body?.date ? new Date(body.date) : null;
  const reason = String(body?.reason ?? "").trim();

  if (session.role === "admin") {
    const teacherId = String(body?.teacherId ?? "");
    if (!teacherId || !date || isNaN(date.getTime())) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
    }
    const created = await prisma.leave.create({
      data: {
        teacherId,
        date,
        reason: reason || "ไปราชการ",
        type: "official",
        status: "approved",
      },
    });
    // Per-period substitutes (same shape as the approve flow).
    const subs = (Array.isArray(body?.substitutions) ? body.substitutions : [])
      .filter(
        (s: { scheduleId?: string; substituteId?: string }) =>
          s?.scheduleId && s?.substituteId,
      )
      .map((s: { scheduleId: string; substituteId: string }) => ({
        leaveId: created.id,
        scheduleId: s.scheduleId,
        substituteId: s.substituteId,
      }));
    if (subs.length) await prisma.substitution.createMany({ data: subs });
    return NextResponse.json({ id: created.id }, { status: 201 });
  }

  if (session.role !== "teacher" || !session.teacherId) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const type = String(body?.type ?? "");
  if (!date || isNaN(date.getTime()) || !reason || !["sick", "personal", "other"].includes(type)) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
  }

  const created = await prisma.leave.create({
    data: { teacherId: session.teacherId, date, reason, type, status: "pending" },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
