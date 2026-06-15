import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/kiosk/teachers — enrolled teachers with their face descriptors,
// for client-side matching at the kiosk. Public (kiosk has no login).
// ?all=1 → return every teacher (id + name only) for the manual fallback.
export async function GET(request: Request) {
  const all = new URL(request.url).searchParams.get("all");
  if (all) {
    const list = await prisma.teacher.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, photoBase64: true, user: { select: { name: true } } },
    });
    return NextResponse.json({
      teachers: list.map((t) => ({
        teacherId: t.id,
        name: t.user.name,
        photo: t.photoBase64,
      })),
    });
  }

  const teachers = await prisma.teacher.findMany({
    where: { faceData: { not: null } },
    select: {
      id: true,
      faceData: true,
      photoBase64: true,
      user: { select: { name: true } },
    },
  });

  const candidates = teachers
    .map((t) => {
      let descriptors: number[][] = [];
      try {
        const parsed = JSON.parse(t.faceData!);
        // Accept either number[][] or a single number[].
        if (Array.isArray(parsed) && Array.isArray(parsed[0])) descriptors = parsed;
        else if (Array.isArray(parsed)) descriptors = [parsed as number[]];
      } catch {
        descriptors = [];
      }
      return {
        teacherId: t.id,
        name: t.user.name,
        photo: t.photoBase64,
        descriptors,
      };
    })
    .filter((c) => c.descriptors.length > 0);

  return NextResponse.json({ teachers: candidates });
}
