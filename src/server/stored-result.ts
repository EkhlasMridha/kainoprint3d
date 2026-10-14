import "server-only";
import type { PriceCheck, PricingResult } from "@/domain/costing/pricing";
import type { CostingSettings, CostResult, JobInput, MaterialProfile, PrinterProfile } from "@/domain/costing/types";

/** Shape written by saveCalculation / the seed script into CostCalculation.result & snapshot. */
export interface StoredResult {
  cost: CostResult;
  pricing: PricingResult;
  check: PriceCheck;
}

export interface StoredSnapshot {
  printer: PrinterProfile;
  material: MaterialProfile;
  settings: CostingSettings;
}

export function readStoredCalculation(c: { result: unknown; snapshot: unknown; input: unknown }) {
  const result = c.result as StoredResult | null;
  const snapshot = c.snapshot as StoredSnapshot | null;
  const job = c.input as JobInput | null;
  if (!result?.cost?.lines || !result.pricing?.tiers || !snapshot?.printer || !job) return null;
  return { result, snapshot, job };
}
