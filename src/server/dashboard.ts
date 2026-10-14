import "server-only";
import { db } from "./db";
import { calcWhere, type CalcFilters } from "./filters";
import { getSetting } from "./settings";
import { readStoredCalculation } from "./stored-result";

export interface ProductLine {
  key: string;
  calcId: string;
  name: string;
  unitCost: number;
  price: number;
  netPrice: number;
  profitPerItem: number;
  margin: number;
  monthlyUnits: number;
  monthlyRevenue: number;
  monthlyProfit: number;
  status: "loss" | "below_minimum" | "low_margin" | "ok";
  updatedAt: Date;
}

/**
 * Dashboard projections. For each product (or unlinked calculation name) the LATEST saved
 * calculation within the filters is used, multiplied by its expected monthly sales.
 */
export async function loadDashboard(filters: CalcFilters) {
  const [calcs, printers, materials, costing, quoteCounts] = await Promise.all([
    db.costCalculation.findMany({
      where: calcWhere(filters),
      orderBy: { updatedAt: "desc" },
      include: { product: { select: { name: true } }, printer: { select: { name: true } }, material: { select: { name: true } } },
    }),
    db.printer.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.material.findMany({ orderBy: { name: "asc" } }),
    getSetting("costing"),
    db.quoteRequest.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const low = costing.pricing.lowMarginThreshold;

  const latest = new Map<string, (typeof calcs)[number]>();
  for (const c of calcs) {
    const key = c.productId ?? `name:${c.name.toLowerCase()}`;
    if (!latest.has(key)) latest.set(key, c);
  }

  const lines: ProductLine[] = [...latest.entries()].map(([key, c]) => {
    const stored = readStoredCalculation(c);
    const netPrice = stored?.result.check.metrics.netPrice ?? c.chosenPrice;
    const status: ProductLine["status"] = c.profitPerItem < 0 ? "loss" : c.chosenPrice < c.minimumPrice ? "below_minimum" : c.margin < low ? "low_margin" : "ok";
    return {
      key,
      calcId: c.id,
      name: c.product?.name ?? c.name,
      unitCost: c.unitCost,
      price: c.chosenPrice,
      netPrice,
      profitPerItem: c.profitPerItem,
      margin: c.margin,
      monthlyUnits: c.expectedMonthlyUnits,
      monthlyRevenue: netPrice * c.expectedMonthlyUnits,
      monthlyProfit: c.profitPerItem * c.expectedMonthlyUnits,
      status,
      updatedAt: c.updatedAt,
    };
  });

  const totalUnits = lines.reduce((s, l) => s + l.monthlyUnits, 0);
  const monthlyRevenue = lines.reduce((s, l) => s + l.monthlyRevenue, 0);
  const monthlyProfit = lines.reduce((s, l) => s + l.monthlyProfit, 0);
  const avgUnitCost = totalUnits > 0 ? lines.reduce((s, l) => s + l.unitCost * l.monthlyUnits, 0) / totalUnits : lines.length ? lines.reduce((s, l) => s + l.unitCost, 0) / lines.length : 0;

  // Projected monthly consumption from latest calculations × expected monthly units.
  const gramsByMaterial = new Map<string, number>();
  const hoursByPrinter = new Map<string, number>();
  for (const c of latest.values()) {
    if (c.expectedMonthlyUnits <= 0 || c.quantity <= 0) continue;
    const factor = c.expectedMonthlyUnits / c.quantity;
    if (c.materialId) gramsByMaterial.set(c.materialId, (gramsByMaterial.get(c.materialId) ?? 0) + c.totalGrams * factor);
    if (c.printerId) hoursByPrinter.set(c.printerId, (hoursByPrinter.get(c.printerId) ?? 0) + c.machineHours * factor);
  }
  const materialUse = materials
    .map((m) => ({ id: m.id, name: m.name, grams: gramsByMaterial.get(m.id) ?? 0, spools: (gramsByMaterial.get(m.id) ?? 0) / (m.netUsableGrams || m.spoolWeightGrams) }))
    .filter((m) => m.grams > 0)
    .sort((a, b) => b.grams - a.grams);
  const utilization = printers.map((p) => {
    const hours = hoursByPrinter.get(p.id) ?? 0;
    return { id: p.id, name: p.name, hours, capacity: p.monthlyProductiveHours, ratio: p.monthlyProductiveHours > 0 ? hours / p.monthlyProductiveHours : 0 };
  });

  const quotes = Object.fromEntries(quoteCounts.map((q) => [q.status, q._count._all])) as Record<string, number>;

  return {
    lines,
    kpis: { monthlyRevenue, monthlyProfit, avgUnitCost, totalUnits, margin: monthlyRevenue > 0 ? monthlyProfit / monthlyRevenue : 0 },
    mostProfitable: [...lines].sort((a, b) => b.monthlyProfit - a.monthlyProfit || b.profitPerItem - a.profitPerItem).slice(0, 6),
    warnings: lines.filter((l) => l.status !== "ok"),
    recent: calcs.slice(0, 6),
    materialUse,
    utilization,
    quotes,
    lowMarginThreshold: low,
  };
}
