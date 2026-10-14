import type { CostingSettings, JobInput } from "./types";

/**
 * Starting assumptions for a small Bangladeshi 3D printing workshop.
 * Every value is editable in Admin → Settings → Costing; nothing here is hard-wired into formulas.
 */
export const DEFAULT_COSTING_SETTINGS: CostingSettings = {
  laborRatePerHour: 15000, // ৳150/h hands-on labour
  designRatePerHour: 40000, // ৳400/h 3D modelling
  overhead: {
    method: "machine_hour",
    items: [
      { id: "rent", label: "Workspace (allocated rent)", category: "rent", monthlyAmount: 300000, included: true },
      { id: "internet", label: "Internet & software subscriptions", category: "internet_software", monthlyAmount: 150000, included: true },
      { id: "marketing", label: "Marketing (Facebook ads, samples)", category: "marketing", monthlyAmount: 200000, included: true },
      { id: "general", label: "General business expenses", category: "general", monthlyAmount: 100000, included: true },
      // Excluded by default because printers carry a per-hour maintenance rate and jobs carry
      // per-item packaging; including them here as well would count the same expense twice.
      { id: "equipment", label: "Equipment maintenance", category: "equipment_maintenance", monthlyAmount: 50000, included: false },
      { id: "packaging", label: "Packaging supplies", category: "packaging_supplies", monthlyAmount: 80000, included: false },
    ],
    monthlyMachineHours: 400,
    monthlyLaborHours: 80,
    monthlyProductionUnits: 300,
  },
  defaultFailureConsumption: 0.5,
  pricing: {
    targetMargin: 0.35,
    premiumMargin: 0.45,
    lowMarginThreshold: 0.2,
    percentFees: [{ label: "Mobile payment (bKash/Nagad)", rate: 0.015 }],
    fixedFeePerOrder: 0,
    tax: { mode: "none", rate: 0.15, label: "VAT" },
    roundingStep: 5,
    premium: {
      personalizationMinutesPerItem: 5,
      smallOrderThreshold: 3,
      smallOrderFee: 5000,
      rushFeePerMachineHour: 4000,
    },
  },
};

export function defaultJobInput(settings: CostingSettings = DEFAULT_COSTING_SETTINGS): JobInput {
  return {
    name: "",
    quantity: 1,
    itemsPerPlate: 1,
    printHoursPerPlate: 1,
    material: {
      mode: "slicer_total",
      modelGrams: 0,
      supportGrams: 0,
      purgeGrams: 0,
      slicerTotalGrams: 10,
      applyWasteAllowance: true,
    },
    failure: {
      rateOverride: null,
      consumptionFraction: settings.defaultFailureConsumption,
      includeLabor: true,
      alreadyIncluded: false,
    },
    labor: {
      perPlate: { setup: 5, removal: 2 },
      perItem: { postProcessing: 2, assembly: 0, inspection: 1, packaging: 2 },
      perBatch: { modelPrep: 5, communication: 5 },
    },
    design: { minutes: 0, treatment: "include", amortizationUnits: 50 },
    direct: { packagingPerItem: 1000, hardwarePerItem: 0, otherPerBatch: 0 },
    premium: { personalized: false, rush: false, extraServiceFee: 0 },
    laborRateOverride: null,
  };
}
