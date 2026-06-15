import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole, hashPassword } from "@/lib/auth";

// GET /api/teachers — list all teachers (admin)
export async function GET() {
  const session = await getSessionWithRole("admin");
  if (!session) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const teachers = await prisma.teacher.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      subject: true,
      phone: true,
      photoBase64: true,
      faceData: true,
      user: { select: { id: true, name: true, username: true, email: true } },
    },
  });

  // Photos are downscaled client-side (~50KB), so it's fine to include them
  // for the list thumbnails. Face embeddings are still kept off the wire here.
  const list = teachers.map((t) => ({
    id: t.id,
    name: t.user.name,
    username: t.user.username,
    email: t.user.email,
    subject: t.subject,
    phone: t.phone,
    photo: t.photoBase64,
    hasPhoto: !!t.photoBase64,
    hasFace: !!t.faceData,
  }));

  return NextResponse.json(list);
}

// POST /api/teachers — create a teacher account (admin)
export async function POST(request: Request) {
  const session = await getSessionWithRole("admin");
  if (!session) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const username = String(body.username ?? "").trim().toLowerCase() || null;
  const email = String(body.email ?? "").trim().toLowerCase() || null;
  const password = String(body.password ?? "");
  const subject = body.subject ? String(body.subject).trim() : null;
  const phone = body.phone ? String(body.phone).trim() : null;
  const photoBase64 = body.photoBase64 ? String(body.photoBase64) : null;
  const faceData = body.faceData ? String(body.faceData) : null;

  if (!name || password.length < 6) {
    return NextResponse.json(
      { error: "กรุณากรอกชื่อ และรหัสผ่าน (อย่างน้อย 6 ตัว)" },
      { status: 400 },
    );
  }
  if (!username && !email) {
    return NextResponse.json(
      { error: "ต้องระบุชื่อผู้ใช้ หรืออีเมล อย่างน้อยหนึ่งอย่าง" },
      { status: 400 },
    );
  }

  const exists = await prisma.user.findFirst({
    where: {
      OR: [
        ...(username ? [{ username }] : []),
        ...(email ? [{ email }] : []),
      ],
    },
  });
  if (exists) {
    return NextResponse.json(
      { error: "ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้งานแล้ว" },
      { status: 409 },
    );
  }

  const user = await prisma.user.create({
    data: {
      name,
      username,
      email,
      password: await hashPassword(password),
      role: "teacher",
      teacher: { create: { subject, phone, photoBase64, faceData } },
    },
    include: { teacher: { select: { id: true } } },
  });

  return NextResponse.json(
    { id: user.teacher!.id, name: user.name },
    { status: 201 },
  );
}
