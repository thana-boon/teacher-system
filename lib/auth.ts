import "server-only";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifyToken, type SessionPayload, type Role } from "./jwt";

export type { SessionPayload, Role };

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hashed: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

/** Read and verify the session from the request cookie (Server Components / Route Handlers). */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifyToken(store.get(COOKIE_NAME)?.value);
}

/** Throw-free guard: returns the session only if its role is allowed. */
export async function getSessionWithRole(
  ...roles: Role[]
): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session) return null;
  if (roles.length && !roles.includes(session.role)) return null;
  return session;
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
