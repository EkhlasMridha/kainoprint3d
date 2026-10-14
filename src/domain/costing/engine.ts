import { formatBDT, formatPercent, formatRate, roundHalfUp, roundPoisha } from "../money";
import {
  CostingError,
  combinedFailureRate,
  consumablesPerHour,
  depreciationPerHour,
  electricityPerHour,
  expectedFailedAttempts,
  maintenancePerHour,
  materialCostPerGram,
  overheadRate,
  printerOverheadPerHour,
} from "./rates";
import type {
  CostLine,
  CostResult,
  CostingSettings,
  JobInput,
  MaterialProfile,
  PrinterProfile,
} from "./types";

export interface CostContext {
  printer: PrinterProfile;
  material: MaterialProfile;
  settings: CostingSettings;
}

const n = (v: number, d = 2) => roundHalfUp(v, d).toLocaleString("en-IN", { maximumFractionDigits: d });
const money = (poisha: number) => formatBDT(poisha, { decimals: "auto" });

/** Validate a job for structural problems the engine cannot work around. */
export function validateJob(job: JobInput): string[] {
  const issues: string[] = [];
  const nonNeg = (v: number, label: string) => {
    if (!Number.isFinite(v)) issues.push(`${label} is missing or not a number.`);
    else if (v < 0) issues.push(`${label} cannot be negative.`);
  };
  if (!Number.isInteger(job.quantity) || job.quantity < 1) issues.push("Batch quantity must be a whole number of at least 1.");
  if (!Number.isInteger(job.itemsPerPlate) || job.itemsPerPlate < 1) issues.push("Items per print job must be a whole number of at least 1.");
  if (!Number.isFinite(job.printHoursPerPlate)) issues.push("Print time is missing or not a number.");
  else if (job.printHoursPerPlate <= 0) issues.push("Print time must be greater than zero.");

  const m = job.material;
  if (m.mode === "slicer_total") {
    nonNeg(m.slicerTotalGrams, "Slicer total filament");
    if (m.slicerTotalGrams <= 0) issues.push("Slicer total filament must be greater than zero.");
  } else {
    nonNeg(m.modelGrams, "Model filament");
    nonNeg(m.supportGrams, "Support filament");
    nonNeg(m.purgeGrams, "Purge / transition waste");
    if (m.modelGrams + m.supportGrams + m.purgeGrams <= 0) issues.push("Enter the filament used per print job.");
  }

  const f = job.failure;
  if (f.rateOverride !== null) {
    if (!Number.isFinite(f.rateOverride) || f.rateOverride < 0) issues.push("Failure rate cannot be negative.");
    else if (f.rateOverride >= 1) issues.push("Failure rate must be below 100% — at 100% no item is ever produced.");
  }
  if (!(f.consumptionFraction > 0 && f.consumptionFraction <= 1)) {
    issues.push("Failed-attempt consumption must be between 1% and 100% of a print job.");
  }

  const l = job.labor;
  nonNeg(l.perPlate.setup, "Setup time");
  nonNeg(l.perPlate.removal, "Plate removal time");
  nonNeg(l.perItem.postProcessing, "Post-processing time");
  nonNeg(l.perItem.assembly, "Assembly time");
  nonNeg(l.perItem.inspection, "Inspection time");
  nonNeg(l.perItem.packaging, "Packaging time");
  nonNeg(l.perBatch.modelPrep, "Model preparation time");
  nonNeg(l.perBatch.communication, "Customer communication time");
  nonNeg(job.design.minutes, "Design time");
  if (job.design.treatment === "amortize" && !(job.design.amortizationUnits >= 1)) {
    issues.push("Amortisation units must be at least 1.");
  }
  nonNeg(job.direct.packagingPerItem, "Packaging cost");
  nonNeg(job.direct.hardwarePerItem, "Hardware cost");
  nonNeg(job.direct.otherPerBatch, "Other direct costs");
  nonNeg(job.premium.extraServiceFee, "Extra service fee");
  if (job.laborRateOverride !== null) nonNeg(job.laborRateOverride, "Labour rate override");
  return issues;
}

/**
 * Calculate the full manufacturing cost of a batch.
 *
 * Model (per successful build plate, then × plates):
 *   material      = grams/plate × (1 + waste allowance) × cost/gram
 *   machine       = hours/plate × (depreciation + electricity + maintenance + consumables) per hour
 *   overhead      = basis × overhead rate  (+ printer-specific overhead per machine hour)
 *   failure       = e × [f × (material + machine + machine-hour overhead) + failed-attempt labour]
 *                   where e = p / (1 − p) expected failed attempts per successful plate
 *                   and f = average fraction of a plate consumed by a failure.
 * Labour is hands-on time only; unattended printing is covered by machine costs.
 */
