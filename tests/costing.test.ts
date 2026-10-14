import { describe, expect, it } from "vitest";
import { calculateCost } from "@/domain/costing/engine";
import {
  CostingError,
  combinedFailureRate,
  consumablesPerHour,
  depreciationPerHour,
  electricityCost,
  electricityPerHour,
  expectedAttempts,
  expectedFailedAttempts,
  maintenancePerHour,
  materialCostPerGram,
  overheadRate,
} from "@/domain/costing/rates";
import { jobInputSchema } from "@/domain/costing/schemas";
import { refCtx, refJob, refMaterial, refPrinter, refSettings } from "./fixtures";

const line = (r: ReturnType<typeof calculateCost>, key: string) => r.lines.find((l) => l.key === key)!.amount;

describe("rates", () => {
  it("material cost per gram uses net usable weight and handling cost", () => {
    expect(materialCostPerGram(refMaterial)).toBeCloseTo(220, 10); // ৳2.20/g
    expect(materialCostPerGram({ ...refMaterial, netUsableGrams: null, handlingCostPerSpool: 0 })).toBe(200);
  });

  it("rejects impossible material weights", () => {
    expect(() => materialCostPerGram({ ...refMaterial, spoolWeightGrams: 0, netUsableGrams: null })).toThrow(CostingError);
    expect(() => materialCostPerGram({ ...refMaterial, netUsableGrams: 1200 })).toThrow(/exceed/);
  });

  it("electricity = W / 1000 × hours × tariff", () => {
    expect(electricityPerHour(refPrinter)).toBeCloseTo(120, 10);
    expect(electricityCost(120, 6, 1000)).toBeCloseTo(720, 10); // ৳7.20
    expect(electricityCost(0, 6, 1000)).toBe(0);
  });

  it("depreciation = (purchase − residual) / lifetime hours", () => {
    expect(depreciationPerHour(refPrinter)).toBe(2000); // ৳20/h
    expect(depreciationPerHour({ purchasePrice: 50_000_00, residualValue: 0, lifetimeHours: 5000 })).toBe(1000);
    expect(() => depreciationPerHour({ ...refPrinter, lifetimeHours: 0 })).toThrow(CostingError);
    expect(() => depreciationPerHour({ ...refPrinter, residualValue: 200_000_00 })).toThrow(/exceed/);
  });

  it("maintenance per hour supports per-hour and monthly methods", () => {
    expect(maintenancePerHour(refPrinter)).toBe(500);
    expect(maintenancePerHour({ ...refPrinter, maintenanceMethod: "monthly", maintenanceMonthly: 1_000_00 })).toBe(500); // ৳1,000 / 200 h
    expect(() => maintenancePerHour({ ...refPrinter, maintenanceMethod: "monthly", monthlyProductiveHours: 0 })).toThrow(CostingError);
    expect(consumablesPerHour(refPrinter)).toBe(300);
    expect(() => consumablesPerHour({ ...refPrinter, nozzleLifeHours: 0 })).toThrow(CostingError);
  });

  it("overhead allocation ignores excluded items and supports all bases", () => {
    expect(overheadRate(refSettings.overhead)).toBe(2000); // ৳4,000 / 200 h
    expect(overheadRate({ ...refSettings.overhead, method: "labor_hour" })).toBe(8000); // ৳4,000 / 50 h
    expect(overheadRate({ ...refSettings.overhead, method: "production_unit" })).toBe(1000); // ৳4,000 / 400 units
    expect(() => overheadRate({ ...refSettings.overhead, monthlyMachineHours: 0 })).toThrow(CostingError);
    expect(overheadRate({ ...refSettings.overhead, items: [] })).toBe(0);
  });

  it("geometric failure model: attempts = 1 / (1 − p)", () => {
    expect(expectedAttempts(0)).toBe(1);
    expect(expectedAttempts(0.5)).toBe(2);
    expect(expectedFailedAttempts(0.2)).toBeCloseTo(0.25, 12);
    expect(combinedFailureRate(0.1, 0.1)).toBeCloseTo(0.19, 12);
    expect(() => expectedFailedAttempts(1)).toThrow(/100%/);
    expect(() => expectedFailedAttempts(-0.1)).toThrow(CostingError);
  });
});

