"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const IDLE_MS = 60 * 60 * 1000; // 60 minutes

// Auto-logout after 60 minutes of no user activity.
export default function IdleLogout() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function logout() {
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      router.replace("/login");
      router.refresh();
    }
    function reset() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(logout, IDLE_MS);
    }
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [router]);

  return null;
}
