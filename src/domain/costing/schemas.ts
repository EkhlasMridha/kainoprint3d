import { z } from "zod";
import { ROUNDING_STEPS, type RoundingStep } from "../money";

/** Shared validation schemas (client and server). Monetary fields are integer poisha. */

export const roundingStepSchema = z
  .number()
  .refine((v): v is RoundingStep => (ROUNDING_STEPS as readonly number[]).includes(v), "Choose a supported rounding step")
  .transform((v) => v as RoundingStep);

const money = (label: string) =>
  z.number({ invalid_type_error: `${label} must be a number`, required_error: `${label} is required` })
    .int(`${label} must be in whole poisha`)
    .min(0, `${label} cannot be negative`)
    .max(1_000_000_000_00, `${label} is unrealistically large`);

const nonNeg = (label: string, max = 1_000_000) =>
  z.number({ invalid_type_error: `${label} must be a number`, required_error: `${label} is required` })
    .finite(`${label} must be a number`)
    .min(0, `${label} cannot be negative`)
    .max(max, `${label} is too large`);

const positive = (label: string, max = 1_000_000) =>
  nonNeg(label, max).refine((v) => v > 0, `${label} must be greater than zero`);

const fraction = (label: string, max = 0.99) =>
  z.number({ invalid_type_error: `${label} must be a number` })
    .min(0, `${label} cannot be negative`)
    .max(max, `${label} must be below ${Math.round(max * 100)}%`);

export const printerProfileSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(80),
    purchasePrice: money("Purchase price"),
    residualValue: money("Residual value"),
    lifetimeHours: positive("Lifetime hours", 200_000),
    monthlyProductiveHours: positive("Monthly productive hours", 744),
    averagePowerWatts: nonNeg("Average power", 5_000),
    electricityRatePerKwh: money("Electricity price"),
    maintenanceMethod: z.enum(["per_hour", "monthly"]),
    maintenancePerHour: money("Maintenance per hour"),
    maintenanceMonthly: money("Monthly maintenance"),
    nozzleCost: money("Nozzle cost"),
    nozzleLifeHours: nonNeg("Nozzle life", 100_000),
    otherConsumablesPerHour: money("Other consumables"),
    failureRate: fraction("Failure rate", 0.95),
    additionalOverheadMonthly: money("Additional overhead"),
  })
  .superRefine((p, ctx) => {
    if (p.residualValue > p.purchasePrice) {
      ctx.addIssue({ code: "custom", path: ["residualValue"], message: "Residual value cannot exceed purchase price" });
    }
    if (p.nozzleCost > 0 && !(p.nozzleLifeHours > 0)) {
      ctx.addIssue({ code: "custom", path: ["nozzleLifeHours"], message: "Enter nozzle life when a nozzle cost is set" });
    }
  });

export const materialProfileSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(80),
    purchasePrice: money("Spool price"),
    spoolWeightGrams: positive("Spool weight", 50_000),
    netUsableGrams: nonNeg("Net usable weight", 50_000).nullable(),
    handlingCostPerSpool: money("Handling cost"),
    failureRate: fraction("Material failure rate", 0.9),
    wasteAllowancePct: fraction("Waste allowance", 0.5),
  })
  .superRefine((m, ctx) => {
    if (m.netUsableGrams !== null && m.netUsableGrams > m.spoolWeightGrams) {
      ctx.addIssue({ code: "custom", path: ["netUsableGrams"], message: "Usable weight cannot exceed spool weight" });
    }
    if (m.netUsableGrams !== null && m.netUsableGrams === 0) {
      ctx.addIssue({ code: "custom", path: ["netUsableGrams"], message: "Leave empty or enter a value above zero" });
    }
  });

const overheadCategory = z.enum([
  "rent",
  "internet_software",
  "equipment_maintenance",
  "packaging_supplies",
  "marketing",
  "general",
  "other",
]);