describe("calculateCost — reference scenario", () => {
  const r = calculateCost(refJob(), refCtx);

  it("computes quantities", () => {
    expect(r.quantities.plates).toBe(2);
    expect(r.quantities.machineHours).toBe(6);
    expect(r.quantities.directLaborHours).toBeCloseTo(100 / 60, 12);
    expect(r.rates.failureProbability).toBeCloseTo(0.1, 12);
  });

  it("produces the hand-verified cost lines", () => {
    expect(line(r, "material")).toBe(22_000); // 2 × 50 g × ৳2.20
    expect(line(r, "depreciation")).toBe(12_000); // 6 h × ৳20
    expect(line(r, "electricity")).toBe(720); // 6 h × ৳1.20
    expect(line(r, "maintenance")).toBe(4_800); // 6 h × (৳5 + ৳3)
    expect(line(r, "labor")).toBe(20_000); // 100 min × ৳120/h
    expect(line(r, "design")).toBe(3_000); // ৳300 ÷ 100 units × 10
    expect(line(r, "failure")).toBe(3_307); // see docs/PRICING.md
    expect(line(r, "packaging")).toBe(17_000); // 10 × (৳10 + ৳5) + ৳20
    expect(line(r, "overhead")).toBe(12_000); // 6 h × ৳20
    expect(r.totalBatchCost).toBe(94_827);
    expect(r.unitCost).toBe(9_483); // ৳94.83
    expect(r.unitCostExact).toBeCloseTo(9482.7, 10);
  });

  it("total equals the sum of displayed lines exactly", () => {
    expect(r.lines.reduce((s, l) => s + l.amount, 0)).toBe(r.totalBatchCost);
    expect(r.lines.every((l) => Number.isInteger(l.amount))).toBe(true);
  });
});

describe("calculateCost — double counting guards", () => {
  it("uses only the slicer total when provided (no material double counting)", () => {
    const job = refJob();
    job.material = { ...job.material, mode: "slicer_total", slicerTotalGrams: 50, modelGrams: 40, supportGrams: 8, purgeGrams: 2 };
    const r = calculateCost(job, refCtx);
    expect(r.quantities.gramsPerPlate).toBe(50);
    expect(line(r, "material")).toBe(22_000);
    expect(r.notes.join(" ")).toMatch(/ignored/);
  });

  it("components mode sums model + support + purge", () => {
    const job = refJob();
    job.material = { ...job.material, mode: "components", modelGrams: 40, supportGrams: 8, purgeGrams: 2, slicerTotalGrams: 0 };
    expect(calculateCost(job, refCtx).quantities.gramsPerPlate).toBe(50);
  });

  it("applies the material waste allowance only when requested", () => {
    const ctx = { ...refCtx, material: { ...refMaterial, wasteAllowancePct: 0.1 } };
    const off = calculateCost(refJob(), ctx);
    const job = refJob();
    job.material.applyWasteAllowance = true;
    const on = calculateCost(job, ctx);
    expect(line(off, "material")).toBe(22_000);
    expect(line(on, "material")).toBe(24_200);
  });

  it("does not apply a failure allowance when inputs already include losses", () => {
    const job = refJob();
    job.failure.alreadyIncluded = true;
    const r = calculateCost(job, refCtx);
    expect(line(r, "failure")).toBe(0);
    expect(r.rates.failureProbability).toBe(0);
  });

  it("failure allowance is not applied to design, packaging or per-item post-processing", () => {
    const base = calculateCost(refJob(), refCtx);
    const job = refJob();
    job.design = { ...job.design, minutes: 600 };
    job.direct = { ...job.direct, packagingPerItem: 100_00 };
    job.labor = { ...job.labor, perItem: { ...job.labor.perItem, postProcessing: 30 } };
    const r = calculateCost(job, refCtx);
    expect(line(r, "failure")).toBe(line(base, "failure"));
  });

  it("partial-failure consumption scales failure cost", () => {
    const job = refJob();
    job.failure = { ...job.failure, consumptionFraction: 1, includeLabor: false };
    const r = calculateCost(job, refCtx);
    // 2 plates × 1/9 × (50 g × ৳2.20 + 3 h × (৳20 + ৳1.20 + ৳5 + ৳3 + ৳20 overhead))
    expect(line(r, "failure")).toBe(Math.round((2 / 9) * (11_000 + 3 * 4920)));
  });

  it("warns when the same overhead appears in printer rates and monthly overhead", () => {
    const settings = {
      ...refSettings,
      overhead: { ...refSettings.overhead, items: refSettings.overhead.items.map((i) => ({ ...i, included: true })) },
    };
    const r = calculateCost(refJob(), { ...refCtx, settings });
    expect(r.warnings.join(" ")).toMatch(/double counting/i);
    expect(calculateCost(refJob(), refCtx).warnings.join(" ")).not.toMatch(/double counting/i);
  });

  it("overhead is allocated once, using only the chosen basis", () => {
    const labor = calculateCost(refJob(), { ...refCtx, settings: { ...refSettings, overhead: { ...refSettings.overhead, method: "labor_hour" } } });
    expect(line(labor, "overhead")).toBe(Math.round((100 / 60) * 8000)); // 1.667 labour h × ৳80
    const unit = calculateCost(refJob(), { ...refCtx, settings: { ...refSettings, overhead: { ...refSettings.overhead, method: "production_unit" } } });
    expect(line(unit, "overhead")).toBe(10 * 1000); // 10 units × ৳10
  });
});

