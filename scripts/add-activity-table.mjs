// Additively create the `Activity` table on Turso without touching other tables.
//
// Why not `npm run db:push`: that script regenerates CREATE TABLE for the WHOLE
// schema from empty, which fails (and risks data) on a live DB that already has
// the other tables. dev + Vercel share one real DB, so we only add what's new.
//
// Usage: node scripts/add-activity-table.mjs

import "dotenv/config";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env");
  process.exit(1);
}

const client = createClient({ url, authToken });

await client.batch(
  [
    `CREATE TABLE IF NOT EXISTS "Activity" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "date" TEXT NOT NULL,
      "period" INTEGER NOT NULL,
      "name" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Activity_date_period_key" ON "Activity"("date", "period")`,
  ],
  "write",
);

console.log("Activity table is ready ✅");
await client.close();
