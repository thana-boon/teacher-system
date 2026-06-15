# ระบบบริหารการสอน 🦆

ระบบบริหารจัดการ **การสอน การลา และการเช็คชื่อครู** สำหรับโรงเรียน
รองรับการเช็คชื่อเข้า–ออกห้องเรียนด้วย **การจดจำใบหน้า (Face Recognition)** ผ่านหน้า Kiosk
พร้อมระบบรายงานการเข้าสอน/การลา และส่งออกเป็น PDF / Excel

> ระบบใช้ภาษาไทยทั้งหมด ปรับแต่งชื่อโรงเรียน โลโก้ คาบเรียน ปีการศึกษา และวันหยุดได้เอง

---

## ✨ ฟีเจอร์หลัก

### 👤 ผู้ดูแลระบบ (Admin)
- **ภาพรวม** — สรุปจำนวนครู, การเช็คชื่อวันนี้, การลารออนุมัติ
- **จัดการครู** — เพิ่ม/แก้ไข/ลบ, อัปโหลดรูป, เก็บข้อมูลใบหน้า (จากรูปหรือสแกนสด)
- **จัดการผู้ใช้** — สร้างบัญชีทุก role (admin / ครู / kiosk)
- **ตารางสอน** — กำหนดตารางแยกตาม **ปีการศึกษา/ภาคเรียน**
- **การลา** — อนุมัติ/ไม่อนุมัติ และเลือก **ครูสอนแทนรายคาบ**
- **รายงาน** — การเข้าสอน (ตารางรายวัน / รายบุคคล + ขาดสอน) และการลา → พิมพ์/บันทึก PDF, ส่งออก Excel (CSV)
- **ตั้งค่าเว็บไซต์** — ชื่อ/โลโก้โรงเรียน, คาบเรียน, ปี/เทอม, ช่วงเปิดเทอม, วันหยุด, เกณฑ์เข้าสาย, ความเข้มงวดการจดจำใบหน้า

### 🧑‍🏫 ครู (Teacher)
- หน้าหลัก — ตารางสอนวันนี้ + สถานะเช็คชื่อ + สรุปสัปดาห์
- ตารางสอนของตัวเอง / ยื่นลา + ดูประวัติ + ครูสอนแทน
- โปรไฟล์ — แก้ข้อมูล, เปลี่ยนรหัสผ่าน, อัปรูป/เก็บข้อมูลใบหน้า

### 🖥️ Kiosk (เครื่องเช็คชื่อ — ไม่ต้องล็อกอิน)
- เลือกห้องครั้งแรก (จำไว้ในเครื่อง)
- นาฬิกา + คาบปัจจุบันแบบเรียลไทม์
- เช็คชื่อ **เข้าสอน / ออกจากห้อง** ด้วยการสแกนใบหน้า (มีปุ่มกรอกเองสำรอง)
- แสดงรูป+ชื่อครู และสถานะ **ตรงเวลา / สาย / ออกก่อน**
- สถานะรายห้อง + ส่งต่อห้องอัตโนมัติเมื่อครูคาบถัดไปมาเช็คชื่อ

---

## 🛠 เทคโนโลยี

| ส่วน | เทคโนโลยี |
|------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) + React 19 + TypeScript |
| UI | Tailwind CSS v4 + DaisyUI (ธีม `bumblebee`) |
| Database | Prisma 7 + Turso (libSQL / SQLite) |
| Auth | JWT (`jose`) + `bcryptjs` — ล็อกอินด้วย username หรือ email |
| Face Recognition | `@vladmandic/face-api` (ทำงานฝั่ง browser) |
| Deploy | Vercel |

---

## 🚀 เริ่มต้นใช้งาน

### 1. ติดตั้ง

```bash
git clone <repo-url>
cd teacher-system
npm install
```

### 2. ตั้งค่า Environment Variables

สร้างไฟล์ `.env` ที่ root:

```env
TURSO_DATABASE_URL="libsql://<your-db>.turso.io"
TURSO_AUTH_TOKEN="<your-turso-token>"
JWT_SECRET="<สุ่มสตริงยาว ๆ>"
NEXTAUTH_URL="http://localhost:3000"
```

