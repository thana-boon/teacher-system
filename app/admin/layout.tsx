import { redirect } from "next/navigation";
import { getSessionWithRole } from "@/lib/auth";
import Shell, { type NavItem } from "@/components/Shell";

const NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "ภาพรวม", icon: "📊" },
  { href: "/admin/teachers", label: "จัดการครู", icon: "👩‍🏫" },
  { href: "/admin/schedule", label: "ตารางสอน", icon: "🗓️" },
  { href: "/admin/leaves", label: "การลา", icon: "📝" },
  { href: "/admin/reports", label: "รายงาน", icon: "📈" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionWithRole("admin");
  if (!session) redirect("/login");

  return (
    <Shell nav={NAV} userName={session.name} roleLabel="ผู้ดูแลระบบ">
      {children}
    </Shell>
  );
}
