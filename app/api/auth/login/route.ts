import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { signToken, type Role } from "@/lib/jwt";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json(
      { error: "กรุณากรอกอีเมลและรหัสผ่าน" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { teacher: { select: { id: true } } },
  });
  if (!user || !(await verifyPassword(password, user.password))) {
    return NextResponse.json(
      { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" },
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
