import { redirect } from "next/navigation";
import { getSessionWithRole } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import Shell, { type NavItem } from "@/components/Shell";

const NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "ภาพรวม", icon: "📊" },
  { href: "/admin/teachers", label: "จัดการครู", icon: "👩‍🏫" },
  { href: "/admin/schedule", label: "ตารางสอน", icon: "🗓️" },
  { href: "/admin/leaves", label: "การลา", icon: "📝" },
  { href: "/admin/activities", label: "กิจกรรม/ราชการ", icon: "📌" },
  { href: "/admin/reports", label: "รายงาน", icon: "📈" },
  { href: "/admin/users", label: "จัดการผู้ใช้", icon: "👥" },
  { href: "/admin/settings", label: "ตั้งค่าเว็บไซต์", icon: "⚙️" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionWithRole("admin");
  if (!session) redirect("/login");
  const settings = await getSettings();

  return (
    <Shell
      nav={NAV}
      userName={session.name}
      roleLabel="ผู้ดูแลระบบ"
      schoolName={settings.schoolName}
      logoBase64={settings.logoBase64}
    >
      {children}
    </Shell>
  );
}
