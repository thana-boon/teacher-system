"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [school, setSchool] = useState<{ schoolName: string; logoBase64: string | null }>({
    schoolName: "",
    logoBase64: null,
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) =>
        setSchool({ schoolName: s.schoolName ?? "", logoBase64: s.logoBase64 ?? null }),
      )
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
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
            {school.logoBase64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={school.logoBase64}
                alt="โลโก้โรงเรียน"
                className="mx-auto mb-2 h-16 w-16 object-contain"
              />
            ) : (
              <div className="mb-1 text-5xl">🦆</div>
            )}
            <h1 className="text-2xl font-bold">
              {school.schoolName || "ระบบบริหารการสอน"}
            </h1>
            <p className="mt-1 text-base-content/60">เข้าสู่ระบบเพื่อใช้งาน</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label" htmlFor="identifier">
                <span className="label-text">ชื่อผู้ใช้ หรือ อีเมล</span>
              </label>
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                className="input input-bordered w-full"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="เช่น admin หรือ you@school.ac.th"
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
        </div>
      </div>
    </div>
  );
}
