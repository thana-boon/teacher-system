"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const DEMO = [
  { label: "ผู้ดูแลระบบ", email: "admin@school.ac.th" },
  { label: "ครู", email: "somchai@school.ac.th" },
  { label: "Kiosk", email: "kiosk@school.ac.th" },
];

const HOME: Record<string, string> = {
  admin: "/admin/dashboard",
  teacher: "/teacher/dashboard",
  kiosk: "/kiosk",
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }
      const from = params.get("from");
      router.replace(from ?? HOME[data.role] ?? "/");
      router.refresh();
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-200 p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="mb-2 text-center">
            <h1 className="text-3xl font-bold">ระบบบริหารการสอน 🦆</h1>
            <p className="mt-1 text-base-content/60">เข้าสู่ระบบเพื่อใช้งาน</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label" htmlFor="email">
                <span className="label-text">อีเมล</span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                className="input input-bordered w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.ac.th"
                required
              />
            </div>

            <div className="form-control">
              <label className="label" htmlFor="password">
                <span className="label-text">รหัสผ่าน</span>
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="input input-bordered w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="alert alert-error py-2 text-sm">
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading && <span className="loading loading-spinner loading-sm" />}
              เข้าสู่ระบบ
            </button>
          </form>

          <div className="divider text-xs text-base-content/50">
            บัญชีทดลอง (รหัส: password123)
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {DEMO.map((d) => (
              <button
                key={d.email}
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setEmail(d.email);
                  setPassword("password123");
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
