import { roundPoisha, type Poisha } from "../money";
import { calculateCost, type CostContext } from "./engine";
import { checkChosenPrice, priceJob, type PriceCheck, type PricingResult, type TierKey } from "./pricing";
import type { CostResult, JobInput } from "./types";

export type ChosenTier = TierKey | "custom";

export interface Evaluation {
  cost: CostResult;
  pricing: PricingResult;
  chosenTier: ChosenTier;
  chosenPrice: Poisha;
  check: PriceCheck;
}

/** Run cost + pricing and evaluate the chosen (or overridden) selling price. */
export function evaluateJob(job: JobInput, ctx: CostContext, chosenTier: ChosenTier = "standard", customPrice?: Poisha | null): Evaluation {
  const cost = calculateCost(job, ctx);
  const pricing = priceJob(job, cost, ctx.settings.pricing);
  const chosenPrice =
    chosenTier === "custom" && customPrice != null && customPrice > 0
      ? roundPoisha(customPrice)
      : pricing.tiers[chosenTier === "custom" ? "standard" : chosenTier].listPrice;
  const check = checkChosenPrice(chosenPrice, {
    unitCost: cost.unitCostExact,
    quantity: job.quantity,
    settings: ctx.settings.pricing,
    minimumListPrice: pricing.tiers.minimum.listPrice,
  });
  return { cost, pricing, chosenTier: chosenTier === "custom" && !(customPrice && customPrice > 0) ? "standard" : chosenTier, chosenPrice, check };
}

/** Flat, denormalised columns stored with each saved calculation (for dashboards and reports). */
export function storageColumns(job: JobInput, ev: Evaluation) {
  const m = ev.check.metrics;
  return {
    quantity: job.quantity,
    totalBatchCost: ev.cost.totalBatchCost,
    unitCost: ev.cost.unitCost,
    minimumPrice: ev.pricing.tiers.minimum.listPrice,
    standardPrice: ev.pricing.tiers.standard.listPrice,
    premiumPrice: ev.pricing.tiers.premium.listPrice,
    chosenTier: ev.chosenTier,
    chosenPrice: ev.chosenPrice,
    profitPerItem: roundPoisha(m.profit),
    margin: Number.isFinite(m.margin) ? m.margin : 0,
    markup: Number.isFinite(m.markup) ? m.markup : 0,
    totalGrams: ev.cost.quantities.expectedTotalGrams,
    machineHours: ev.cost.quantities.expectedMachineHours,
    laborHours: ev.cost.quantities.directLaborHours,
  };
}
