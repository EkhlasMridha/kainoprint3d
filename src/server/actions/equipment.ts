"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { issuesToFieldErrors, materialProfileSchema, printerProfileSchema } from "@/domain/costing/schemas";
import { requireAdmin } from "../auth/session";
import { db } from "../db";
import { fdBool, fdNum, fdPct, fdStr, fdTaka, fdTakaOr, type ActionState } from "../form-data";

/* ------------------------------------------------------------------ Printers */

export async function savePrinter(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = fdStr(fd, "id");
  const method = fdStr(fd, "maintenanceMethod") === "monthly" ? "monthly" : "per_hour";
  const profile = {
    name: fdStr(fd, "name"),
    purchasePrice: fdTaka(fd, "purchasePrice"),
    residualValue: fdTakaOr(fd, "residualValue", 0),
    lifetimeHours: fdNum(fd, "lifetimeHours"),
    monthlyProductiveHours: fdNum(fd, "monthlyProductiveHours"),
    averagePowerWatts: fdNum(fd, "averagePowerWatts"),
    electricityRatePerKwh: fdTaka(fd, "electricityRatePerKwh"),
    maintenanceMethod: method,
    maintenancePerHour: fdTakaOr(fd, "maintenancePerHour", 0),
    maintenanceMonthly: fdTakaOr(fd, "maintenanceMonthly", 0),
    nozzleCost: fdTakaOr(fd, "nozzleCost", 0),
    nozzleLifeHours: Number.isNaN(fdNum(fd, "nozzleLifeHours")) ? 0 : fdNum(fd, "nozzleLifeHours"),
    otherConsumablesPerHour: fdTakaOr(fd, "otherConsumablesPerHour", 0),
    failureRate: Number.isNaN(fdPct(fd, "failureRate")) ? 0 : fdPct(fd, "failureRate"),
    additionalOverheadMonthly: fdTakaOr(fd, "additionalOverheadMonthly", 0),
  };
  const parsed = printerProfileSchema.safeParse(profile);
  if (!parsed.success) return { ok: false, errors: issuesToFieldErrors(parsed.error) };
  const data = { ...parsed.data, model: fdStr(fd, "model").slice(0, 80), notes: fdStr(fd, "notes").slice(0, 1000), active: fdBool(fd, "active") };
  if (id) await db.printer.update({ where: { id }, data });
  else await db.printer.create({ data });
  revalidatePath("/admin/printers");
  redirect("/admin/printers");
}

export async function deletePrinter(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = fdStr(fd, "id");
  // Saved calculations keep their own snapshot of the printer, so history stays auditable.
  if (id) await db.printer.delete({ where: { id } });
  revalidatePath("/admin/printers");
  redirect("/admin/printers");
}

/* ------------------------------------------------------------------ Materials */

export async function saveMaterial(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = fdStr(fd, "id");
  const netUsable = fdNum(fd, "netUsableGrams");
  const profile = {
    name: fdStr(fd, "name"),
    purchasePrice: fdTaka(fd, "purchasePrice"),
    spoolWeightGrams: fdNum(fd, "spoolWeightGrams"),
    netUsableGrams: Number.isNaN(netUsable) ? null : netUsable,
    handlingCostPerSpool: fdTakaOr(fd, "handlingCostPerSpool", 0),
    failureRate: Number.isNaN(fdPct(fd, "failureRate")) ? 0 : fdPct(fd, "failureRate"),
    wasteAllowancePct: Number.isNaN(fdPct(fd, "wasteAllowancePct")) ? 0 : fdPct(fd, "wasteAllowancePct"),
  };
  const parsed = materialProfileSchema.safeParse(profile);
  if (!parsed.success) return { ok: false, errors: issuesToFieldErrors(parsed.error) };
  const data = {
    ...parsed.data,
    brand: fdStr(fd, "brand").slice(0, 60),
    category: fdStr(fd, "category").slice(0, 40) || "PLA",
    color: fdStr(fd, "color").slice(0, 40),
    supplier: fdStr(fd, "supplier").slice(0, 120),
    notes: fdStr(fd, "notes").slice(0, 1000),
    active: fdBool(fd, "active"),
  };
  if (id) await db.material.update({ where: { id }, data });
  else await db.material.create({ data });
  revalidatePath("/admin/materials");
  redirect("/admin/materials");
}

export async function deleteMaterial(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = fdStr(fd, "id");
  if (id) await db.material.delete({ where: { id } });
  revalidatePath("/admin/materials");
  redirect("/admin/materials");
}
