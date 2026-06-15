import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/auth";

// GET /api/teachers/[id]/photo — fetch the stored photo (admin), kept off the
// list endpoint so the table stays light.
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/teachers/[id]/photo">,
) {
  const session = await getSessionWithRole("admin");
  if (!session) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }
  const { id } = await params;
  const teacher = await prisma.teacher.findUnique({
    where: { id },
    select: { photoBase64: true },
  });
  if (!teacher) {
    return NextResponse.json({ error: "ไม่พบครู" }, { status: 404 });
  }
  return NextResponse.json({ photoBase64: teacher.photoBase64 });
}
