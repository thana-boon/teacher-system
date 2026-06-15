import { NextResponse } from "next/server";
import { getSessionWithRole } from "@/lib/auth";
import { getTeacherReport } from "@/lib/reports";

// GET /api/reports/teacher?teacherId=...&month=YYYY-MM — per-teacher report (admin)
export async function GET(request: Request) {
  const session = await getSessionWithRole("admin");
  if (!session) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get("teacherId") ?? "";
  const month = searchParams.get("month") ?? "";
  if (!teacherId || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const report = await getTeacherReport(teacherId, month);
  if (!report) return NextResponse.json({ error: "ไม่พบครู" }, { status: 404 });
  return NextResponse.json(report);
}
