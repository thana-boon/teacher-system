// Push the Prisma schema to Turso.
//
// Why this exists: Prisma 7's schema engine (`prisma db push` / `prisma migrate`)
// cannot connect to a remote `libsql://` database — driver adapters only work in
// Prisma Client at runtime. This script bridges the gap:
//   1. Use the Prisma CLI offline to turn schema.prisma into plain SQLite DDL.
//   2. Apply that DDL to Turso over libSQL using the credentials in .env.
//
// Usage:
//   npm run db:push          # create tables that don't exist yet
//   npm run db:push -- --reset   # DROP every table first, then recreate (data loss)

import "dotenv/config";
import { execFileSync } from "node:child_process";
import { createClient } from "@libsql/client";

const reset = process.argv.includes("--reset");

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env");
  process.exit(1);
}

// 1. Generate CREATE TABLE statements from the schema (no DB connection needed).
const ddl = execFileSync(
  "npx",
  [
    "prisma",
    "migrate",
    "diff",
    "--from-empty",
    "--to-schema",
    "prisma/schema.prisma",
    "--script",
  ],
  { encoding: "utf-8" },
);

// Strip comment lines, split into individual statements.
const statements = ddl
  .split(";")
  .map((s) =>
    s
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .trim(),
  )
  .filter(Boolean);

const client = createClient({ url, authToken });

if (reset) {
  const { rows } = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%'",
  );
  if (rows.length) {
    await client.execute("PRAGMA foreign_keys=OFF");
    await client.batch(
      rows.map((r) => `DROP TABLE IF EXISTS "${r.name}"`),
      "write",
    );
    await client.execute("PRAGMA foreign_keys=ON");
    console.log(`Dropped ${rows.length} existing table(s).`);
  }
}

await client.batch(statements, "write");
console.log(`Applied ${statements.length} statement(s) to Turso ✅`);

await client.close();
