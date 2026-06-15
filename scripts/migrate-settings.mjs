// One-off, additive migration: create the Setting table and seed the default row.
// Safe to run multiple times. Run: node scripts/migrate-settings.mjs

import "dotenv/config";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

await client.execute(`CREATE TABLE IF NOT EXISTS "Setting" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "schoolName" TEXT NOT NULL DEFAULT 'โรงเรียนตัวอย่าง',
  "logoBase64" TEXT,
  "periods" TEXT,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);

const DEFAULT_PERIODS = JSON.stringify([
  { period: 1, start: "08:30", end: "09:20" },
  { period: 2, start: "09:20", end: "10:10" },
  { period: 3, start: "10:10", end: "11:00" },
  { period: 4, start: "11:00", end: "11:50" },
  { period: 5, start: "12:50", end: "13:40" },
  { period: 6, start: "13:40", end: "14:30" },
  { period: 7, start: "14:30", end: "15:20" },
  { period: 8, start: "15:20", end: "16:10" },
]);

await client.execute({
  sql: `INSERT OR IGNORE INTO "Setting" ("id","schoolName","periods","updatedAt")
        VALUES ('default', 'โรงเรียนตัวอย่าง', ?, CURRENT_TIMESTAMP)`,
  args: [DEFAULT_PERIODS],
});

const row = (await client.execute("SELECT * FROM Setting WHERE id='default'")).rows[0];
console.log("Setting table ready ✅", {
  schoolName: row.schoolName,
  hasPeriods: !!row.periods,
});
await client.close();
