import type { Material, Printer } from "@prisma/client";
import type { MaterialProfile, PrinterProfile } from "@/domain/costing/types";

/** Pure row → domain profile mappers (no `server-only` marker so the seed script can use them). */

export function toPrinterProfile(p: Printer): PrinterProfile {
  return {
    name: p.name,
    purchasePrice: p.purchasePrice,
    residualValue: p.residualValue,
    lifetimeHours: p.lifetimeHours,
    monthlyProductiveHours: p.monthlyProductiveHours,
    averagePowerWatts: p.averagePowerWatts,
    electricityRatePerKwh: p.electricityRatePerKwh,
    maintenanceMethod: p.maintenanceMethod === "monthly" ? "monthly" : "per_hour",
    maintenancePerHour: p.maintenancePerHour,
    maintenanceMonthly: p.maintenanceMonthly,
    nozzleCost: p.nozzleCost,
    nozzleLifeHours: p.nozzleLifeHours,
    otherConsumablesPerHour: p.otherConsumablesPerHour,
    failureRate: p.failureRate,
    additionalOverheadMonthly: p.additionalOverheadMonthly,
  };
}

export function toMaterialProfile(m: Material): MaterialProfile {
  return {
    name: m.name,
    purchasePrice: m.purchasePrice,
    spoolWeightGrams: m.spoolWeightGrams,
    netUsableGrams: m.netUsableGrams,
    handlingCostPerSpool: m.handlingCostPerSpool,
    failureRate: m.failureRate,
    wasteAllowancePct: m.wasteAllowancePct,
  };
}
