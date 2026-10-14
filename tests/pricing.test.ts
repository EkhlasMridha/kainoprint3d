import { describe, expect, it } from "vitest";
import { calculateCost } from "@/domain/costing/engine";
import { analyzePrice, checkChosenPrice, priceJob, requiredNetPrice } from "@/domain/costing/pricing";
import type { CostingSettings } from "@/domain/costing/types";
import { refCtx, refJob, refSettings } from "./fixtures";

const pricing = (over: Partial<CostingSettings["pricing"]> = {}): CostingSettings["pricing"] => ({ ...refSettings.pricing, ...over });

describe("profit margin vs markup", () => {
  it("are different numbers for the same price", () => {
    const m = analyzePrice(100_00, { unitCost: 60_00, quantity: 1, settings: pricing({ roundingStep: 0 }) });
    expect(m.profit).toBe(40_00);
    expect(m.margin).toBeCloseTo(0.4, 12); // 40 / 100
    expect(m.markup).toBeCloseTo(0.6667, 4); // 40 / 60
    expect(m.margin).not.toBeCloseTo(m.markup, 2);
  });

  it("price = cost / (1 − M) yields exactly margin M (not markup M)", () => {
    const P = requiredNetPrice(60_00, 0.4, { quantity: 1, settings: pricing() });
    expect(P).toBeCloseTo(100_00, 8);
    // A naive 40% markup would give ৳84 and only a 28.6% margin.
    const naive = analyzePrice(84_00, { unitCost: 60_00, quantity: 1, settings: pricing() });
    expect(naive.margin).toBeCloseTo(0.2857, 4);
  });
});

describe("percentage selling fees", () => {
  it("are part of the price equation: P = C / (1 − M − F)", () => {
    const s = pricing({ percentFees: [{ label: "Gateway", rate: 0.02 }], roundingStep: 0 });
    const P = requiredNetPrice(60_00, 0.4, { quantity: 1, settings: s });
    expect(P).toBeCloseTo(6000 / 0.58, 8);
    const m = analyzePrice(P, { unitCost: 60_00, quantity: 1, settings: s });
    expect(m.fees).toBeCloseTo(0.02 * P, 8);
    expect(m.margin).toBeCloseTo(0.4, 10); // margin target still achieved after fees
  });

  it("a fixed per-order fee is spread across the order", () => {
    const s = pricing({ fixedFeePerOrder: 50_00, roundingStep: 0 });
    const P = requiredNetPrice(60_00, 0.4, { quantity: 10, settings: s });
    expect(P).toBeCloseTo((6000 + 500) / 0.6, 8);
  });

  it("rejects margin + fees ≥ 100%", () => {
    const s = pricing({ percentFees: [{ label: "Marketplace", rate: 0.65 }] });
    expect(() => requiredNetPrice(60_00, 0.4, { quantity: 1, settings: s })).toThrow(/below 100%/);
  });
});

describe("tax handling", () => {
  it("exclusive tax is added on top and is neither revenue nor expense", () => {
    const s = pricing({ tax: { mode: "exclusive", rate: 0.15, label: "VAT" }, roundingStep: 0 });
    const m = analyzePrice(100_00, { unitCost: 60_00, quantity: 1, settings: s });
    expect(m.netPrice).toBe(100_00);
    expect(m.tax).toBeCloseTo(15_00, 8);
    expect(m.customerPays).toBeCloseTo(115_00, 8);
    expect(m.profit).toBe(40_00);
  });

  it("inclusive tax is removed from the list price before computing profit", () => {
    const s = pricing({ tax: { mode: "inclusive", rate: 0.15, label: "VAT" }, roundingStep: 0 });
    const m = analyzePrice(115_00, { unitCost: 60_00, quantity: 1, settings: s });
    expect(m.netPrice).toBeCloseTo(100_00, 8);
    expect(m.profit).toBeCloseTo(40_00, 8);
  });

  it("percentage fees charged on the tax-inclusive amount are accounted for", () => {
    const s = pricing({ tax: { mode: "exclusive", rate: 0.15, label: "VAT" }, percentFees: [{ label: "Gateway", rate: 0.02 }], roundingStep: 0 });
    const P = requiredNetPrice(60_00, 0.4, { quantity: 1, settings: s });
    const m = analyzePrice(P, { unitCost: 60_00, quantity: 1, settings: s });
    expect(m.margin).toBeCloseTo(0.4, 10);
  });
});

