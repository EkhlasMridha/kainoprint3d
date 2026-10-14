import type { Poisha, RoundingStep } from "../money";

export interface QuantityTier {
  minQty: number;
  /** Discount fraction, e.g. 0.1 for 10%. */
  discountPct: number;
}

export interface EstimatorMaterialOption {
  key: string;
  label: string;
  /** Plain-language description for customers. */
  description: string;
  /** g/cm³ — used only for the weight approximation. */
  density: number;
  /** Price surcharge relative to standard PLA (fraction). */
  surchargePct: number;
  active: boolean;
}

export interface ColorOption {
  key: string;
  label: string;
  hex: string;
}

export interface EstimatorCommonConfig {
  materials: EstimatorMaterialOption[];
  colors: ColorOption[];
  quantityTiers: QuantityTier[];
  roundingStep: RoundingStep;
  /** Indicative range around the point estimate. */
  range: { lowPct: number; highPct: number; reviewHighPct: number };
  rushPct: number;
  rushMinimumFee: Poisha;
  leadTimeDays: { min: number; max: number };
  rushLeadTimeDays: { min: number; max: number };
  /** Effective solid fraction of a printed part (walls + infill), used for weight estimates. */
  solidityFactor: number;
  /** Maximum upload size for customer reference files, in MB. */
  maxUploadMb: number;
}

export type KeychainType = "text" | "logo" | "shape" | "custom";

export interface KeychainTypeConfig {
  key: KeychainType;
  label: string;
  description: string;
  basePrice: Poisha;
  /** Fraction of the bounding box that is filled with material. */
  fillFactor: number;
  needsReview: boolean;
  requiresDesignFee: boolean;
}

export interface Range {
  min: number;
  max: number;
}

export interface PricedOption {
  key: string;
  label: string;
  price: Poisha;
}

/** PRIVATE: cost floor used to stop discounts going below the minimum sustainable price. */
export interface CostFloor {
  perUnit: Poisha;
  perGram: Poisha;
  perHour: Poisha;
}

export interface KeychainConfig {
  types: KeychainTypeConfig[];
  limits: { width: Range; height: Range; thickness: Range; maxTextLength: number; maxColors: number; maxQuantity: number };
  includedGrams: number;
  pricePerExtraGram: Poisha;
  includedCharacters: number;
  pricePerExtraCharacter: Poisha;
  extraColorCharge: Poisha;
  doubleSidedFee: Poisha;
  personalizationFee: Poisha;
  designFee: Poisha;
  minimumOrderPrice: Poisha;
  hardware: PricedOption[];
  /** Approximate print throughput for small parts, g per hour. */
  gramsPerHour: number;
  floor: CostFloor;
}

export interface OrganizerFeature {
  grams: number;
  hours: number;
  price: Poisha;
}

export interface OrganizerPreset {
  key: string;
  name: string;
  description: string;
  width: number;
  length: number;
  height: number;
  compartments: number;
  penHolders: number;
  phoneStand: boolean;
  drawers: number;
  cableManagement: boolean;
}

export interface OrganizerConfig {
  limits: {
    width: Range;
    length: Range;
    height: Range;
    maxCompartments: number;
    maxPenHolders: number;
    maxDrawers: number;
    maxColors: number;
    maxQuantity: number;
  };
  /** Shell model: walls/base thickness, divider height relative to walls, and solid fraction of walls. */
  geometry: { wallMm: number; baseMm: number; dividerHeightFactor: number; solidity: number };
  gramsPerHour: number;
  pricePerGram: Poisha;
  pricePerPrintHour: Poisha;
  baseDesignFee: Poisha;
  designAssistanceFee: Poisha;
  compartmentFee: Poisha;
  extraColorCharge: Poisha;
  features: {
    penHolder: OrganizerFeature;
    phoneStand: OrganizerFeature;
    drawer: OrganizerFeature;
    cableManagement: OrganizerFeature;
  };
  assemblyFeePerUnit: Poisha;
  customTextFee: Poisha;
  customLogoFee: Poisha;
  minimumOrderPrice: Poisha;
  presets: OrganizerPreset[];
  floor: CostFloor;
}

export interface EstimateLine {
  label: string;
  amount: Poisha;
  /** "unit" lines are per item; "order" lines are charged once. */
  scope: "unit" | "order";
}

export interface Estimate {
  unitPrice: Poisha;
  quantity: number;
  total: Poisha;
  low: Poisha;
  high: Poisha;
  lines: EstimateLine[];
  needsReview: boolean;
  notes: string[];
  approxGrams: number;
  leadTimeDays: Range;
}

export type EstimateOutcome = { ok: true; estimate: Estimate } | { ok: false; errors: Record<string, string> };
