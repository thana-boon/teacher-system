import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/auth";

// GET /api/activities?date=YYYY-MM-DD — activities for a date (admin)
export async function GET(request: Request) {
  if (!(await getSessionWithRole("admin"))) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }
  const date = (new URL(request.url).searchParams.get("date") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "วันที่ไม่ถูกต้อง" }, { status: 400 });
  }
  const activities = await prisma.activity.findMany({
    where: { date },
    orderBy: { period: "asc" },
    select: { id: true, period: true, name: true },
  });
  return NextResponse.json(activities);
}

// POST /api/activities — replace the whole activity set for a date (admin).
// Body: { date, items: [{ period, name }] } — items with no period are skipped.
export async function POST(request: Request) {
  if (!(await getSessionWithRole("admin"))) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const date = String(body?.date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "วันที่ไม่ถูกต้อง" }, { status: 400 });
  }

  const rows = (Array.isArray(body?.items) ? body.items : [])
    .filter((it: { period?: number }) => Number.isInteger(Number(it?.period)))
    .map((it: { period: number; name?: string }) => ({
      date,
      period: Number(it.period),
      name: String(it.name ?? "").trim() || "กิจกรรม",
    }));

  await prisma.activity.deleteMany({ where: { date } });
  if (rows.length) await prisma.activity.createMany({ data: rows });

  return NextResponse.json({ ok: true, count: rows.length });
}
