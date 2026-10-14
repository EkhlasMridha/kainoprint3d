import type { Estimate, EstimatorCommonConfig, KeychainConfig, OrganizerConfig, Range } from "./types";

/**
 * Public projections of estimator configuration.
 *
 * These are the ONLY estimator data structures that may be sent to the browser. They contain
 * labels, limits and presets — never prices, cost floors, densities-driven formulas or rates.
 * Prices are computed on the server and returned only as customer-facing line items.
 */

export interface PublicMaterialOption {
  key: string;
  label: string;
  description: string;
}

export interface PublicCommonOptions {
  materials: PublicMaterialOption[];
  colors: { key: string; label: string; hex: string }[];
  quantityTiers: { minQty: number; discountPercent: number }[];
  leadTimeDays: Range;
  rushLeadTimeDays: Range;
  maxUploadMb: number;
}

export interface PublicKeychainOptions {
  types: { key: string; label: string; description: string; needsReview: boolean }[];
  hardware: { key: string; label: string }[];
  limits: KeychainConfig["limits"];
}

export interface PublicOrganizerOptions {
  limits: OrganizerConfig["limits"];
  presets: OrganizerConfig["presets"];
}

export function toPublicCommon(c: EstimatorCommonConfig): PublicCommonOptions {
  return {
    materials: c.materials.filter((m) => m.active).map((m) => ({ key: m.key, label: m.label, description: m.description })),
    colors: c.colors.map((col) => ({ key: col.key, label: col.label, hex: col.hex })),
    quantityTiers: c.quantityTiers
      .slice()
      .sort((a, b) => a.minQty - b.minQty)
      .map((t) => ({ minQty: t.minQty, discountPercent: Math.round(t.discountPct * 100) })),
    leadTimeDays: { min: c.leadTimeDays.min, max: c.leadTimeDays.max },
    rushLeadTimeDays: { min: c.rushLeadTimeDays.min, max: c.rushLeadTimeDays.max },
    maxUploadMb: c.maxUploadMb,
  };
}

export function toPublicKeychain(k: KeychainConfig): PublicKeychainOptions {
  return {
    types: k.types.map((t) => ({ key: t.key, label: t.label, description: t.description, needsReview: t.needsReview })),
    hardware: k.hardware.map((h) => ({ key: h.key, label: h.label })),
    limits: {
      width: { ...k.limits.width },
      height: { ...k.limits.height },
      thickness: { ...k.limits.thickness },
      maxTextLength: k.limits.maxTextLength,
      maxColors: k.limits.maxColors,
      maxQuantity: k.limits.maxQuantity,
    },
  };
}

export function toPublicOrganizer(o: OrganizerConfig): PublicOrganizerOptions {
  return {
    limits: {
      width: { ...o.limits.width },
      length: { ...o.limits.length },
      height: { ...o.limits.height },
      maxCompartments: o.limits.maxCompartments,
      maxPenHolders: o.limits.maxPenHolders,
      maxDrawers: o.limits.maxDrawers,
      maxColors: o.limits.maxColors,
      maxQuantity: o.limits.maxQuantity,
    },
    presets: o.presets.map((p) => ({ ...p })),
  };
}

/** The public estimate response: explicitly whitelisted fields only. */
export interface PublicEstimate {
  unitPrice: number;
  quantity: number;
  total: number;
  low: number;
  high: number;
  lines: { label: string; amount: number; scope: "unit" | "order" }[];
  needsReview: boolean;
  notes: string[];
  approxGrams: number;
  leadTimeDays: Range;
}

export function toPublicEstimate(e: Estimate): PublicEstimate {
  return {
    unitPrice: e.unitPrice,
    quantity: e.quantity,
    total: e.total,
    low: e.low,
    high: e.high,
    lines: e.lines.map((l) => ({ label: l.label, amount: l.amount, scope: l.scope })),
    needsReview: e.needsReview,
    notes: [...e.notes],
    approxGrams: e.approxGrams,
    leadTimeDays: { min: e.leadTimeDays.min, max: e.leadTimeDays.max },
  };
}
