import type { Poisha, RoundingStep } from "../money";

/* ------------------------------------------------------------------------------------------------
 * Configuration owned by the business (persisted, editable in the admin panel)
 * ---------------------------------------------------------------------------------------------- */

export type MaintenanceMethod = "per_hour" | "monthly";

export interface PrinterProfile {
  name: string;
  /** Purchase price including import duty and shipping. */
  purchasePrice: Poisha;
  /** Expected resale / residual value at end of life. */
  residualValue: Poisha;
  /** Expected useful lifetime in productive printing hours. */
  lifetimeHours: number;
  /** Expected productive printing hours per month (used for monthly-cost allocation). */
  monthlyProductiveHours: number;
  /** Average MEASURED power draw while printing, in watts (not the PSU rating). */
  averagePowerWatts: number;
  /** Electricity tariff, poisha per kWh. */
  electricityRatePerKwh: Poisha;
  maintenanceMethod: MaintenanceMethod;
  /** Used when maintenanceMethod = per_hour. */
  maintenancePerHour: Poisha;
  /** Used when maintenanceMethod = monthly (spread over monthlyProductiveHours). */
  maintenanceMonthly: Poisha;
  nozzleCost: Poisha;
  nozzleLifeHours: number;
  /** Build plates, PTFE tubes, lubricant, etc. per operating hour. */
  otherConsumablesPerHour: Poisha;
  /** Probability (0–1) that a print attempt on this printer fails. */
  failureRate: number;
  /** Printer-specific operating overhead per month (e.g. enclosure, dedicated UPS). */
  additionalOverheadMonthly: Poisha;
}

export interface MaterialProfile {
  name: string;
  /** Price paid per spool including delivery. */
  purchasePrice: Poisha;
  /** Nominal spool weight in grams (e.g. 1000). */
  spoolWeightGrams: number;
  /** Net usable grams after spool-end and handling losses; defaults to spoolWeightGrams. */
  netUsableGrams?: number | null;
  /** Drying, desiccant, storage and handling cost allocated per spool. */
  handlingCostPerSpool: Poisha;
  /** Additional material-specific failure probability (0–1), e.g. TPU or nylon. */
  failureRate: number;
  /** Extra waste (fraction of slicer grams) NOT already captured by netUsableGrams or the slicer. */
  wasteAllowancePct: number;
}

export type OverheadMethod = "machine_hour" | "labor_hour" | "production_unit";

export type OverheadCategory =
  | "rent"
  | "internet_software"
  | "equipment_maintenance"
  | "packaging_supplies"
  | "marketing"
  | "general"
  | "other";

export interface OverheadItem {
  id: string;
  label: string;
  category: OverheadCategory;
  monthlyAmount: Poisha;
  /** Excluded items are kept for reference but not allocated (e.g. already costed per job). */
  included: boolean;
}

export type TaxMode = "none" | "exclusive" | "inclusive";

export interface PercentFee {
  label: string;
  /** Fraction of the amount the customer pays, e.g. 0.0185 for a 1.85% payment fee. */
  rate: number;
}

export interface CostingSettings {
  laborRatePerHour: Poisha;
  designRatePerHour: Poisha;
  overhead: {
    method: OverheadMethod;
    items: OverheadItem[];
    /** Shop-wide productive machine hours per month (machine_hour method). */
    monthlyMachineHours: number;
    /** Direct labour hours per month (labor_hour method). */
    monthlyLaborHours: number;
    /** Sellable units produced per month (production_unit method). */
    monthlyProductionUnits: number;
  };
  /** Default fraction of a plate's machine time & material consumed by a failed attempt. */
  defaultFailureConsumption: number;
  pricing: {
    /** Standard target profit margin (fraction of net selling price). */
    targetMargin: number;
    /** Target margin for premium / custom work. Must be ≥ targetMargin. */
    premiumMargin: number;
    /** Warn when the chosen price's margin is below this. */
    lowMarginThreshold: number;
    percentFees: PercentFee[];
    /** Fixed selling fee per order (e.g. marketplace listing fee), spread across the order. */
    fixedFeePerOrder: Poisha;
    tax: { mode: TaxMode; rate: number; label: string };
    roundingStep: RoundingStep;
    premium: {
      /** Extra hands-on minutes per item for personalisation work. */
      personalizationMinutesPerItem: number;
      /** Orders smaller than this many units pay the small-order handling fee. */
      smallOrderThreshold: number;
      smallOrderFee: Poisha;
      /** Opportunity cost of displacing scheduled work for rush jobs, per machine hour. */
      rushFeePerMachineHour: Poisha;
    };
  };
}

