// One-off, additive migration: create the Substitution table (per-period
// substitute teachers). Safe to run multiple times.
// Run: node scripts/migrate-substitution.mjs

import "dotenv/config";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

await client.execute(`CREATE TABLE IF NOT EXISTS "Substitution" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "leaveId" TEXT NOT NULL,
  "scheduleId" TEXT NOT NULL,
  "substituteId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);
await client.execute(
  `CREATE INDEX IF NOT EXISTS "Substitution_leaveId_idx" ON "Substitution"("leaveId")`,
);
await client.execute(
  `CREATE INDEX IF NOT EXISTS "Substitution_scheduleId_idx" ON "Substitution"("scheduleId")`,
);

const n = (await client.execute("SELECT count(*) AS n FROM Substitution")).rows[0].n;
console.log("Substitution table ready ✅ (rows:", n + ")");
await client.close();
