import "dotenv/config";
import { defineConfig } from "prisma/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Driver adapter — used by Prisma Client at RUNTIME to talk to Turso.
    //
    // NOTE: Prisma's schema engine (`prisma db push` / `prisma migrate`) cannot
    // use this adapter and cannot connect to a remote `libsql://` URL, so it is
    // not used for schema changes. Apply schema to Turso with `npm run db:push`
    // (scripts/db-push.mjs), which uses @libsql/client directly.
    adapter: async () =>
      new PrismaLibSql({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
      }),
  },
});
