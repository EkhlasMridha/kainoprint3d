"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { issuesToFieldErrors } from "@/domain/costing/schemas";
import { QUOTE_STATUSES } from "@/domain/quote";
import { requireAdmin } from "../auth/session";
import { db } from "../db";
import { fdNum, fdStr, type ActionState } from "../form-data";

const schema = z.object({
  id: z.string().min(1).max(40),
  status: z.enum(QUOTE_STATUSES),
  finalPrice: z.number().int().min(0).max(100_000_000).nullable(),
  adminNotes: z.string().max(4000),
});

export async function updateQuote(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const price = fdNum(fd, "finalPrice");
  const parsed = schema.safeParse({
    id: fdStr(fd, "id"),
    status: fdStr(fd, "status"),
    finalPrice: Number.isNaN(price) ? null : Math.round(price * 100),
    adminNotes: fdStr(fd, "adminNotes"),
  });
  if (!parsed.success) return { ok: false, errors: issuesToFieldErrors(parsed.error) };
  const { id, ...data } = parsed.data;
  await db.quoteRequest.update({ where: { id }, data });
  revalidatePath("/admin/quotes");
  revalidatePath(`/admin/quotes/${id}`);
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Saved." };
}
