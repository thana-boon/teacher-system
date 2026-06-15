// One-off, additive migration: punctuality fields. Safe to run repeatedly.
//   - Setting.lateGraceMinutes
//   - Attendance.status / lateMinutes / earlyMinutes
// Run: node scripts/migrate-punctuality.mjs

import "dotenv/config";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function addColumn(table, column, ddl) {
  const cols = (await client.execute(`PRAGMA table_info('${table}')`)).rows.map(
    (r) => r.name,
  );
  if (cols.includes(column)) {
    console.log(`${table}.${column} exists — skip`);
    return;
  }
  await client.execute(`ALTER TABLE "${table}" ADD COLUMN ${ddl}`);
  console.log(`${table}.${column} added ✅`);
}

await addColumn("Setting", "lateGraceMinutes", `"lateGraceMinutes" INTEGER NOT NULL DEFAULT 5`);
await addColumn("Attendance", "status", `"status" TEXT`);
await addColumn("Attendance", "lateMinutes", `"lateMinutes" INTEGER`);
await addColumn("Attendance", "earlyMinutes", `"earlyMinutes" INTEGER`);

await client.close();
console.log("Done.");
