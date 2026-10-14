import { z } from "zod";
import { formatPercent, roundUpToStep, type Poisha } from "../money";
import { issuesToFieldErrors } from "../costing/schemas";
import { applyQuantityDiscount } from "./quantity";
import type { EstimateLine, EstimateOutcome, EstimatorCommonConfig } from "./types";

export interface SizeOption {
  key: string;
  label: string;
  dimensions: string;
  priceDelta: Poisha;
}

export interface MaterialChoice {
  key: string;
  label: string;
  priceDelta: Poisha;
}

export interface PersonalizationField {
  key: string;
  label: string;
  type: "text" | "select";
  maxLength: number;
  options: string[];
  required: boolean;
  price: Poisha;
}

/** Pricing-relevant product data. `minUnitPrice` is PRIVATE and must never be sent to the browser. */
export interface CatalogPricing {
  name: string;
  basePrice: Poisha;
  minUnitPrice: Poisha;
  sizeOptions: SizeOption[];
  materialOptions: MaterialChoice[];
  colors: string[];
  personalization: PersonalizationField[];
  allowQuantityDiscount: boolean;
  leadTimeMinDays: number;
  leadTimeMaxDays: number;
  maxQuantity: number;
}

export const catalogSelectionSchema = z.object({
  size: z.string().max(40).optional(),
  material: z.string().max(40).optional(),
  color: z.string().max(40).optional(),
  personalization: z.record(z.string().max(40), z.string().max(200)).default({}),
  quantity: z.number().int("Quantity must be a whole number").min(1, "At least 1"),
});

export type CatalogSelection = z.infer<typeof catalogSelectionSchema>;

export function estimateCatalogProduct(raw: unknown, p: CatalogPricing, common: EstimatorCommonConfig): EstimateOutcome {
  const parsed = catalogSelectionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: issuesToFieldErrors(parsed.error) };
  const s = parsed.data;
  const errors: Record<string, string> = {};

  if (s.quantity > p.maxQuantity) errors.quantity = `For more than ${p.maxQuantity} pieces, please request a quote`;
  const size = p.sizeOptions.length ? p.sizeOptions.find((o) => o.key === s.size) : undefined;
  if (p.sizeOptions.length && !size) errors.size = "Choose a size";
  const material = p.materialOptions.length ? p.materialOptions.find((o) => o.key === s.material) : undefined;
  if (p.materialOptions.length && !material) errors.material = "Choose a material";
  if (p.colors.length && (!s.color || !p.colors.includes(s.color))) errors.color = "Choose a colour";

  const lines: EstimateLine[] = [{ label: p.name, amount: p.basePrice, scope: "unit" }];
  if (size && size.priceDelta !== 0) lines.push({ label: `Size: ${size.label}`, amount: size.priceDelta, scope: "unit" });
  if (material && material.priceDelta !== 0) lines.push({ label: `Material: ${material.label}`, amount: material.priceDelta, scope: "unit" });

  for (const field of p.personalization) {
    const value = (s.personalization[field.key] ?? "").trim();
    if (!value) {
      if (field.required) errors[`personalization.${field.key}`] = `${field.label} is required`;
      continue;
    }
    if (field.type === "text" && value.length > field.maxLength) {
      errors[`personalization.${field.key}`] = `Keep it to ${field.maxLength} characters`;
    }
    if (field.type === "select" && !field.options.includes(value)) {
      errors[`personalization.${field.key}`] = `Choose a valid ${field.label.toLowerCase()}`;
    }
    if (field.price > 0) lines.push({ label: field.label, amount: field.price, scope: "unit" });
  }
  if (Object.keys(errors).length) return { ok: false, errors };

  const unit = lines.reduce((sum, l) => sum + l.amount, 0);
  const d = applyQuantityDiscount(unit, s.quantity, p.allowQuantityDiscount ? common.quantityTiers : [], p.minUnitPrice);
  const notes: string[] = [];
  if (d.listUnit > unit) lines.push({ label: "Minimum price adjustment", amount: d.listUnit - unit, scope: "unit" });
  if (d.discountAmount > 0) lines.push({ label: `Quantity discount (${formatPercent(d.discountPct, 0)})`, amount: -d.discountAmount, scope: "unit" });
  if (d.floorApplied && d.discountPct > 0) notes.push("The quantity discount is limited so the price still covers production costs.");

  const total = roundUpToStep(d.unit * s.quantity, common.roundingStep);
  notes.push("Final price is confirmed by us before production.");
  return {
    ok: true,
    estimate: {
      unitPrice: d.unit,
      quantity: s.quantity,
      total,
      low: total,
      high: total,
      lines,
      needsReview: false,
      notes,
      approxGrams: 0,
      leadTimeDays: { min: p.leadTimeMinDays, max: p.leadTimeMaxDays },
    },
  };
}
