// One-off, additive migration:
//   - Schedule: add year, term  (backfilled to 2569 / term 1)
//   - Setting:  add currentYear, currentTerm
// Safe to run multiple times. Run: node scripts/migrate-year-term.mjs

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
    console.log(`${table}.${column} already exists — skip`);
    return;
  }
  await client.execute(`ALTER TABLE "${table}" ADD COLUMN ${ddl}`);
  console.log(`${table}.${column} added ✅`);
}

await addColumn("Schedule", "year", `"year" INTEGER NOT NULL DEFAULT 2569`);
await addColumn("Schedule", "term", `"term" INTEGER NOT NULL DEFAULT 1`);
await addColumn("Setting", "currentYear", `"currentYear" INTEGER NOT NULL DEFAULT 2569`);
await addColumn("Setting", "currentTerm", `"currentTerm" INTEGER NOT NULL DEFAULT 1`);

const s = (await client.execute("SELECT currentYear, currentTerm FROM Setting WHERE id='default'")).rows[0];
const n = (await client.execute("SELECT count(*) AS n FROM Schedule")).rows[0].n;
console.log("Done.", { currentYear: s?.currentYear, currentTerm: s?.currentTerm, schedules: n });
await client.close();
