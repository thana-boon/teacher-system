import { NextResponse } from "next/server";
import { getSessionWithRole } from "@/lib/auth";
import { getDailyReport } from "@/lib/reports";

// GET /api/reports/daily?date=YYYY-MM-DD — daily attendance grid (admin)
export async function GET(request: Request) {
  const session = await getSessionWithRole("admin");
  if (!session) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }
  const date = new URL(request.url).searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "วันที่ไม่ถูกต้อง" }, { status: 400 });
  }
  return NextResponse.json(await getDailyReport(date));
}
