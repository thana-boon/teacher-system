import { NextResponse } from "next/server";
import { getSessionWithRole } from "@/lib/auth";
import { getMonthlyReport } from "@/lib/reports";

// GET /api/reports?month=YYYY-MM — monthly attendance/leave summary (admin)
export async function GET(request: Request) {
  const session = await getSessionWithRole("admin");
  if (!session) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const month = new URL(request.url).searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "เดือนไม่ถูกต้อง" }, { status: 400 });
  }

  return NextResponse.json(await getMonthlyReport(month));
}
