import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole, hashPassword } from "@/lib/auth";

const ROLES = ["admin", "teacher", "kiosk"];

// GET /api/users — list all accounts (admin)
export async function GET() {
  const session = await getSessionWithRole("admin");
  if (!session) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  return NextResponse.json(users);
}

// POST /api/users — create an account of any role (admin)
export async function POST(request: Request) {
  const session = await getSessionWithRole("admin");
  if (!session) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const role = String(body?.role ?? "");

  if (!name || !email || password.length < 6 || !ROLES.includes(role)) {
    return NextResponse.json(
      { error: "กรุณากรอกข้อมูลให้ครบ (รหัสผ่านอย่างน้อย 6 ตัว)" },
      { status: 400 },
    );
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ error: "อีเมลนี้ถูกใช้งานแล้ว" }, { status: 409 });
  }

  await prisma.user.create({
    data: {
      name,
      email,
      password: await hashPassword(password),
      role,
      // teachers need a linked Teacher record so the teacher pages work
      ...(role === "teacher" ? { teacher: { create: {} } } : {}),
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
