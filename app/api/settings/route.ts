import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { getSessionWithRole } from "@/lib/auth";
import type { PeriodSlot } from "@/lib/constants";

// GET /api/settings — public (school name / logo / periods are shown everywhere,
// including the no-login kiosk).
export async function GET() {
  const settings = await getSettings();
  return NextResponse.json(settings);
}

function sanitizePeriods(input: unknown): string | undefined {
  if (!Array.isArray(input)) return undefined;
  const cleaned: PeriodSlot[] = input
    .map((p, i) => ({
      period: i + 1, // renumber sequentially
      start: String((p as PeriodSlot)?.start ?? "").trim(),
      end: String((p as PeriodSlot)?.end ?? "").trim(),
    }))
    .filter((p) => /^\d{1,2}:\d{2}$/.test(p.start) && /^\d{1,2}:\d{2}$/.test(p.end));
  return JSON.stringify(cleaned);
}

// PATCH /api/settings — admin updates school name / logo / periods
export async function PATCH(request: Request) {
  const session = await getSessionWithRole("admin");
  if (!session) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const data: {
    schoolName?: string;
    logoBase64?: string | null;
    periods?: string;
  } = {};
  if (typeof body.schoolName === "string" && body.schoolName.trim())
    data.schoolName = body.schoolName.trim();
  if ("logoBase64" in body) data.logoBase64 = body.logoBase64 || null;
  if ("periods" in body) {
    const periods = sanitizePeriods(body.periods);
    if (periods !== undefined) data.periods = periods;
  }

  await prisma.setting.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });

  return NextResponse.json({ ok: true });
}