/* ------------------------------------------------------------------------------------------------
 * Per-calculation inputs
 * ---------------------------------------------------------------------------------------------- */

export type MaterialEntryMode = "components" | "slicer_total";
export type DesignTreatment = "include" | "amortize" | "separate";

export interface JobInput {
  name: string;
  /** Batch quantity: sellable items ordered / planned. */
  quantity: number;
  /** Items produced on one build plate (one print job). */
  itemsPerPlate: number;
  /** Printer run time for ONE plate, in hours (from the slicer). */
  printHoursPerPlate: number;
  material: {
    mode: MaterialEntryMode;
    /** Grams for ONE plate. */
    modelGrams: number;
    supportGrams: number;
    purgeGrams: number;
    /** Slicer's total for ONE plate, already including supports, purge and transitions. */
    slicerTotalGrams: number;
    /** Apply the material's extra waste allowance (handling loss not in the slicer figure). */
    applyWasteAllowance: boolean;
  };
  failure: {
    /** Overrides the printer/material failure rate when set (0–1). */
    rateOverride: number | null;
    /** Average fraction of a plate consumed by a failed attempt (0–1]. */
    consumptionFraction: number;
    /** Include re-setup and cleanup labour for failed attempts. */
    includeLabor: boolean;
    /** Set when the inputs already include expected losses (e.g. measured averages). */
    alreadyIncluded: boolean;
  };
  /** Hands-on minutes. Unattended printer time is NOT labour. */
  labor: {
    perPlate: { setup: number; removal: number };
    perItem: { postProcessing: number; assembly: number; inspection: number; packaging: number };
    perBatch: { modelPrep: number; communication: number };
  };
  design: {
    minutes: number;
    treatment: DesignTreatment;
    /** Units the design cost is spread over when amortised. */
    amortizationUnits: number;
  };
  direct: {
    packagingPerItem: Poisha;
    hardwarePerItem: Poisha;
    otherPerBatch: Poisha;
  };
  premium: {
    personalized: boolean;
    rush: boolean;
    /** Additional service fee for this order (e.g. on-site consultation). */
    extraServiceFee: Poisha;
  };
  /** Optional override of the shop labour rate for this job. */
  laborRateOverride: Poisha | null;
}

/* ------------------------------------------------------------------------------------------------
 * Results
 * ---------------------------------------------------------------------------------------------- */

export type CostKey =
  | "material"
  | "depreciation"
  | "electricity"
  | "maintenance"
  | "labor"
  | "design"
  | "failure"
  | "packaging"
  | "overhead";

export interface CostLine {
  key: CostKey;
  label: string;
  /** Batch amount in whole poisha. */
  amount: Poisha;
  /** Human-readable formula with the actual numbers substituted. */
  formula: string;
}

export interface CostRates {
  materialPerGram: number;
  depreciationPerHour: number;
  electricityPerHour: number;
  maintenancePerHour: number;
  consumablesPerHour: number;
  printerOverheadPerHour: number;
  overheadRate: number;
  overheadBasis: OverheadMethod;
  laborRatePerHour: number;
  designRatePerHour: number;
  failureProbability: number;
  /** Expected failed attempts per successful plate = p / (1 − p). */
  expectedFailedAttempts: number;
}

export interface CostQuantities {
  plates: number;
  producedItems: number;
  sellableItems: number;
  gramsPerPlate: number;
  /** Grams for successful plates only. */
  successfulGrams: number;
  /** Expected grams including failed attempts. */
  expectedTotalGrams: number;
  machineHours: number;
  expectedMachineHours: number;
  directLaborHours: number;
  designHours: number;
}

export interface CostResult {
  lines: CostLine[];
  rates: CostRates;
  quantities: CostQuantities;
  totalBatchCost: Poisha;
  /** Exact (unrounded) unit cost used for pricing. */
  unitCostExact: number;
  /** Unit cost rounded to whole poisha for display and storage. */
  unitCost: Poisha;
  /** Design cost billed separately (treatment = separate); not part of manufacturing cost. */
  separateDesignFee: Poisha;
  warnings: string[];
  notes: string[];
}
