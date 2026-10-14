import { formatBDT, formatPercent, roundUpToStep, type Poisha } from "../money";
import { CostingError } from "./rates";
import type { CostResult, CostingSettings, JobInput } from "./types";

/**
 * Pricing model
 * -------------
 *   C  = unit manufacturing cost
 *   M  = target profit margin (profit ÷ net selling price)
 *   F  = sum of percentage selling fees, charged on what the customer pays
 *   t  = tax rate collected on behalf of the authorities (0 when tax mode is "none")
 *   X  = fixed selling fee per order ÷ quantity
 *
 *   Net price  P = (C + X) / (1 − M − F·(1 + t))
 *   Customer pays = P·(1 + t);  fees = F·P·(1 + t) + X;  profit = P − fees − C
 *   Margin = profit ÷ P;  Markup = profit ÷ C
 *
 * With no tax and no fixed fee this reduces to P = C / (1 − M − F); with no fees, P = C / (1 − M).
 * Tax is never revenue and never an expense: it is shown separately.
 */

export interface PriceMetrics {
  /** The price shown to the customer (tax-inclusive when tax mode = inclusive). */
  listPrice: Poisha;
  /** Revenue per item retained by the business, excluding tax. */
  netPrice: number;
  tax: number;
  customerPays: number;
  /** Percentage fees + fixed fee share per item. */
  fees: number;
  unitCost: number;
  profit: number;
  margin: number;
  markup: number;
}

export type TierKey = "minimum" | "standard" | "premium";

export interface PriceTier extends PriceMetrics {
  key: TierKey;
  label: string;
  /** Cost basis used by this tier (unit cost plus any premium add-ons). */
  costBasis: number;
  targetMargin: number;
  /** Exact net price before rounding. */
  requiredNetPrice: number;
  steps: string[];
}

export interface PremiumAddOns {
  personalization: number;
  smallOrder: number;
  rush: number;
  extraService: number;
  total: number;
}

export interface PricingResult {
  tiers: Record<TierKey, PriceTier>;
  addOns: PremiumAddOns;
  feeRate: number;
  taxRate: number;
  fixedFeePerItem: number;
  warnings: string[];
}

export interface PricingParams {
  unitCost: number;
  quantity: number;
  settings: CostingSettings["pricing"];
}

const fmt = (v: number) => formatBDT(v);

function taxRate(pricing: CostingSettings["pricing"]): number {
  return pricing.tax.mode === "none" ? 0 : Math.max(0, pricing.tax.rate);
}

function feeRate(pricing: CostingSettings["pricing"]): number {
  return pricing.percentFees.reduce((s, f) => s + Math.max(0, f.rate), 0);
}

/** Solve the net price required to reach margin M on cost C. */
export function requiredNetPrice(costBasis: number, margin: number, params: Omit<PricingParams, "unitCost">): number {
  const { pricing, quantity } = { pricing: params.settings, quantity: params.quantity };
  const t = taxRate(pricing);
  const F = feeRate(pricing);
  const X = quantity > 0 ? pricing.fixedFeePerOrder / quantity : 0;
  if (!(margin >= 0)) throw new CostingError(["Target margin cannot be negative."]);
  const denominator = 1 - margin - F * (1 + t);
  if (denominator <= 0) {
    throw new CostingError([
      `Target margin (${formatPercent(margin)}) plus selling fees (${formatPercent(F * (1 + t))} of net price) must be below 100%.`,
    ]);
  }
  return (costBasis + X) / denominator;
}

/** Evaluate any list price: what the business keeps, pays in fees and earns. */
export function analyzePrice(listPrice: number, params: PricingParams): PriceMetrics {
  const { settings: pricing, unitCost, quantity } = params;
  const t = taxRate(pricing);
  const F = feeRate(pricing);
  const X = quantity > 0 ? pricing.fixedFeePerOrder / quantity : 0;
  const netPrice = pricing.tax.mode === "inclusive" ? listPrice / (1 + t) : listPrice;
  const tax = netPrice * t;
  const customerPays = netPrice + tax;
  const fees = F * customerPays + X;
  const profit = netPrice - fees - unitCost;
  return {
    listPrice,
    netPrice,
    tax,
    customerPays,
    fees,
    unitCost,
    profit,
    margin: netPrice > 0 ? profit / netPrice : Number.NaN,
    markup: unitCost > 0 ? profit / unitCost : Number.NaN,
  };
}

/** Convert a required net price into a rounded list price (rounded UP so it never undershoots). */
function toListPrice(net: number, pricing: CostingSettings["pricing"]): Poisha {
  const t = taxRate(pricing);
  const gross = pricing.tax.mode === "inclusive" ? net * (1 + t) : net;
  return roundUpToStep(gross, pricing.roundingStep);
}

export function premiumAddOns(job: JobInput, cost: CostResult, pricing: CostingSettings["pricing"]): PremiumAddOns {
  const Q = job.quantity;
  const pr = pricing.premium;
  const personalization = job.premium.personalized
    ? (Math.max(0, pr.personalizationMinutesPerItem) / 60) * cost.rates.laborRatePerHour
    : 0;
  const smallOrder = Q < pr.smallOrderThreshold ? Math.max(0, pr.smallOrderFee) / Q : 0;
  const rush = job.premium.rush ? (Math.max(0, pr.rushFeePerMachineHour) * cost.quantities.machineHours) / Q : 0;
  const extraService = Math.max(0, job.premium.extraServiceFee) / Q;
  return { personalization, smallOrder, rush, extraService, total: personalization + smallOrder + rush + extraService };
}

