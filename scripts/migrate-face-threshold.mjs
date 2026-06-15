// One-off, additive migration: add Setting.faceThreshold. Safe to run repeatedly.
// Run: node scripts/migrate-face-threshold.mjs

import "dotenv/config";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const cols = (await client.execute("PRAGMA table_info('Setting')")).rows.map(
  (r) => r.name,
);
if (cols.includes("faceThreshold")) {
  console.log("Setting.faceThreshold already exists — nothing to do.");
} else {
  await client.execute(
    `ALTER TABLE "Setting" ADD COLUMN "faceThreshold" REAL NOT NULL DEFAULT 0.45`,
  );
  console.log("Setting.faceThreshold added ✅");
}
await client.close();
