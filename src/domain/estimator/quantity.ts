import { roundToNearestStep, roundUpToStep, type Poisha } from "../money";
import type { EstimatorCommonConfig, QuantityTier, Range } from "./types";

/** Discount for a quantity: the highest tier whose minimum quantity is reached. */
export function discountFor(quantity: number, tiers: QuantityTier[]): number {
  let best = 0;
  let bestMin = -1;
  for (const t of tiers) {
    if (quantity >= t.minQty && t.minQty > bestMin) {
      best = Math.min(Math.max(t.discountPct, 0), 0.9);
      bestMin = t.minQty;
    }
  }
  return best;
}

export interface DiscountedUnit {
  /** Unit price before discount (never below the floor). */
  listUnit: Poisha;
  unit: Poisha;
  discountPct: number;
  /** Discount actually granted per unit. */
  discountAmount: Poisha;
  /** True when the floor limited the price. */
  floorApplied: boolean;
}

/**
 * Apply a quantity discount without ever going below the minimum sustainable unit price.
 * Customer unit prices are whole taka; the floor and discounted price are rounded UP to the taka
 * so rounding can never undercut the floor.
 */
export function applyQuantityDiscount(
  unitPrice: Poisha,
  quantity: number,
  tiers: QuantityTier[],
  floorUnit: Poisha,
): DiscountedUnit {
  const floor = roundUpToStep(Math.max(0, floorUnit), 1);
  const base = roundUpToStep(Math.max(0, unitPrice), 1);
  const listUnit = Math.max(base, floor);
  const discountPct = discountFor(quantity, tiers);
  const discounted = roundUpToStep(listUnit * (1 - discountPct), 1);
  const unit = Math.max(discounted, floor);
  return {
    listUnit,
    unit,
    discountPct,
    discountAmount: listUnit - unit,
    floorApplied: unit > discounted || listUnit > base,
  };
}

/** Round the order total up to the configured step and produce the indicative range. */
export function finalizeRange(
  rawTotal: number,
  minimumOrder: Poisha,
  floorTotal: number,
  needsReview: boolean,
  common: EstimatorCommonConfig,
): { total: Poisha; low: Poisha; high: Poisha } {
  const total = roundUpToStep(Math.max(rawTotal, minimumOrder, floorTotal), common.roundingStep);
  const lowRaw = Math.max(total * (1 - common.range.lowPct), minimumOrder, floorTotal);
  const highPct = needsReview ? common.range.reviewHighPct : common.range.highPct;
  const low = Math.min(total, Math.max(roundToNearestStep(lowRaw, common.roundingStep), roundUpToStep(Math.max(minimumOrder, floorTotal), common.roundingStep)));
  const high = Math.max(total, roundToNearestStep(total * (1 + highPct), common.roundingStep));
  return { total, low, high };
}

export function leadTime(common: EstimatorCommonConfig, rush: boolean): Range {
  return rush ? common.rushLeadTimeDays : common.leadTimeDays;
}
