import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";

// GET /api/profile — the signed-in teacher's own profile
export async function GET() {
  const session = await getSession();
  if (session?.role !== "teacher" || !session.teacherId) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: session.teacherId },
    select: {
      subject: true,
      phone: true,
      photoBase64: true,
      faceData: true,
      user: { select: { name: true, username: true, email: true } },
    },
  });
  if (!teacher) {
    return NextResponse.json({ error: "ไม่พบข้อมูล" }, { status: 404 });
  }

  return NextResponse.json({
    name: teacher.user.name,
    username: teacher.user.username,
    email: teacher.user.email,
    subject: teacher.subject,
    phone: teacher.phone,
    photoBase64: teacher.photoBase64,
    hasFace: !!teacher.faceData,
  });
}

// PATCH /api/profile — teacher updates their own info / password / photo / face data
export async function PATCH(request: Request) {
  const session = await getSession();
  if (session?.role !== "teacher" || !session.teacherId) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  // User fields
  const userData: { name?: string; password?: string } = {};
  if (typeof body.name === "string" && body.name.trim())
    userData.name = body.name.trim();
  if (typeof body.password === "string" && body.password.length >= 6)
    userData.password = await hashPassword(body.password);
  if (Object.keys(userData).length) {
    await prisma.user.update({ where: { id: session.sub }, data: userData });
  }

  // Teacher fields
  const teacherData: {
    subject?: string | null;
    phone?: string | null;
    photoBase64?: string | null;
    faceData?: string | null;
  } = {};
  if ("subject" in body) teacherData.subject = body.subject || null;
  if ("phone" in body) teacherData.phone = body.phone || null;
  if ("photoBase64" in body) teacherData.photoBase64 = body.photoBase64 || null;
  if ("faceData" in body) teacherData.faceData = body.faceData || null;
  if (Object.keys(teacherData).length) {
    await prisma.teacher.update({
      where: { id: session.teacherId },
      data: teacherData,
    });
  }

  return NextResponse.json({ ok: true });
}
