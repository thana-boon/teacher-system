// One-off, additive migration: add Attendance.room. Safe to run repeatedly.
// Run: node scripts/migrate-attendance-room.mjs

import "dotenv/config";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const cols = (await client.execute("PRAGMA table_info('Attendance')")).rows.map(
  (r) => r.name,
);
if (cols.includes("room")) {
  console.log("Attendance.room already exists — nothing to do.");
} else {
  await client.execute(`ALTER TABLE "Attendance" ADD COLUMN "room" TEXT`);
  console.log("Attendance.room added ✅");
}
await client.close();
