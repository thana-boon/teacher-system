import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { signToken, type Role } from "@/lib/jwt";

export async function POST(request: Request) {
  let body: { identifier?: string; email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  // Accept either a username or an email in a single field.
  const identifier = (body.identifier ?? body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!identifier || !password) {
    return NextResponse.json(
      { error: "กรุณากรอกชื่อผู้ใช้/อีเมล และรหัสผ่าน" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ username: identifier }, { email: identifier }] },
    include: { teacher: { select: { id: true } } },
  });
  if (!user || !(await verifyPassword(password, user.password))) {
    return NextResponse.json(
      { error: "ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง" },
      { status: 401 },
    );
  }

  const token = await signToken({
    sub: user.id,
    role: user.role as Role,
    name: user.name,
    teacherId: user.teacher?.id,
  });
  await setSessionCookie(token);

  return NextResponse.json({ role: user.role, name: user.name });
}
