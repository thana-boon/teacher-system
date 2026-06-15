import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole, hashPassword } from "@/lib/auth";

const ROLES = ["admin", "teacher", "kiosk"];

// PATCH /api/users/[id] — update name / password / role (admin)
export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/users/[id]">,
) {
  const session = await getSessionWithRole("admin");
  if (!session) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: { teacher: { select: { id: true } } },
  });
  if (!user) {
    return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const data: { name?: string; password?: string; role?: string } = {};
  if (typeof body.name === "string" && body.name.trim())
    data.name = body.name.trim();
  if (typeof body.password === "string" && body.password.length >= 6)
    data.password = await hashPassword(body.password);
  if (typeof body.role === "string" && ROLES.includes(body.role)) {
    if (body.role !== user.role && id === session.sub) {
      return NextResponse.json(
        { error: "ไม่สามารถเปลี่ยน role ของตัวเองได้" },
        { status: 400 },
      );
    }
    data.role = body.role;
    // Becoming a teacher needs a linked Teacher record.
    if (body.role === "teacher" && !user.teacher) {
      await prisma.teacher.create({ data: { userId: id } });
    }
  }

  await prisma.user.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

// DELETE /api/users/[id] — remove an account (admin, cannot delete self)
export async function DELETE(
  _request: Request,
  { params }: RouteContext<"/api/users/[id]">,
) {
  const session = await getSessionWithRole("admin");
  if (!session) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }
  const { id } = await params;

  if (id === session.sub) {
    return NextResponse.json(
      { error: "ไม่สามารถลบบัญชีของตัวเองได้" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: { teacher: { select: { id: true } } },
  });
  if (!user) {
    return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
  }

  // Clean up teacher-owned rows first (SQLite, no cascade).
  if (user.teacher) {
    const tId = user.teacher.id;
    await prisma.attendance.deleteMany({ where: { teacherId: tId } });
    await prisma.leave.deleteMany({ where: { teacherId: tId } });
    await prisma.schedule.deleteMany({ where: { teacherId: tId } });
    await prisma.teacher.delete({ where: { id: tId } });
  }
  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
