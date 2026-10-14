import { z } from "zod";
import { roundingStepSchema } from "../costing/schemas";

const money = z.number().int("Use whole poisha").min(0, "Cannot be negative").max(100_000_00, "Too large");
const frac = (max = 0.9) => z.number().min(0, "Cannot be negative").max(max, `At most ${Math.round(max * 100)}%`);
const key = z.string().trim().regex(/^[a-z0-9_-]{1,40}$/, "Use lowercase letters, numbers, - or _");
const label = z.string().trim().min(1, "Required").max(80);
const range = (max: number) =>
  z.object({ min: z.number().min(0).max(max), max: z.number().min(0).max(max) }).refine((r) => r.min <= r.max, "Minimum must not exceed maximum");
const floor = z.object({ perUnit: money, perGram: money, perHour: money });

export const estimatorCommonSchema = z.object({
  materials: z
    .array(z.object({ key, label, description: z.string().trim().max(200), density: z.number().min(0.5).max(3), surchargePct: frac(3), active: z.boolean() }))
    .min(1, "Add at least one material"),
  colors: z.array(z.object({ key, label, hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a #RRGGBB colour") })).min(1),
  quantityTiers: z.array(z.object({ minQty: z.number().int().min(2).max(100_000), discountPct: frac(0.6) })).max(10),
  roundingStep: roundingStepSchema,
  range: z.object({ lowPct: frac(0.5), highPct: frac(1), reviewHighPct: frac(2) }),
  rushPct: frac(2),
  rushMinimumFee: money,
  leadTimeDays: range(120),
  rushLeadTimeDays: range(120),
  solidityFactor: z.number().gt(0).max(1),
  maxUploadMb: z.number().int().min(1).max(100),
});

const keychainType = z.object({
  key: z.enum(["text", "logo", "shape", "custom"]),
  label,
  description: z.string().trim().max(200),
  basePrice: money,
  fillFactor: z.number().gt(0).max(1),
  needsReview: z.boolean(),
  requiresDesignFee: z.boolean(),
});

export const keychainConfigSchema = z.object({
  types: z.array(keychainType).min(1),
  limits: z.object({
    width: range(300),
    height: range(300),
    thickness: range(30),
    maxTextLength: z.number().int().min(1).max(60),
    maxColors: z.number().int().min(1).max(8),
    maxQuantity: z.number().int().min(1).max(100_000),
  }),
  includedGrams: z.number().min(0).max(1000),
  pricePerExtraGram: money,
  includedCharacters: z.number().int().min(0).max(60),
  pricePerExtraCharacter: money,
  extraColorCharge: money,
  doubleSidedFee: money,
  personalizationFee: money,
  designFee: money,
  minimumOrderPrice: money,
  hardware: z.array(z.object({ key, label, price: money })).min(1, "Add at least one ring option"),
  gramsPerHour: z.number().gt(0).max(500),
  floor,
});

const feature = z.object({ grams: z.number().min(0).max(5000), hours: z.number().min(0).max(200), price: money });

export const organizerPresetSchema = z.object({
  key,
  name: label,
  description: z.string().trim().max(200),
  width: z.number().min(1).max(1000),
  length: z.number().min(1).max(1000),
  height: z.number().min(1).max(1000),
  compartments: z.number().int().min(1).max(50),
  penHolders: z.number().int().min(0).max(20),
  phoneStand: z.boolean(),
  drawers: z.number().int().min(0).max(10),
  cableManagement: z.boolean(),
});

export const organizerConfigSchema = z.object({
  limits: z.object({
    width: range(1000),
    length: range(1000),
    height: range(1000),
    maxCompartments: z.number().int().min(1).max(50),
    maxPenHolders: z.number().int().min(0).max(20),
    maxDrawers: z.number().int().min(0).max(10),
    maxColors: z.number().int().min(1).max(8),
    maxQuantity: z.number().int().min(1).max(10_000),
  }),
  geometry: z.object({
    wallMm: z.number().gt(0).max(20),
    baseMm: z.number().gt(0).max(20),
    dividerHeightFactor: z.number().min(0).max(1),
    solidity: z.number().gt(0).max(1),
  }),
  gramsPerHour: z.number().gt(0).max(500),
  pricePerGram: money,
  pricePerPrintHour: money,
  baseDesignFee: money,
  designAssistanceFee: money,
  compartmentFee: money,
  extraColorCharge: money,
  features: z.object({ penHolder: feature, phoneStand: feature, drawer: feature, cableManagement: feature }),
  assemblyFeePerUnit: money,
  customTextFee: money,
  customLogoFee: money,
  minimumOrderPrice: money,
  presets: z.array(organizerPresetSchema).max(20),
  floor,
});
