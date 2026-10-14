import type { CostingSettings, JobInput, MaterialProfile, PrinterProfile } from "@/domain/costing/types";

/**
 * Reference scenario with round numbers that can be verified by hand (see docs/PRICING.md):
 *   depreciation = (৳100,000 − ৳20,000) / 4,000 h = ৳20/h
 *   electricity  = 120 W / 1000 × ৳10/kWh       = ৳1.20/h
 *   maintenance  = ৳5/h; consumables = ৳1,000 / 500 h + ৳1/h = ৳3/h
 *   material     = (৳2,000 + ৳90) / 950 g          = ৳2.20/g
 *   overhead     = ৳4,000 / 200 machine h           = ৳20/h
 */
export const refPrinter: PrinterProfile = {
  name: "Reference printer",
  purchasePrice: 100_000_00,
  residualValue: 20_000_00,
  lifetimeHours: 4000,
  monthlyProductiveHours: 200,
  averagePowerWatts: 120,
  electricityRatePerKwh: 10_00,
  maintenanceMethod: "per_hour",
  maintenancePerHour: 5_00,
  maintenanceMonthly: 0,
  nozzleCost: 1_000_00,
  nozzleLifeHours: 500,
  otherConsumablesPerHour: 1_00,
  failureRate: 0.1,
  additionalOverheadMonthly: 0,
};

export const refMaterial: MaterialProfile = {
  name: "PLA reference",
  purchasePrice: 2_000_00,
  spoolWeightGrams: 1000,
  netUsableGrams: 950,
  handlingCostPerSpool: 90_00,
  failureRate: 0,
  wasteAllowancePct: 0,
};

export const refSettings: CostingSettings = {
  laborRatePerHour: 120_00,
  designRatePerHour: 300_00,
  overhead: {
    method: "machine_hour",
    items: [
      { id: "rent", label: "Rent", category: "rent", monthlyAmount: 3_000_00, included: true },
      { id: "net", label: "Internet", category: "internet_software", monthlyAmount: 1_000_00, included: true },
      { id: "maint", label: "Equipment maintenance", category: "equipment_maintenance", monthlyAmount: 500_00, included: false },
    ],
    monthlyMachineHours: 200,
    monthlyLaborHours: 50,
    monthlyProductionUnits: 400,
  },
  defaultFailureConsumption: 0.5,
  pricing: {
    targetMargin: 0.4,
    premiumMargin: 0.5,
    lowMarginThreshold: 0.2,
    percentFees: [],
    fixedFeePerOrder: 0,
    tax: { mode: "none", rate: 0.15, label: "VAT" },
    roundingStep: 5,
    premium: { personalizationMinutesPerItem: 6, smallOrderThreshold: 3, smallOrderFee: 60_00, rushFeePerMachineHour: 40_00 },
  },
};

export function refJob(overrides: Partial<JobInput> = {}): JobInput {
  return {
    name: "Reference batch",
    quantity: 10,
    itemsPerPlate: 5,
    printHoursPerPlate: 3,
    material: { mode: "slicer_total", modelGrams: 0, supportGrams: 0, purgeGrams: 0, slicerTotalGrams: 50, applyWasteAllowance: false },
    failure: { rateOverride: null, consumptionFraction: 0.5, includeLabor: true, alreadyIncluded: false },
    labor: {
      perPlate: { setup: 6, removal: 4 },
      perItem: { postProcessing: 3, assembly: 0, inspection: 1, packaging: 2 },
      perBatch: { modelPrep: 12, communication: 8 },
    },
    design: { minutes: 60, treatment: "amortize", amortizationUnits: 100 },
    direct: { packagingPerItem: 10_00, hardwarePerItem: 5_00, otherPerBatch: 20_00 },
    premium: { personalized: false, rush: false, extraServiceFee: 0 },
    laborRateOverride: null,
    ...overrides,
  };
}

export const refCtx = { printer: refPrinter, material: refMaterial, settings: refSettings };