/** Compute the minimum sustainable, standard and premium prices for a costed job. */
export function priceJob(job: JobInput, cost: CostResult, pricing: CostingSettings["pricing"]): PricingResult {
  const warnings: string[] = [];
  if (!(pricing.targetMargin >= 0 && pricing.targetMargin < 1)) {
    throw new CostingError(["Standard target margin must be between 0% and 100%."]);
  }
  if (!(pricing.premiumMargin >= 0 && pricing.premiumMargin < 1)) {
    throw new CostingError(["Premium target margin must be between 0% and 100%."]);
  }
  const Q = job.quantity;
  const C = cost.unitCostExact;
  const base: Omit<PricingParams, "unitCost"> = { quantity: Q, settings: pricing };
  const addOns = premiumAddOns(job, cost, pricing);
  const t = taxRate(pricing);
  const F = feeRate(pricing);
  const X = pricing.fixedFeePerOrder / Q;

  const build = (key: TierKey, label: string, costBasis: number, margin: number, extraSteps: string[]): PriceTier => {
    const req = requiredNetPrice(costBasis, margin, base);
    const list = toListPrice(req, pricing);
    const metrics = analyzePrice(list, { ...base, unitCost: C });
    const steps = [
      ...extraSteps,
      `Net price = (${fmt(costBasis)}${X > 0 ? ` + ${fmt(X)} fixed fee` : ""}) ÷ (1 − ${formatPercent(margin)} margin${F > 0 ? ` − ${formatPercent(F * (1 + t), 2)} fees` : ""}) = ${fmt(req)}`,
    ];
    if (pricing.tax.mode === "inclusive" && t > 0) steps.push(`Add ${pricing.tax.label} ${formatPercent(t)} (price shown includes tax): ${fmt(req * (1 + t))}`);
    steps.push(
      pricing.roundingStep > 0 ? `Rounded up to the nearest ৳${pricing.roundingStep}: ${fmt(list)}` : `Rounded up to whole poisha: ${fmt(list)}`,
    );
    if (pricing.tax.mode === "exclusive" && t > 0) steps.push(`${pricing.tax.label} ${formatPercent(t)} (${fmt(metrics.tax)}) is added on top at checkout.`);
    return { key, label, costBasis, targetMargin: margin, requiredNetPrice: req, steps, ...metrics };
  };

  const minimum = build("minimum", "Minimum sustainable", C, 0, [
    `Unit manufacturing cost: ${fmt(C)} — no profit target, only costs and selling fees are recovered.`,
  ]);
  const standard = build("standard", "Standard", C, pricing.targetMargin, [
    `Unit manufacturing cost ${fmt(C)} at the standard ${formatPercent(pricing.targetMargin)} target margin.`,
  ]);

  const premiumSteps = [`Unit manufacturing cost: ${fmt(C)}`];
  if (addOns.personalization > 0) premiumSteps.push(`+ personalisation ${pricing.premium.personalizationMinutesPerItem} min × labour rate = ${fmt(addOns.personalization)}`);
  if (addOns.smallOrder > 0) premiumSteps.push(`+ small-order fee ${fmt(pricing.premium.smallOrderFee)} ÷ ${Q} = ${fmt(addOns.smallOrder)}`);
  if (addOns.rush > 0) premiumSteps.push(`+ rush capacity ${fmt(pricing.premium.rushFeePerMachineHour)}/machine h × ${cost.quantities.machineHours.toFixed(2)} h ÷ ${Q} = ${fmt(addOns.rush)}`);
  if (addOns.extraService > 0) premiumSteps.push(`+ extra service ${fmt(job.premium.extraServiceFee)} ÷ ${Q} = ${fmt(addOns.extraService)}`);
  premiumSteps.push(`= cost basis ${fmt(C + addOns.total)} at the ${formatPercent(pricing.premiumMargin)} premium margin.`);
  let premium = build("premium", "Premium / custom", C + addOns.total, pricing.premiumMargin, premiumSteps);

  if (premium.listPrice < standard.listPrice) {
    premium = {
      ...standard,
      key: "premium",
      label: "Premium / custom",
      steps: [...premium.steps, `Raised to the standard price (${fmt(standard.listPrice)}) — premium must never be lower than standard.`],
    };
    warnings.push("Premium margin is set lower than the standard margin; premium price was raised to the standard price.");
  }

  if (standard.listPrice < minimum.listPrice) {
    // Not reachable with M ≥ 0, but guard explicitly so the invariant is never silently violated.
    throw new CostingError(["Internal pricing error: standard price fell below the minimum sustainable price."]);
  }

  return { tiers: { minimum, standard, premium }, addOns, feeRate: F, taxRate: t, fixedFeePerItem: X, warnings };
}

export interface PriceCheck {
  metrics: PriceMetrics;
  warnings: string[];
  status: "loss" | "below_minimum" | "low_margin" | "ok";
}

/** Check a manually chosen price against costs and the minimum sustainable price. */
export function checkChosenPrice(
  listPrice: number,
  params: PricingParams & { minimumListPrice: number },
): PriceCheck {
  const metrics = analyzePrice(listPrice, params);
  const warnings: string[] = [];
  let status: PriceCheck["status"] = "ok";
  if (metrics.profit < 0) {
    status = "loss";
    warnings.push(`Selling at ${fmt(listPrice)} loses ${fmt(-metrics.profit)} per item after costs and fees.`);
  } else if (listPrice < params.minimumListPrice) {
    status = "below_minimum";
    warnings.push(`Price is below the minimum sustainable price of ${fmt(params.minimumListPrice)}.`);
  }
  if (status === "ok" && metrics.margin < params.settings.lowMarginThreshold) {
    status = "low_margin";
    warnings.push(
      `Margin ${formatPercent(metrics.margin)} is below your ${formatPercent(params.settings.lowMarginThreshold)} low-margin threshold.`,
    );
  }
  return { metrics, warnings, status };
}
