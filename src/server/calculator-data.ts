import "server-only";
import { defaultJobInput } from "@/domain/costing/defaults";
import type { ChosenTier } from "@/domain/costing/record";
import { jobInputSchema } from "@/domain/costing/schemas";
import type { JobInput } from "@/domain/costing/types";
import type { CalcMaterial, CalcPrinter, CalculatorInitial } from "@/components/admin/calculator/calculator";
import { db } from "./db";
import { toMaterialProfile, toPrinterProfile } from "./profiles";
import { getSetting } from "./settings";

/** Admin-only data for the calculator. Callers must have passed requireAdmin(). */
export async function loadCalculatorData() {
  const [printers, materials, products, settings] = await Promise.all([
    db.printer.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.material.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    db.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    getSetting("costing"),
  ]);
  const calcPrinters: CalcPrinter[] = printers.map((p) => ({ id: p.id, name: p.name, model: p.model, profile: toPrinterProfile(p) }));
  const calcMaterials: CalcMaterial[] = materials.map((m) => ({ id: m.id, name: m.name, category: m.category, profile: toMaterialProfile(m) }));
  return { printers: calcPrinters, materials: calcMaterials, products, settings };
}

/** Build calculator initial state from a saved calculation (for edit or duplicate). */
export async function initialFromCalculation(id: string, mode: "edit" | "duplicate"): Promise<CalculatorInitial | null> {
  const c = await db.costCalculation.findUnique({ where: { id } });
  if (!c) return null;
  const parsed = jobInputSchema.safeParse(c.input);
  const settings = await getSetting("costing");
  const job: JobInput = parsed.success ? (parsed.data as JobInput) : { ...defaultJobInput(settings), name: c.name };
  return {
    id: mode === "edit" ? c.id : undefined,
    job: mode === "duplicate" ? { ...job, name: `${job.name} (copy)` } : job,
    printerId: c.printerId ?? "",
    materialId: c.materialId ?? "",
    productId: c.productId,
    chosenTier: (["minimum", "standard", "premium", "custom"].includes(c.chosenTier) ? c.chosenTier : "standard") as ChosenTier,
    customPrice: c.chosenTier === "custom" ? c.chosenPrice : null,
    expectedMonthlyUnits: c.expectedMonthlyUnits,
    notes: mode === "edit" ? c.notes : "",
  };
}
