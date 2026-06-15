"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export type NavItem = { href: string; label: string; icon: string };

export default function Shell({
  nav,
  userName,
  roleLabel,
  children,
}: {
  nav: NavItem[];
  userName: string;
  roleLabel: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const sidebar = (
    <ul className="menu w-64 gap-1 bg-base-100 p-4 text-base-content">
      {nav.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={active ? "active font-semibold" : ""}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="drawer lg:drawer-open">
      <input id="app-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex min-h-screen flex-col">
        {/* Top navbar */}
        <header className="navbar sticky top-0 z-30 bg-primary text-primary-content shadow">
          <div className="flex-none lg:hidden">
            <label
              htmlFor="app-drawer"
              className="btn btn-square btn-ghost"
              aria-label="เมนู"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </label>
          </div>
          <div className="flex-1">
            <span className="px-2 text-xl font-bold">ระบบบริหารการสอน 🦆</span>
          </div>
          <div className="flex-none">
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost gap-2">
                <div className="text-right leading-tight">
                  <div className="text-sm font-semibold">{userName}</div>
                  <div className="text-xs opacity-80">{roleLabel}</div>
                </div>
                <div className="avatar avatar-placeholder">
                  <div className="w-9 rounded-full bg-primary-content/20 text-primary-content">
                    <span>{userName.charAt(0)}</span>
                  </div>
                </div>
              </div>
              <ul
                tabIndex={0}
                className="dropdown-content menu z-40 mt-2 w-48 rounded-box bg-base-100 p-2 text-base-content shadow"
              >
                <li>
                  <button onClick={logout} disabled={loggingOut}>
                    {loggingOut ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      "🚪"
                    )}
                    ออกจากระบบ
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>

      <div className="drawer-side z-40">
        <label
          htmlFor="app-drawer"
          aria-label="ปิดเมนู"
          className="drawer-overlay"
        />
        {sidebar}
      </div>
    </div>
  );
}
