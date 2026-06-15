// Seed the Turso database with demo accounts and a sample timetable.
//
// Usage: npm run db:seed
//
// Idempotent: existing users (matched by email) are updated, not duplicated.

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

const PASSWORD = "password123";

async function upsertUser({ email, name, role }) {
  const password = await bcrypt.hash(PASSWORD, 10);
  return prisma.user.upsert({
    where: { email },
    update: { name, role, password },
    create: { email, name, role, password },
  });
}

async function upsertTeacher(user, { subject, phone }) {
  const existing = await prisma.teacher.findUnique({
    where: { userId: user.id },
  });
  if (existing) {
    return prisma.teacher.update({
      where: { id: existing.id },
      data: { subject, phone },
    });
  }
  return prisma.teacher.create({
    data: { userId: user.id, subject, phone },
  });
}

async function main() {
  // --- Admin & Kiosk accounts ---
  await upsertUser({
    email: "admin@school.ac.th",
    name: "ผู้ดูแลระบบ",
    role: "admin",
  });
  await upsertUser({
    email: "kiosk@school.ac.th",
    name: "เครื่องเช็คชื่อ",
    role: "kiosk",
  });

  // --- Teachers ---
  const teacherDefs = [
    {
      email: "somchai@school.ac.th",
      name: "สมชาย ใจดี",
      subject: "คณิตศาสตร์",
      phone: "081-111-1111",
    },
    {
      email: "somying@school.ac.th",
      name: "สมหญิง รักเรียน",
      subject: "ภาษาไทย",
      phone: "082-222-2222",
    },
    {
      email: "mana@school.ac.th",
      name: "มานะ ตั้งใจ",
      subject: "วิทยาศาสตร์",
      phone: "083-333-3333",
    },
  ];

  const teachers = [];
  for (const def of teacherDefs) {
    const user = await upsertUser({
      email: def.email,
      name: def.name,
      role: "teacher",
    });
    const teacher = await upsertTeacher(user, {
      subject: def.subject,
      phone: def.phone,
    });
    teachers.push({ ...teacher, subject: def.subject });
  }

  // --- Sample timetable ---
  // Wipe and re-create schedules for these teachers so re-seeding stays clean.
  await prisma.schedule.deleteMany({
    where: { teacherId: { in: teachers.map((t) => t.id) } },
  });

  const rooms = ["ม.1/1", "ม.2/1", "ม.3/1"];
  const scheduleRows = [];
  teachers.forEach((teacher, ti) => {
    // Each teacher teaches periods on a few days.
    for (let day = 1; day <= 5; day++) {
      // teacher ti teaches period (ti+1) and (ti+4) on weekdays
      const periods = [ti + 1, ti + 4];
      for (const period of periods) {
        scheduleRows.push({
          teacherId: teacher.id,
          dayOfWeek: day,
          period,
          room: rooms[ti],
          subject: teacher.subject,
        });
      }
    }
  });
  await prisma.schedule.createMany({ data: scheduleRows });

  console.log("Seed complete ✅");
  console.log(`  Accounts (password: ${PASSWORD}):`);
  console.log("    admin@school.ac.th   (admin)");
  console.log("    kiosk@school.ac.th   (kiosk)");
  teacherDefs.forEach((t) => console.log(`    ${t.email} (teacher)`));
  console.log(`  Schedules created: ${scheduleRows.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
