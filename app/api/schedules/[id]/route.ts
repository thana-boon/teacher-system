import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// PATCH /api/schedules/[id] — edit a schedule entry (admin)
export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/schedules/[id]">,
) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const data: {
    teacherId?: string;
    dayOfWeek?: number;
    period?: number;
    room?: string;
    subject?: string;
  } = {};
  if (body.teacherId) data.teacherId = String(body.teacherId);
  if (body.dayOfWeek) data.dayOfWeek = Number(body.dayOfWeek);
  if (body.period) data.period = Number(body.period);
  if (typeof body.room === "string") data.room = body.room.trim();
  if (typeof body.subject === "string") data.subject = body.subject.trim();

  await prisma.schedule.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

// DELETE /api/schedules/[id]
export async function DELETE(
  _request: Request,
  { params }: RouteContext<"/api/schedules/[id]">,
) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.attendance.deleteMany({ where: { scheduleId: id } });
  await prisma.schedule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
