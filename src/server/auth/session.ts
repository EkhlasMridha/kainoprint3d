import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "../db";

export const SESSION_COOKIE = "kp_admin_session";
const SESSION_DAYS = 7;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export interface AdminIdentity {
  id: string;
  email: string;
  name: string;
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  // Opportunistically clear expired sessions.
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** Resolve the signed-in admin from the session cookie (memoised per request). */
export const getCurrentAdmin = cache(async (): Promise<AdminIdentity | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { id: hashToken(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  return { id: session.user.id, email: session.user.email, name: session.user.name };
});

/**
 * Authorisation gate for every admin page, server action and admin API route.
 * Hiding links in the UI is not security — this check runs on the server for every request.
 */
export async function requireAdmin(): Promise<AdminIdentity> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** Variant for route handlers: returns null instead of redirecting. */
export async function adminOrNull(): Promise<AdminIdentity | null> {
  return getCurrentAdmin();
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}