> สร้างฐานข้อมูล Turso ได้ที่ [turso.tech](https://turso.tech)
> สุ่ม `JWT_SECRET`: `openssl rand -hex 32`

### 3. สร้างตาราง + ใส่ข้อมูลตัวอย่าง

```bash
npm run db:push     # สร้างตารางทั้งหมดจาก schema ไปยัง Turso
npm run db:seed     # ใส่บัญชีตัวอย่าง + ตารางสอนตัวอย่าง
```

### 4. รันระบบ

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

---

## 🔑 บัญชีตัวอย่าง

รหัสผ่านทุกบัญชี: **`password123`** (ล็อกอินด้วย username หรือ email ก็ได้)

| Role | Username | อีเมล |
|------|----------|-------|
| ผู้ดูแลระบบ | `admin` | admin@school.ac.th |
| ครู | `somchai` | somchai@school.ac.th |
| ครู | `somying` | somying@school.ac.th |
| ครู | `mana` | mana@school.ac.th |
| Kiosk | `kiosk` | kiosk@school.ac.th |

---

## ⚙️ ตั้งค่าครั้งแรก (แนะนำ)

ล็อกอินเป็น **admin** แล้วทำตามลำดับ:

1. **ตั้งค่าเว็บไซต์** — ใส่ชื่อ + โลโก้โรงเรียน (โลโก้จะเป็น favicon ให้ด้วย), กำหนด **คาบเรียน** (กี่คาบ/เวลาแต่ละคาบ), **ปีการศึกษา/ภาคเรียนปัจจุบัน**, **ช่วงเปิด–ปิดเทอม** และ **วันหยุด** (สำคัญ! ไม่งั้นรายงานจะนับว่าครูขาดสอนในวันหยุด)
2. **จัดการครู** — เพิ่มครู + อัปรูปหน้าชัด ๆ (ระบบจะดึงใบหน้าให้อัตโนมัติ) หรือกด "เก็บใบหน้า" สแกนสด
3. **ตารางสอน** — เลือกปี/เทอม/ครู แล้วกำหนดคาบสอนในแต่ละช่อง
4. **Kiosk** — เปิด `/kiosk` ที่เครื่องหน้าห้อง เลือกห้อง แล้วใช้เช็คชื่อได้เลย

---

## 📜 คำสั่งที่ใช้บ่อย

```bash
npm run dev          # รันโหมดพัฒนา
npm run build        # build (รวม prisma generate)
npm run start        # รันโหมด production
npm run db:push      # อัปเดต schema ไปยัง Turso
npm run db:push -- --reset   # ⚠️ ลบทุกตารางแล้วสร้างใหม่ (ข้อมูลหาย)
npm run db:seed      # ใส่ข้อมูลตัวอย่าง
```

> **อัปเกรด schema บน DB เดิม:** สคริปต์ใน `scripts/migrate-*.mjs` เป็น migration แบบเพิ่มคอลัมน์โดยไม่ลบข้อมูล (รันด้วย `node scripts/migrate-xxx.mjs`) สำหรับฐานข้อมูลที่มีข้อมูลอยู่แล้ว — ถ้าเป็นการติดตั้งใหม่ใช้แค่ `db:push` พอ

---

## ☁️ Deploy บน Vercel

1. Push โค้ดขึ้น GitHub แล้ว import เข้า Vercel
2. ตั้ง **Environment Variables** ใน Vercel: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET` (ตั้งให้ครบทุก environment)
3. Vercel จะรัน `prisma generate && next build` ให้อัตโนมัติ

> หมายเหตุ: การอัปโหลดรูป/โลโก้ถูกย่อขนาดฝั่ง browser ก่อนส่ง เพื่อไม่ให้เกินลิมิตขนาด request ของ Vercel (~4.5MB)

---

## 📁 โครงสร้างโปรเจกต์ (ย่อ)

```
app/
  admin/        หน้าผู้ดูแลระบบ (dashboard, teachers, schedule, leaves, users, settings, reports)
  teacher/      หน้าครู (dashboard, schedule, leave, profile)
  kiosk/        หน้าเช็คชื่อ (เลือกห้อง + room/[id])
  print/        หน้าพิมพ์รายงาน (daily, teacher, leaves)
  api/          API routes (auth, teachers, schedules, leaves, users, settings, kiosk, reports, logo)
components/      Shell, FaceEnrollModal, KioskScanModal, ThaiDate/MonthPicker, ฯลฯ
lib/            prisma, auth, jwt, settings, reports, time, face, constants, image
prisma/         schema.prisma
public/models/  ไฟล์โมเดล face-api
scripts/        db-push, seed, migrate-*
```

---

## 📝 License

ใช้ภายในองค์กร/โรงเรียน — ปรับแก้ได้ตามต้องการ
