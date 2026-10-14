"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CostingError } from "@/domain/costing/rates";
import { evaluateJob, storageColumns } from "@/domain/costing/record";
import { issuesToFieldErrors, jobInputSchema } from "@/domain/costing/schemas";
import type { JobInput } from "@/domain/costing/types";
import { requireAdmin } from "../auth/session";
import { db } from "../db";
import { toMaterialProfile, toPrinterProfile } from "../profiles";
import { getSetting } from "../settings";

const payloadSchema = z.object({
  id: z.string().max(40).optional(),
  asNew: z.boolean().default(false),
  job: z.unknown(),
  printerId: z.string().min(1, "Choose a printer").max(40),
  materialId: z.string().min(1, "Choose a material").max(40),
  productId: z.string().max(40).nullable(),
  chosenTier: z.enum(["minimum", "standard", "premium", "custom"]),
  customPrice: z.number().int().min(0).max(100_000_000).nullable(),
  expectedMonthlyUnits: z.number().int().min(0).max(1_000_000),
  notes: z.string().max(2000).default(""),
});

export type SaveCalculationResult = { ok: true; id: string } | { ok: false; errors: Record<string, string>; message: string };

/**
 * Save a calculation. The engine is re-run on the server with the CURRENT database printer,
 * material and settings — values computed in the browser are never trusted or stored.
 */
export async function saveCalculation(raw: unknown): Promise<SaveCalculationResult> {
  await requireAdmin();
  const payload = payloadSchema.safeParse(raw);
  if (!payload.success) return { ok: false, errors: issuesToFieldErrors(payload.error), message: "Please check the form." };
  const p = payload.data;
  const job = jobInputSchema.safeParse(p.job);
  if (!job.success) return { ok: false, errors: issuesToFieldErrors(job.error), message: "Please fix the highlighted fields." };

  const [printer, material, settings, product] = await Promise.all([
    db.printer.findUnique({ where: { id: p.printerId } }),
    db.material.findUnique({ where: { id: p.materialId } }),
    getSetting("costing"),
    p.productId ? db.product.findUnique({ where: { id: p.productId } }) : Promise.resolve(null),
  ]);
  if (!printer) return { ok: false, errors: { printerId: "Printer not found" }, message: "Choose a printer." };
  if (!material) return { ok: false, errors: { materialId: "Material not found" }, message: "Choose a material." };

  const ctx = { printer: toPrinterProfile(printer), material: toMaterialProfile(material), settings };
  const jobInput = job.data as JobInput;
  let ev;
  try {
    ev = evaluateJob(jobInput, ctx, p.chosenTier, p.customPrice);
  } catch (e) {
    if (e instanceof CostingError) return { ok: false, errors: { _form: e.issues.join(" ") }, message: e.issues.join(" ") };
    throw e;
  }

  const data = {
    name: jobInput.name,
    productId: product?.id ?? null,
    printerId: printer.id,
    materialId: material.id,
    input: jobInput as unknown as Prisma.InputJsonValue,
    snapshot: { ...ctx, printerId: printer.id, materialId: material.id } as unknown as Prisma.InputJsonValue,
    result: { cost: ev.cost, pricing: ev.pricing, check: ev.check } as unknown as Prisma.InputJsonValue,
    expectedMonthlyUnits: p.expectedMonthlyUnits,
    notes: p.notes,
    ...storageColumns(jobInput, ev),
  };
  const components = ev.cost.lines.map((l, i) => ({ key: l.key, label: l.label, amount: l.amount, formula: l.formula, sortOrder: i }));

  let id: string;
  if (p.id && !p.asNew) {
    const existing = await db.costCalculation.findUnique({ where: { id: p.id }, select: { id: true } });
    if (!existing) return { ok: false, errors: {}, message: "This calculation no longer exists." };
    await db.$transaction([
      db.costComponent.deleteMany({ where: { calculationId: p.id } }),
      db.costCalculation.update({ where: { id: p.id }, data: { ...data, components: { create: components } } }),
    ]);
    id = p.id;
  } else {
    const created = await db.costCalculation.create({ data: { ...data, components: { create: components } } });
    id = created.id;
  }
  revalidatePath("/admin");
  revalidatePath("/admin/calculations");
  return { ok: true, id };
}

export async function deleteCalculation(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (id) await db.costCalculation.deleteMany({ where: { id } });
  revalidatePath("/admin");
  revalidatePath("/admin/calculations");
  redirect("/admin/calculations");
}
