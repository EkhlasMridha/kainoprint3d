import type { CostingSettings, MaterialProfile, OverheadItem, PrinterProfile } from "./types";

/**
 * Elementary cost-rate formulas. Every function is pure and returns fractional poisha so that
 * rounding happens only once, at the cost-line level.
 */

export class CostingError extends Error {
  constructor(public readonly issues: string[]) {
    super(issues.join(" "));
    this.name = "CostingError";
  }
}

function assertFinite(value: number, label: string, issues: string[]) {
  if (!Number.isFinite(value)) issues.push(`${label} must be a number.`);
}

/** Depreciation per productive hour = (purchase − residual) / lifetime hours. */
export function depreciationPerHour(p: Pick<PrinterProfile, "purchasePrice" | "residualValue" | "lifetimeHours">): number {
  const issues: string[] = [];
  assertFinite(p.purchasePrice, "Purchase price", issues);
  assertFinite(p.residualValue, "Residual value", issues);
  if (!(p.lifetimeHours > 0)) issues.push("Printer lifetime hours must be greater than zero.");
  if (p.residualValue < 0) issues.push("Residual value cannot be negative.");
  if (p.residualValue > p.purchasePrice) issues.push("Residual value cannot exceed the purchase price.");
  if (issues.length) throw new CostingError(issues);
  return (p.purchasePrice - p.residualValue) / p.lifetimeHours;
}

/** Electricity cost per hour = (average watts / 1000) × tariff per kWh. */
export function electricityPerHour(p: Pick<PrinterProfile, "averagePowerWatts" | "electricityRatePerKwh">): number {
  if (!(p.averagePowerWatts >= 0) || !(p.electricityRatePerKwh >= 0)) {
    throw new CostingError(["Power draw and electricity tariff must be zero or positive."]);
  }
  return (p.averagePowerWatts / 1000) * p.electricityRatePerKwh;
}

/** Electricity cost for a run = (W / 1000) × hours × tariff. */
export function electricityCost(watts: number, hours: number, ratePerKwh: number): number {
  return electricityPerHour({ averagePowerWatts: watts, electricityRatePerKwh: ratePerKwh }) * hours;
}

/** Maintenance per hour, either entered directly or derived from a monthly budget. */
export function maintenancePerHour(
  p: Pick<PrinterProfile, "maintenanceMethod" | "maintenancePerHour" | "maintenanceMonthly" | "monthlyProductiveHours">,
): number {
  if (p.maintenanceMethod === "per_hour") return Math.max(0, p.maintenancePerHour);
  if (!(p.monthlyProductiveHours > 0)) {
    throw new CostingError(["Monthly productive hours must be greater than zero to spread a monthly maintenance budget."]);
  }
  return Math.max(0, p.maintenanceMonthly) / p.monthlyProductiveHours;
}

/** Consumables per hour = nozzle cost / nozzle life + other consumables per hour. */
export function consumablesPerHour(p: Pick<PrinterProfile, "nozzleCost" | "nozzleLifeHours" | "otherConsumablesPerHour">): number {
  const nozzle = p.nozzleCost > 0 ? (p.nozzleLifeHours > 0 ? p.nozzleCost / p.nozzleLifeHours : NaN) : 0;
  if (Number.isNaN(nozzle)) throw new CostingError(["Nozzle life hours must be greater than zero when a nozzle cost is set."]);
  return nozzle + Math.max(0, p.otherConsumablesPerHour);
}

/** Printer-specific overhead per hour = monthly printer overhead / monthly productive hours. */
export function printerOverheadPerHour(p: Pick<PrinterProfile, "additionalOverheadMonthly" | "monthlyProductiveHours">): number {
  if (!(p.additionalOverheadMonthly > 0)) return 0;
  if (!(p.monthlyProductiveHours > 0)) {
    throw new CostingError(["Monthly productive hours must be greater than zero to allocate printer overhead."]);
  }
  return p.additionalOverheadMonthly / p.monthlyProductiveHours;
}

/** Net usable grams, defaulting to the nominal spool weight. */
export function usableGrams(m: Pick<MaterialProfile, "spoolWeightGrams" | "netUsableGrams">): number {
  return m.netUsableGrams && m.netUsableGrams > 0 ? m.netUsableGrams : m.spoolWeightGrams;
}

/** Material cost per gram = (spool price + handling cost per spool) / net usable grams. */
export function materialCostPerGram(
  m: Pick<MaterialProfile, "purchasePrice" | "spoolWeightGrams" | "netUsableGrams" | "handlingCostPerSpool">,
): number {
  const grams = usableGrams(m);
  if (!(grams > 0)) throw new CostingError(["Usable filament weight must be greater than zero."]);
  if (m.netUsableGrams && m.netUsableGrams > m.spoolWeightGrams) {
    throw new CostingError(["Net usable weight cannot exceed the spool weight."]);
  }
  if (!(m.purchasePrice >= 0)) throw new CostingError(["Material price must be zero or positive."]);
  return (m.purchasePrice + Math.max(0, m.handlingCostPerSpool)) / grams;
}

/**
 * Combine independent failure sources: P(fail) = 1 − (1 − p_printer)(1 − p_material).
 */
export function combinedFailureRate(printerRate: number, materialRate: number): number {
  return 1 - (1 - clamp01(printerRate)) * (1 - clamp01(materialRate));
}

/**
 * Expected failed attempts per successful plate under a geometric retry model.
 * Expected total attempts = 1 / (1 − p); failed attempts = p / (1 − p).
 */
export function expectedFailedAttempts(p: number): number {
  if (!(p >= 0)) throw new CostingError(["Failure rate must be zero or positive."]);
  if (p >= 1) {
    throw new CostingError([
      "A failure rate of 100% means the item can never be produced successfully; cost is undefined.",
    ]);
  }
  return p / (1 - p);
}

export function expectedAttempts(p: number): number {
  return 1 + expectedFailedAttempts(p);
}

export function totalOverheadMonthly(items: OverheadItem[]): number {
  return items.filter((i) => i.included).reduce((sum, i) => sum + Math.max(0, i.monthlyAmount), 0);
}

/** Overhead allocation rate per unit of the chosen basis (hour or item). */
export function overheadRate(o: CostingSettings["overhead"]): number {
  const total = totalOverheadMonthly(o.items);
  if (total === 0) return 0;
  const basis =
    o.method === "machine_hour"
      ? o.monthlyMachineHours
      : o.method === "labor_hour"
        ? o.monthlyLaborHours
        : o.monthlyProductionUnits;
  if (!(basis > 0)) {
    const name =
      o.method === "machine_hour" ? "machine hours" : o.method === "labor_hour" ? "labour hours" : "production units";
    throw new CostingError([`Monthly ${name} must be greater than zero to allocate overhead.`]);
  }
  return total / basis;
}

export function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
