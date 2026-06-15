import "server-only";
import { prisma } from "./prisma";
import { DEFAULT_PERIODS, type PeriodSlot } from "./constants";

export type SiteSettings = {
  schoolName: string;
  logoBase64: string | null;
  periods: PeriodSlot[];
  currentYear: number;
  currentTerm: number;
  lateGraceMinutes: number;
  faceThreshold: number;
  termStart: string | null; // "YYYY-MM-DD"
  termEnd: string | null;
  holidays: { date: string; name: string }[];
};

export const DEFAULT_SCHOOL_NAME = "โรงเรียนตัวอย่าง";

function parsePeriods(raw: string | null | undefined): PeriodSlot[] {
  if (!raw) return DEFAULT_PERIODS;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) {
      return parsed
        .map((p, i) => ({
          period: Number(p.period ?? i + 1),
          start: String(p.start ?? ""),
          end: String(p.end ?? ""),
        }))
        .filter((p) => p.start && p.end);
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_PERIODS;
}

function parseHolidays(raw: string | null | undefined): { date: string; name: string }[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((h) => ({ date: String(h.date ?? ""), name: String(h.name ?? "") }))
        .filter((h) => /^\d{4}-\d{2}-\d{2}$/.test(h.date));
    }
  } catch {
    // ignore
  }
  return [];
}

/** Read site-wide settings (server-side), always returning sensible defaults. */
export async function getSettings(): Promise<SiteSettings> {
  const row = await prisma.setting.findUnique({ where: { id: "default" } });
  return {
    schoolName: row?.schoolName?.trim() || DEFAULT_SCHOOL_NAME,
    logoBase64: row?.logoBase64 ?? null,
    periods: parsePeriods(row?.periods),
    currentYear: row?.currentYear ?? 2569,
    currentTerm: row?.currentTerm ?? 1,
    lateGraceMinutes: row?.lateGraceMinutes ?? 5,
    faceThreshold: row?.faceThreshold ?? 0.45,
    termStart: row?.termStart ?? null,
    termEnd: row?.termEnd ?? null,
    holidays: parseHolidays(row?.holidays),
  };
}
