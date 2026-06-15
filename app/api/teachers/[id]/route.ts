import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole, hashPassword } from "@/lib/auth";

// PATCH /api/teachers/[id] — update teacher info / account (admin)
export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/teachers/[id]">,
) {
  const session = await getSessionWithRole("admin");
  if (!session) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }
  const { id } = await params;

  const teacher = await prisma.teacher.findUnique({ where: { id } });
  if (!teacher) {
    return NextResponse.json({ error: "ไม่พบครู" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  // Update User fields (name / username / email / password)
  const userData: {
    name?: string;
    username?: string | null;
    email?: string | null;
    password?: string;
  } = {};
  if (typeof body.name === "string" && body.name.trim())
    userData.name = body.name.trim();
  if (typeof body.password === "string" && body.password.length >= 6)
    userData.password = await hashPassword(body.password);
  if ("username" in body)
    userData.username = String(body.username ?? "").trim().toLowerCase() || null;
  if ("email" in body)
    userData.email = String(body.email ?? "").trim().toLowerCase() || null;

  if (userData.username || userData.email) {
    const dup = await prisma.user.findFirst({
      where: {
        id: { not: teacher.userId },
        OR: [
          ...(userData.username ? [{ username: userData.username }] : []),
          ...(userData.email ? [{ email: userData.email }] : []),
        ],
      },
    });
    if (dup) {
      return NextResponse.json(
        { error: "ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้งานแล้ว" },
        { status: 409 },
      );
    }
  }

  if (Object.keys(userData).length) {
    await prisma.user.update({ where: { id: teacher.userId }, data: userData });
  }

  // Update Teacher fields
  const teacherData: {
    subject?: string | null;
    phone?: string | null;
    photoBase64?: string | null;
  } = {};
  if ("subject" in body) teacherData.subject = body.subject || null;
  if ("phone" in body) teacherData.phone = body.phone || null;
  if ("photoBase64" in body) teacherData.photoBase64 = body.photoBase64 || null;

  if (Object.keys(teacherData).length) {
    await prisma.teacher.update({ where: { id }, data: teacherData });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/teachers/[id] — remove teacher and the linked user (admin)
export async function DELETE(
  _request: Request,
  { params }: RouteContext<"/api/teachers/[id]">,
) {
  const session = await getSessionWithRole("admin");
  if (!session) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }
  const { id } = await params;

  const teacher = await prisma.teacher.findUnique({ where: { id } });
  if (!teacher) {
    return NextResponse.json({ error: "ไม่พบครู" }, { status: 404 });
  }

  // Clean up dependent rows first (SQLite has no cascade here).
  await prisma.attendance.deleteMany({ where: { teacherId: id } });
  await prisma.leave.deleteMany({ where: { teacherId: id } });
  await prisma.schedule.deleteMany({ where: { teacherId: id } });
  await prisma.teacher.delete({ where: { id } });
  await prisma.user.delete({ where: { id: teacher.userId } });

  return NextResponse.json({ ok: true });
}
