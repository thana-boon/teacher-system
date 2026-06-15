import { SignJWT, jwtVerify } from "jose";

// Edge-safe JWT helpers (jose only — no Node APIs), so this module can be
// imported from proxy.ts which runs on the Edge runtime.

export const COOKIE_NAME = "token";

export type Role = "admin" | "teacher" | "kiosk";

export type SessionPayload = {
  sub: string; // User id
  role: Role;
  name: string;
  teacherId?: string; // present for role=teacher
};

function getSecret() {
  const secret = process.env.JWT_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET");
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyToken(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
