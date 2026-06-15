import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

// GET /api/kiosk/rooms — distinct rooms in the current academic period.
// Public (kiosk has no login).
export async function GET() {
  const settings = await getSettings();
  const schedules = await prisma.schedule.findMany({
    where: { year: settings.currentYear, term: settings.currentTerm },
    select: { room: true },
    distinct: ["room"],
    orderBy: { room: "asc" },
  });
  return NextResponse.json({ rooms: schedules.map((s) => s.room) });
}
