"use client";

import { useState } from "react";
import { savePrinter } from "@/server/actions/equipment";
import { ActionForm, CheckF, FormSection, NumF, SelectF, TextF, TextareaF } from "./form";

export interface PrinterFormValues {
  id?: string;
  name: string;
  model: string;
  purchasePrice: number; // taka
  residualValue: number;
  lifetimeHours: number;
  monthlyProductiveHours: number;
  averagePowerWatts: number;
  electricityRatePerKwh: number;
  maintenanceMethod: "per_hour" | "monthly";
  maintenancePerHour: number;
  maintenanceMonthly: number;
  nozzleCost: number;
  nozzleLifeHours: number;
  otherConsumablesPerHour: number;
  failureRate: number; // percent
  additionalOverheadMonthly: number;
  active: boolean;
  notes: string;
}

export function PrinterForm({ values }: { values: PrinterFormValues }) {
  const [method, setMethod] = useState(values.maintenanceMethod);
  return (
    <ActionForm action={savePrinter} submitLabel={values.id ? "Save printer" : "Add printer"}>
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <FormSection title="Printer">
        <TextF name="name" label="Name" defaultValue={values.name} required maxLength={80} />
        <TextF name="model" label="Model" defaultValue={values.model} maxLength={80} />
        <CheckF name="active" label="Active" hint="Inactive printers are hidden from the calculator." defaultChecked={values.active} />
      </FormSection>

      <FormSection title="Depreciation" description="Depreciation per hour = (purchase price − residual value) ÷ lifetime productive hours.">
        <NumF name="purchasePrice" label="Purchase price" unit="৳" min={0} defaultValue={values.purchasePrice} required tip="Include import duty, shipping and accessories you bought with the printer (AMS, spare plate)." />
        <NumF name="residualValue" label="Residual value" unit="৳" min={0} defaultValue={values.residualValue} tip="What you expect to sell it for at the end of its useful life. Use 0 if unsure." />
        <NumF name="lifetimeHours" label="Useful lifetime" unit="h" min={1} defaultValue={values.lifetimeHours} required tip="Total productive printing hours you expect before replacing the printer. 3,000–8,000 h is typical for consumer printers." />
        <NumF name="monthlyProductiveHours" label="Productive hours per month" unit="h" min={1} max={744} defaultValue={values.monthlyProductiveHours} required tip="Realistic printing hours per month, not 24×30. Used to spread monthly maintenance and printer overhead." />
      </FormSection>

      <FormSection title="Electricity" description="Electricity cost = average watts ÷ 1000 × hours × tariff.">
        <NumF name="averagePowerWatts" label="Average power while printing" unit="W" min={0} defaultValue={values.averagePowerWatts} required tip="Measure with a plug-in power meter over a typical print. The power supply rating (e.g. 350 W) is a maximum, not the average." />
        <NumF name="electricityRatePerKwh" label="Electricity price" unit="৳/kWh" min={0} step="0.01" defaultValue={values.electricityRatePerKwh} required />
      </FormSection>

      <div
        onChange={(e) => {
          const t = e.target as HTMLSelectElement;
          if (t.name === "maintenanceMethod") setMethod(t.value === "monthly" ? "monthly" : "per_hour");
        }}
      >
      <FormSection title="Maintenance & consumables">
        <SelectF
          name="maintenanceMethod"
          label="Maintenance method"
          defaultValue={values.maintenanceMethod}
          options={[
            { value: "per_hour", label: "Cost per operating hour" },
            { value: "monthly", label: "Monthly budget (spread over productive hours)" },
          ]}
          tip="Choose whichever you can estimate more reliably. Don't also put equipment maintenance in monthly overhead."
        />
        <NumF name="maintenancePerHour" label="Maintenance per hour" unit="৳/h" min={0} step="0.01" defaultValue={values.maintenancePerHour} className={method === "per_hour" ? "" : "hidden"} />
        <NumF name="maintenanceMonthly" label="Maintenance per month" unit="৳" min={0} defaultValue={values.maintenanceMonthly} className={method === "monthly" ? "" : "hidden"} />
        <NumF name="nozzleCost" label="Nozzle cost" unit="৳" min={0} defaultValue={values.nozzleCost} />
        <NumF name="nozzleLifeHours" label="Nozzle life" unit="h" min={0} defaultValue={values.nozzleLifeHours} />
        <NumF name="otherConsumablesPerHour" label="Other consumables per hour" unit="৳/h" min={0} step="0.01" defaultValue={values.otherConsumablesPerHour} tip="Build plates, PTFE tubes, belts, lubricant, glue stick…" />
      </FormSection>
      </div>

      <FormSection title="Risk & overhead">
        <NumF name="failureRate" label="Typical failure rate" unit="%" min={0} max={95} step="0.1" defaultValue={values.failureRate} tip="Share of print attempts that fail on this printer. Used as the default in the calculator." />
        <NumF name="additionalOverheadMonthly" label="Printer-specific overhead per month" unit="৳" min={0} defaultValue={values.additionalOverheadMonthly} tip="Costs that exist only because of this printer (e.g. its enclosure or UPS). Shared shop costs belong in Costing settings." />
      </FormSection>

      <FormSection title="Notes" columns={1}>
        <TextareaF name="notes" label="Notes" defaultValue={values.notes} maxLength={1000} />
      </FormSection>
    </ActionForm>
  );
}
