import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// PATCH /api/leaves/[id] — admin approves/rejects (and may assign a substitute)
export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/leaves/[id]">,
) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const status = String(body?.status ?? "");
  if (!["approved", "rejected", "pending"].includes(status)) {
    return NextResponse.json({ error: "สถานะไม่ถูกต้อง" }, { status: 400 });
  }

  await prisma.leave.update({
    where: { id },
    data: {
      status,
      substituteId:
        "substituteId" in (body ?? {}) ? body.substituteId || null : undefined,
    },
  });

  return NextResponse.json({ ok: true });
}

// DELETE /api/leaves/[id] — a teacher may withdraw their own pending request
export async function DELETE(
  _request: Request,
  { params }: RouteContext<"/api/leaves/[id]">,
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }
  const { id } = await params;
  const leave = await prisma.leave.findUnique({ where: { id } });
  if (!leave) {
    return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 });
  }

  const isOwnerPending =
    session.role === "teacher" &&
    leave.teacherId === session.teacherId &&
    leave.status === "pending";
  if (session.role !== "admin" && !isOwnerPending) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 403 });
  }

  await prisma.leave.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