export function calculateCost(job: JobInput, ctx: CostContext): CostResult {
  const issues = validateJob(job);
  if (issues.length) throw new CostingError(issues);
  const { printer, material, settings } = ctx;
  const warnings: string[] = [];
  const notes: string[] = [];

  /* ---- Rates ---- */
  const matPerGram = materialCostPerGram(material);
  const depPerHour = depreciationPerHour(printer);
  const elecPerHour = electricityPerHour(printer);
  const maintPerHour = maintenancePerHour(printer);
  const consPerHour = consumablesPerHour(printer);
  const prnOhPerHour = printerOverheadPerHour(printer);
  const ohRate = overheadRate(settings.overhead);
  const ohMethod = settings.overhead.method;
  const laborRate = job.laborRateOverride ?? settings.laborRatePerHour;
  const designRate = settings.designRatePerHour;

  const p = job.failure.alreadyIncluded
    ? 0
    : (job.failure.rateOverride ?? combinedFailureRate(printer.failureRate, material.failureRate));
  const e = expectedFailedAttempts(p);
  const fFrac = job.failure.consumptionFraction;

  /* ---- Quantities ---- */
  const Q = job.quantity;
  const plates = Math.ceil(Q / job.itemsPerPlate);
  const producedItems = plates * job.itemsPerPlate;
  const hours = job.printHoursPerPlate;
  const machineHours = plates * hours;

  const m = job.material;
  let gramsPerPlate: number;
  if (m.mode === "slicer_total") {
    gramsPerPlate = m.slicerTotalGrams;
    if (m.modelGrams + m.supportGrams + m.purgeGrams > 0) {
      notes.push("Slicer total is used; the model/support/purge breakdown is ignored to avoid counting material twice.");
    }
  } else {
    gramsPerPlate = m.modelGrams + m.supportGrams + m.purgeGrams;
  }
  const wastePct = m.applyWasteAllowance ? Math.max(0, material.wasteAllowancePct) : 0;
  const gramsPerPlateWithWaste = gramsPerPlate * (1 + wastePct);
  const successfulGrams = plates * gramsPerPlateWithWaste;

  const setupMin = job.labor.perPlate.setup + job.labor.perPlate.removal;
  const perItemMin =
    job.labor.perItem.postProcessing + job.labor.perItem.assembly + job.labor.perItem.inspection + job.labor.perItem.packaging;
  const perBatchMin = job.labor.perBatch.modelPrep + job.labor.perBatch.communication;
  const directLaborHours = (plates * setupMin + Q * perItemMin + perBatchMin) / 60;
  const designHours = job.design.minutes / 60;

  /* ---- Cost lines (each rounded to whole poisha once) ---- */
  const lines: CostLine[] = [];
  const push = (key: CostLine["key"], label: string, amount: number, formula: string) =>
    lines.push({ key, label, amount: roundPoisha(amount), formula });

  const materialCost = successfulGrams * matPerGram;
  push(
    "material",
    "Material",
    materialCost,
    `${plates} plate(s) × ${n(gramsPerPlate)} g${wastePct ? ` × (1 + ${formatPercent(wastePct)} waste)` : ""} × ${formatRate(matPerGram, "g", 4)}`,
  );

  push("depreciation", "Printer depreciation", machineHours * depPerHour, `${n(machineHours)} h × ${formatRate(depPerHour, "h")}`);
  push(
    "electricity",
    "Electricity",
    machineHours * elecPerHour,
    `${printer.averagePowerWatts} W ÷ 1000 × ${n(machineHours)} h × ${formatRate(printer.electricityRatePerKwh, "kWh")}`,
  );
  push(
    "maintenance",
    "Maintenance & consumables",
    machineHours * (maintPerHour + consPerHour),
    `${n(machineHours)} h × (${formatRate(maintPerHour, "h")} maintenance + ${formatRate(consPerHour, "h")} consumables)`,
  );
  push(
    "labor",
    "Direct labour",
    directLaborHours * laborRate,
    `${n(directLaborHours, 3)} h hands-on × ${formatRate(laborRate, "h")} (setup/removal ${plates}×${n(setupMin)} min, per item ${Q}×${n(perItemMin)} min, batch ${n(perBatchMin)} min)`,
  );

  // Design / modelling
  const designCost = designHours * designRate;
  let designCharged = 0;
  let separateDesignFee = 0;
  let designFormula = "No design time recorded";
  if (designCost > 0) {
    if (job.design.treatment === "include") {
      designCharged = designCost;
      designFormula = `${n(designHours, 2)} h × ${formatRate(designRate, "h")} (included in this batch)`;
    } else if (job.design.treatment === "amortize") {
      const units = Math.min(Q, job.design.amortizationUnits);
      designCharged = (designCost / job.design.amortizationUnits) * units;
      designFormula = `${money(roundPoisha(designCost))} ÷ ${job.design.amortizationUnits} units × ${units} unit(s) in this batch`;
    } else {
      separateDesignFee = roundPoisha(designCost);
      designFormula = `${money(separateDesignFee)} billed separately — excluded from manufacturing cost`;
    }
  }
  push("design", "Design & modelling", designCharged, designFormula);

  // Failure allowance — only resources consumed per print attempt are exposed to failure.
  const machinePerHourAll = depPerHour + elecPerHour + maintPerHour + consPerHour + prnOhPerHour;
  const ohPerMachineHour = ohMethod === "machine_hour" ? ohRate : 0;
  const failedAttempts = plates * e;
  const failMaterial = failedAttempts * fFrac * gramsPerPlateWithWaste * matPerGram;
  const failMachine = failedAttempts * fFrac * hours * (machinePerHourAll + ohPerMachineHour);
  const failLaborHours = job.failure.includeLabor ? (failedAttempts * setupMin) / 60 : 0;
  const failLabor = failLaborHours * laborRate + (ohMethod === "labor_hour" ? failLaborHours * ohRate : 0);
  const failureCost = failMaterial + failMachine + failLabor;
  push(
    "failure",
    "Failure & reprint allowance",
    failureCost,
    job.failure.alreadyIncluded
      ? "Not applied — inputs already include expected losses"
      : p === 0
        ? "Failure rate is 0%"
        : `p = ${formatPercent(p)} → ${n(e, 4)} failed attempts per good plate × ${plates} plate(s) × ${formatPercent(fFrac, 0)} consumed: material ${money(roundPoisha(failMaterial))} + machine ${money(roundPoisha(failMachine))}${job.failure.includeLabor ? ` + labour ${money(roundPoisha(failLabor))}` : ""}`,
  );

  push(
    "packaging",
    "Packaging, hardware & other direct",
    Q * (job.direct.packagingPerItem + job.direct.hardwarePerItem) + job.direct.otherPerBatch,
    `${Q} × (${money(job.direct.packagingPerItem)} packaging + ${money(job.direct.hardwarePerItem)} hardware) + ${money(job.direct.otherPerBatch)} other`,
  );

  // Overhead allocation
  let ohBase: number;
  let ohFormula: string;
  if (ohMethod === "machine_hour") {
    ohBase = machineHours * ohRate;
    ohFormula = `${n(machineHours)} machine h × ${formatRate(ohRate, "h")}`;
  } else if (ohMethod === "labor_hour") {
    ohBase = directLaborHours * ohRate;
    ohFormula = `${n(directLaborHours, 3)} labour h × ${formatRate(ohRate, "labour h")}`;
  } else {
    ohBase = Q * ohRate;
    ohFormula = `${Q} unit(s) × ${formatRate(ohRate, "unit")}`;
  }
  const prnOh = machineHours * prnOhPerHour;
  if (prnOh > 0) ohFormula += ` + printer-specific ${n(machineHours)} h × ${formatRate(prnOhPerHour, "h")}`;
  push("overhead", "Allocated overhead", ohBase + prnOh, ohFormula);

  /* ---- Totals ---- */
  const totalBatchCost = lines.reduce((s, l) => s + l.amount, 0);
  const unitCostExact = totalBatchCost / Q;

  /* ---- Double-counting guards and other warnings ---- */
  const included = settings.overhead.items.filter((i) => i.included && i.monthlyAmount > 0);
  if (maintPerHour > 0 && included.some((i) => i.category === "equipment_maintenance")) {
    warnings.push(
      "Possible double counting: the printer has a maintenance rate AND monthly overhead includes equipment maintenance. Exclude one of them.",
    );
  }
  if (job.direct.packagingPerItem > 0 && included.some((i) => i.category === "packaging_supplies")) {
    warnings.push(
      "Possible double counting: per-item packaging is entered AND monthly overhead includes packaging supplies. Exclude one of them.",
    );
  }
  if (producedItems > Q) {
    notes.push(
      `${plates} plate(s) × ${job.itemsPerPlate} = ${producedItems} items printed for ${Q} sellable; the ${producedItems - Q} spare item(s) are absorbed into the batch cost.`,
    );
  }
  if (p >= 0.5) warnings.push(`Failure rate of ${formatPercent(p)} is very high — check the printer or material settings.`);
  if (job.failure.alreadyIncluded) notes.push("Failure allowance skipped because the inputs already include expected losses.");
  if (job.design.treatment === "separate" && separateDesignFee > 0) {
    notes.push(`Design time (${money(separateDesignFee)}) should be invoiced as a separate design fee.`);
  }

  return {
    lines,
    rates: {
      materialPerGram: matPerGram,
      depreciationPerHour: depPerHour,
      electricityPerHour: elecPerHour,
      maintenancePerHour: maintPerHour,
      consumablesPerHour: consPerHour,
      printerOverheadPerHour: prnOhPerHour,
      overheadRate: ohRate,
      overheadBasis: ohMethod,
      laborRatePerHour: laborRate,
      designRatePerHour: designRate,
      failureProbability: p,
      expectedFailedAttempts: e,
    },
    quantities: {
      plates,
      producedItems,
      sellableItems: Q,
      gramsPerPlate,
      successfulGrams,
      expectedTotalGrams: successfulGrams + failedAttempts * fFrac * gramsPerPlateWithWaste,
      machineHours,
      expectedMachineHours: machineHours + failedAttempts * fFrac * hours,
      directLaborHours,
      designHours,
    },
    totalBatchCost,
    unitCostExact,
    unitCost: roundPoisha(unitCostExact),
    separateDesignFee,
    warnings,
    notes,
  };
}