describe("priceJob tiers (reference scenario)", () => {
  const cost = calculateCost(refJob(), refCtx);

  it("computes minimum, standard and premium prices", () => {
    const r = priceJob(refJob(), cost, pricing());
    expect(r.tiers.minimum.listPrice).toBe(95_00); // ৳94.83 → ৳95
    expect(r.tiers.standard.requiredNetPrice).toBeCloseTo(9482.7 / 0.6, 8); // ৳158.05
    expect(r.tiers.standard.listPrice).toBe(160_00);
    expect(r.tiers.standard.profit).toBeCloseTo(16000 - 9482.7, 8);
    expect(r.tiers.premium.listPrice).toBe(190_00); // 9482.7 / 0.5 = ৳189.65 → ৳190
  });

  it("premium uses cost-based add-ons, not arbitrary multipliers", () => {
    const job = refJob({ quantity: 2, premium: { personalized: true, rush: true, extraServiceFee: 0 } });
    const c = calculateCost(job, refCtx);
    const r = priceJob(job, c, pricing());
    expect(r.addOns.personalization).toBeCloseTo((6 / 60) * 12000, 8); // 6 min × ৳120/h = ৳12
    expect(r.addOns.smallOrder).toBeCloseTo(6000 / 2, 8); // ৳60 ÷ 2
    expect(r.addOns.rush).toBeCloseTo((4000 * c.quantities.machineHours) / 2, 8);
    expect(r.tiers.premium.costBasis).toBeCloseTo(c.unitCostExact + r.addOns.total, 8);
  });

  it("never lets premium fall below standard, nor standard below minimum", () => {
    const r = priceJob(refJob(), cost, pricing({ premiumMargin: 0.1 }));
    expect(r.tiers.premium.listPrice).toBeGreaterThanOrEqual(r.tiers.standard.listPrice);
    expect(r.warnings.join(" ")).toMatch(/premium/i);
    for (const step of [0, 1, 5, 10, 50, 100] as const) {
      const t = priceJob(refJob(), cost, pricing({ roundingStep: step })).tiers;
      expect(t.standard.listPrice).toBeGreaterThanOrEqual(t.minimum.listPrice);
      expect(t.minimum.listPrice).toBeGreaterThanOrEqual(cost.unitCostExact);
      expect(t.minimum.profit).toBeGreaterThanOrEqual(0);
    }
  });

  it("rounding policies round the list price up to the step", () => {
    expect(priceJob(refJob(), cost, pricing({ roundingStep: 0 })).tiers.standard.listPrice).toBe(15805);
    expect(priceJob(refJob(), cost, pricing({ roundingStep: 10 })).tiers.standard.listPrice).toBe(160_00);
    expect(priceJob(refJob(), cost, pricing({ roundingStep: 50 })).tiers.standard.listPrice).toBe(200_00);
  });
});

describe("checkChosenPrice (manual override)", () => {
  const params = { unitCost: 9482.7, quantity: 10, settings: pricing(), minimumListPrice: 95_00 };

  it("flags a loss-making price", () => {
    const r = checkChosenPrice(90_00, params);
    expect(r.status).toBe("loss");
    expect(r.metrics.profit).toBeLessThan(0);
  });

  it("flags low margins", () => {
    const r = checkChosenPrice(110_00, params);
    expect(r.status).toBe("low_margin"); // 13.8% < 20%
  });

  it("accepts a healthy price and reports margin and markup separately", () => {
    const r = checkChosenPrice(175_00, params);
    expect(r.status).toBe("ok");
    expect(r.metrics.margin).toBeCloseTo((17500 - 9482.7) / 17500, 10);
    expect(r.metrics.markup).toBeCloseTo((17500 - 9482.7) / 9482.7, 10);
  });
});
