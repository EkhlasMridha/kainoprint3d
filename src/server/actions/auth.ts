"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { verifyPassword } from "../auth/password";
import { createSession, destroySession } from "../auth/session";
import { db } from "../db";
import type { ActionState } from "../form-data";
import { clientKey, rateLimit } from "../rate-limit";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter your email"),
  password: z.string().min(1, "Enter your password").max(200),
});

// A valid scrypt hash used to keep timing similar when the email does not exist.
const DUMMY_HASH = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" + "A".repeat(86) + "==";

export async function loginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const key = await clientKey();
  if (!rateLimit(`login:${key}`, 8, 15 * 60 * 1000)) {
    return { ok: false, message: "Too many sign-in attempts. Please wait 15 minutes and try again." };
  }
  const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { ok: false, message: "Enter your email and password." };
  const user = await db.adminUser.findUnique({ where: { email: parsed.data.email } });
  const valid = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) return { ok: false, message: "Incorrect email or password." };
  await createSession(user.id);
  const next = String(fd.get("next") ?? "");
  redirect(next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}