export const costingSettingsSchema = z
  .object({
    laborRatePerHour: money("Labour rate"),
    designRatePerHour: money("Design rate"),
    overhead: z.object({
      method: z.enum(["machine_hour", "labor_hour", "production_unit"]),
      items: z
        .array(
          z.object({
            id: z.string().min(1).max(40),
            label: z.string().trim().min(1, "Label is required").max(80),
            category: overheadCategory,
            monthlyAmount: money("Monthly amount"),
            included: z.boolean(),
          }),
        )
        .max(50),
      monthlyMachineHours: nonNeg("Monthly machine hours", 100_000),
      monthlyLaborHours: nonNeg("Monthly labour hours", 100_000),
      monthlyProductionUnits: nonNeg("Monthly production units", 10_000_000),
    }),
    defaultFailureConsumption: z.number().gt(0, "Must be above 0%").max(1, "Cannot exceed 100%"),
    pricing: z.object({
      targetMargin: fraction("Target margin", 0.9),
      premiumMargin: fraction("Premium margin", 0.9),
      lowMarginThreshold: fraction("Low-margin threshold", 0.9),
      percentFees: z
        .array(z.object({ label: z.string().trim().min(1).max(60), rate: fraction("Fee rate", 0.5) }))
        .max(10),
      fixedFeePerOrder: money("Fixed fee"),
      tax: z.object({
        mode: z.enum(["none", "exclusive", "inclusive"]),
        rate: fraction("Tax rate", 0.5),
        label: z.string().trim().min(1).max(20),
      }),
      roundingStep: roundingStepSchema,
      premium: z.object({
        personalizationMinutesPerItem: nonNeg("Personalisation minutes", 600),
        smallOrderThreshold: z.number().int().min(0).max(10_000),
        smallOrderFee: money("Small-order fee"),
        rushFeePerMachineHour: money("Rush fee"),
      }),
    }),
  })
  .superRefine((s, ctx) => {
    const fees = s.pricing.percentFees.reduce((a, f) => a + f.rate, 0);
    const t = s.pricing.tax.mode === "none" ? 0 : s.pricing.tax.rate;
    if (s.pricing.premiumMargin + fees * (1 + t) >= 1 || s.pricing.targetMargin + fees * (1 + t) >= 1) {
      ctx.addIssue({ code: "custom", path: ["pricing", "targetMargin"], message: "Margin plus fees must stay below 100%" });
    }
    if (s.pricing.premiumMargin < s.pricing.targetMargin) {
      ctx.addIssue({ code: "custom", path: ["pricing", "premiumMargin"], message: "Premium margin should be at least the standard margin" });
    }
  });

const minutes = (label: string) => nonNeg(label, 100_000);

export const jobInputSchema = z
  .object({
    name: z.string().trim().min(1, "Product or job name is required").max(120),
    quantity: z.number().int("Quantity must be a whole number").min(1, "Quantity must be at least 1").max(100_000),
    itemsPerPlate: z.number().int("Must be a whole number").min(1, "At least 1 item per print job").max(10_000),
    printHoursPerPlate: positive("Print time", 2_000),
    material: z.object({
      mode: z.enum(["components", "slicer_total"]),
      modelGrams: nonNeg("Model filament", 100_000),
      supportGrams: nonNeg("Support filament", 100_000),
      purgeGrams: nonNeg("Purge waste", 100_000),
      slicerTotalGrams: nonNeg("Slicer total", 100_000),
      applyWasteAllowance: z.boolean(),
    }),
    failure: z.object({
      rateOverride: fraction("Failure rate", 0.95).nullable(),
      consumptionFraction: z.number().gt(0, "Must be above 0%").max(1, "Cannot exceed 100%"),
      includeLabor: z.boolean(),
      alreadyIncluded: z.boolean(),
    }),
    labor: z.object({
      perPlate: z.object({ setup: minutes("Setup time"), removal: minutes("Removal time") }),
      perItem: z.object({
        postProcessing: minutes("Post-processing"),
        assembly: minutes("Assembly"),
        inspection: minutes("Inspection"),
        packaging: minutes("Packaging"),
      }),
      perBatch: z.object({ modelPrep: minutes("Model preparation"), communication: minutes("Communication") }),
    }),
    design: z.object({
      minutes: minutes("Design time"),
      treatment: z.enum(["include", "amortize", "separate"]),
      amortizationUnits: z.number().int().min(1, "At least 1 unit").max(1_000_000),
    }),
    direct: z.object({
      packagingPerItem: money("Packaging"),
      hardwarePerItem: money("Hardware"),
      otherPerBatch: money("Other direct costs"),
    }),
    premium: z.object({ personalized: z.boolean(), rush: z.boolean(), extraServiceFee: money("Extra service fee") }),
    laborRateOverride: money("Labour rate").nullable(),
  })
  .superRefine((j, ctx) => {
    const m = j.material;
    if (m.mode === "slicer_total" && !(m.slicerTotalGrams > 0)) {
      ctx.addIssue({ code: "custom", path: ["material", "slicerTotalGrams"], message: "Enter the slicer's total filament" });
    }
    if (m.mode === "components" && !(m.modelGrams + m.supportGrams + m.purgeGrams > 0)) {
      ctx.addIssue({ code: "custom", path: ["material", "modelGrams"], message: "Enter the model filament weight" });
    }
  });

/** Turn Zod issues into a flat { "path.to.field": message } map for inline form errors. */
export function issuesToFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
