// One-off, additive migration: term range + holidays. Safe to run repeatedly.
//   - Setting.termStart / termEnd (TEXT "YYYY-MM-DD")
//   - Setting.holidays (TEXT JSON)
// Run: node scripts/migrate-term-holidays.mjs

import "dotenv/config";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function addColumn(column, ddl) {
  const cols = (await client.execute("PRAGMA table_info('Setting')")).rows.map(
    (r) => r.name,
  );
  if (cols.includes(column)) {
    console.log(`Setting.${column} exists — skip`);
    return;
  }
  await client.execute(`ALTER TABLE "Setting" ADD COLUMN ${ddl}`);
  console.log(`Setting.${column} added ✅`);
}

await addColumn("termStart", `"termStart" TEXT`);
await addColumn("termEnd", `"termEnd" TEXT`);
await addColumn("holidays", `"holidays" TEXT`);

await client.close();
console.log("Done.");
