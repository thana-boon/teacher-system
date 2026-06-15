// One-off, data-preserving migration:
//   - add User.username (TEXT, UNIQUE, nullable)
//   - make User.email nullable
//
// SQLite can't drop a NOT NULL constraint in place, so we rebuild the User
// table and copy every row across. Run once:  node scripts/migrate-username.mjs

import "dotenv/config";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const before = (await client.execute("SELECT count(*) AS n FROM User")).rows[0].n;

const cols = (await client.execute("PRAGMA table_info('User')")).rows.map(
  (r) => r.name,
);
if (cols.includes("username")) {
  console.log("username column already exists — nothing to do.");
  await client.close();
  process.exit(0);
}

await client.execute("PRAGMA foreign_keys=OFF");
await client.batch(
  [
    `CREATE TABLE "User_new" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "username" TEXT,
      "email" TEXT,
      "password" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'teacher',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `INSERT INTO "User_new" ("id","name","username","email","password","role","createdAt")
       SELECT "id","name",NULL,"email","password","role","createdAt" FROM "User"`,
    `DROP TABLE "User"`,
    `ALTER TABLE "User_new" RENAME TO "User"`,
    `CREATE UNIQUE INDEX "User_username_key" ON "User"("username")`,
    `CREATE UNIQUE INDEX "User_email_key" ON "User"("email")`,
  ],
  "write",
);
await client.execute("PRAGMA foreign_keys=ON");

const after = (await client.execute("SELECT count(*) AS n FROM User")).rows[0].n;
console.log(`User rows before=${before} after=${after}`);
if (Number(before) !== Number(after)) {
  console.error("⚠️  row count changed — please verify!");
  process.exit(1);
}
console.log("Migration complete ✅ (username added, email now optional)");
await client.close();