describe("calculateCost — batch allocation", () => {
  it("unit cost = total batch cost / sellable items", () => {
    const r = calculateCost(refJob({ quantity: 7 }), refCtx);
    expect(r.quantities.plates).toBe(2); // ceil(7 / 5)
    expect(r.quantities.producedItems).toBe(10);
    expect(r.unitCostExact).toBeCloseTo(r.totalBatchCost / 7, 10);
    expect(r.notes.join(" ")).toMatch(/spare/);
  });

  it("amortised design is capped at the full design cost", () => {
    const job = refJob({ quantity: 200, design: { minutes: 60, treatment: "amortize", amortizationUnits: 100 } });
    expect(line(calculateCost(job, refCtx), "design")).toBe(30_000);
  });

  it("separately billed design is excluded from manufacturing cost", () => {
    const r = calculateCost(refJob({ design: { minutes: 60, treatment: "separate", amortizationUnits: 1 } }), refCtx);
    expect(line(r, "design")).toBe(0);
    expect(r.separateDesignFee).toBe(30_000);
  });

  it("labour override changes only labour-driven lines", () => {
    const base = calculateCost(refJob(), refCtx);
    const r = calculateCost(refJob({ laborRateOverride: 240_00 }), refCtx);
    expect(line(r, "labor")).toBe(2 * line(base, "labor"));
    expect(line(r, "material")).toBe(line(base, "material"));
  });
});

describe("calculateCost — invalid inputs", () => {
  it("rejects a 100% failure rate", () => {
    const job = refJob();
    job.failure.rateOverride = 1;
    expect(() => calculateCost(job, refCtx)).toThrow(/100%/);
  });

  it("rejects zero, missing and negative values", () => {
    expect(() => calculateCost(refJob({ quantity: 0 }), refCtx)).toThrow(CostingError);
    expect(() => calculateCost(refJob({ itemsPerPlate: 0 }), refCtx)).toThrow(CostingError);
    expect(() => calculateCost(refJob({ printHoursPerPlate: 0 }), refCtx)).toThrow(CostingError);
    expect(() => calculateCost(refJob({ printHoursPerPlate: Number.NaN }), refCtx)).toThrow(/missing/);
    const job = refJob();
    job.material.slicerTotalGrams = 0;
    expect(() => calculateCost(job, refCtx)).toThrow(CostingError);
    const neg = refJob();
    neg.labor.perPlate.setup = -1;
    expect(() => calculateCost(neg, refCtx)).toThrow(/negative/);
  });

  it("zod schema reports field-level errors", () => {
    const res = jobInputSchema.safeParse({ ...refJob(), name: "", quantity: 1.5 });
    expect(res.success).toBe(false);
    if (!res.success) {
      const paths = res.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("name");
      expect(paths).toContain("quantity");
    }
  });

  it("allows zero-cost components such as no packaging or no design", () => {
    const r = calculateCost(
      refJob({ design: { minutes: 0, treatment: "include", amortizationUnits: 1 }, direct: { packagingPerItem: 0, hardwarePerItem: 0, otherPerBatch: 0 } }),
      refCtx,
    );
    expect(line(r, "design")).toBe(0);
    expect(line(r, "packaging")).toBe(0);
  });
});
