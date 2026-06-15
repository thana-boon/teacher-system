import { redirect } from "next/navigation";
import { getSessionWithRole } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import Shell, { type NavItem } from "@/components/Shell";

const NAV: NavItem[] = [
  { href: "/teacher/dashboard", label: "หน้าหลัก", icon: "🏠" },
  { href: "/teacher/schedule", label: "ตารางสอน", icon: "🗓️" },
  { href: "/teacher/leave", label: "ยื่นลา", icon: "📝" },
  { href: "/teacher/profile", label: "ข้อมูลส่วนตัว", icon: "👤" },
];

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionWithRole("teacher");
  if (!session) redirect("/login");
  const settings = await getSettings();

  return (
    <Shell
      nav={NAV}
      userName={session.name}
      roleLabel="ครู"
      schoolName={settings.schoolName}
      logoBase64={settings.logoBase64}
    >
      {children}
    </Shell>
  );
}
