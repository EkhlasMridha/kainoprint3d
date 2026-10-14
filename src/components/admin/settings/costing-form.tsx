"use client";

import { useState } from "react";
import type { CostingSettings } from "@/domain/costing/types";
import { saveCostingSettings } from "@/server/actions/settings";
import { ActionForm, FormSection, NumF, SelectF, TextF, usePrefixError } from "../form";
import { RowsEditor } from "../rows-editor";

const pct = (f: number) => +(f * 100).toFixed(4);
const tk = (p: number) => p / 100;

const METHOD_HELP: Record<string, string> = {
  machine_hour:
    "Best when printers are your main resource. Long prints carry more overhead; quick hand-finished items carry less. Make sure 'monthly machine hours' is your realistic total across all printers.",
  labor_hour:
    "Best when hands-on work drives your workload (lots of finishing, assembly, customer contact). Items needing more labour carry more overhead; long unattended prints carry little.",
  production_unit:
    "Simplest: every sellable item carries the same overhead regardless of size or time. Fair only when your products are similar; it under-charges big items and over-charges small ones.",
};

function Rows(props: Parameters<typeof RowsEditor>[0]) {
  return <RowsEditor {...props} error={usePrefixError(props.name)} />;
}

export function CostingSettingsForm({ s, activePrinterHours }: { s: CostingSettings; activePrinterHours: number }) {
  const [method, setMethod] = useState(s.overhead.method);
  return (
    <ActionForm action={saveCostingSettings} submitLabel="Save costing settings">
      <FormSection title="Labour" description="Hands-on time only. Unattended printing is covered by machine costs.">
        <NumF name="laborRatePerHour" label="Labour rate" unit="৳/h" min={0} defaultValue={tk(s.laborRatePerHour)} tip="What an hour of your (or your staff's) hands-on time is worth — include it even if you pay yourself from profit." />
        <NumF name="designRatePerHour" label="Design & 3D modelling rate" unit="৳/h" min={0} defaultValue={tk(s.designRatePerHour)} />
      </FormSection>

      <section className="rounded-[var(--radius-card)] border border-line bg-white">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-display font-semibold tracking-tight">Monthly overhead</h2>
          <p className="mt-0.5 text-sm text-muted">
            Shared business costs, allocated to every job by one method. Untick items that are already costed elsewhere (e.g. printer maintenance rates, per-item packaging) so they are not counted twice.
          </p>
        </div>
        <div className="space-y-5 p-5">
          <Rows
            name="overhead.items"
            initial={s.overhead.items.map((i) => ({ ...i, monthlyAmount: tk(i.monthlyAmount) }))}
            blank={{ id: "", label: "", category: "other", monthlyAmount: 0, included: true }}
            addLabel="Add expense"
            columns={[
              { key: "label", label: "Expense", type: "text" },
              {
                key: "category",
                label: "Category",
                type: "select",
                width: "200px",
                options: [
                  { value: "rent", label: "Rent / workspace" },
                  { value: "internet_software", label: "Internet & software" },
                  { value: "equipment_maintenance", label: "Equipment maintenance" },
                  { value: "packaging_supplies", label: "Packaging supplies" },
                  { value: "marketing", label: "Marketing" },
                  { value: "general", label: "General" },
                  { value: "other", label: "Other" },
                ],
              },
              { key: "monthlyAmount", label: "Per month", type: "number", unit: "৳", width: "130px" },
              { key: "included", label: "Allocate", type: "checkbox", width: "70px" },
            ]}
          />
          <div className="grid gap-5 sm:grid-cols-2" onChange={(e) => (e.target as HTMLSelectElement).name === "overhead.method" && setMethod((e.target as HTMLSelectElement).value as typeof method)}>
            <SelectF
              name="overhead.method"
              label="Allocation method"
              defaultValue={s.overhead.method}
              options={[
                { value: "machine_hour", label: "Per productive machine hour" },
                { value: "labor_hour", label: "Per direct labour hour" },
                { value: "production_unit", label: "Per unit produced" },
              ]}
            />
            <p className="self-end rounded-lg bg-paper px-3 py-2 text-xs leading-relaxed text-muted">{METHOD_HELP[method]}</p>
            <NumF name="overhead.monthlyMachineHours" label="Monthly machine hours" unit="h" min={0} defaultValue={s.overhead.monthlyMachineHours} hint={`Active printers plan ${activePrinterHours} h/month`} />
            <NumF name="overhead.monthlyLaborHours" label="Monthly direct labour hours" unit="h" min={0} defaultValue={s.overhead.monthlyLaborHours} />
            <NumF name="overhead.monthlyProductionUnits" label="Monthly units produced" unit="units" min={0} defaultValue={s.overhead.monthlyProductionUnits} />
          </div>
        </div>
      </section>

      <FormSection title="Failed prints">
        <NumF
          name="defaultFailureConsumption"
          label="Default share of a job lost per failure"
          unit="%"
          min={1}
          max={100}
          defaultValue={pct(s.defaultFailureConsumption)}
          tip="Failures usually happen part-way through a print. 50% is a reasonable starting point; adjust per calculation."
        />
      </FormSection>

      <FormSection title="Profit targets" description="Margin is profit as a share of the selling price — not markup on cost. A 40% margin equals a 66.7% markup.">
        <NumF name="pricing.targetMargin" label="Standard target margin" unit="%" min={0} max={90} defaultValue={pct(s.pricing.targetMargin)} />
        <NumF name="pricing.premiumMargin" label="Premium / custom target margin" unit="%" min={0} max={90} defaultValue={pct(s.pricing.premiumMargin)} />
        <NumF name="pricing.lowMarginThreshold" label="Warn when margin is below" unit="%" min={0} max={90} defaultValue={pct(s.pricing.lowMarginThreshold)} />
        <SelectF
          name="pricing.roundingStep"
          label="Round prices up to"
          defaultValue={String(s.pricing.roundingStep)}
          options={[
            { value: "0", label: "No rounding (nearest poisha)" },
            { value: "1", label: "৳1" },
            { value: "5", label: "৳5" },
            { value: "10", label: "৳10" },
            { value: "50", label: "৳50" },
            { value: "100", label: "৳100" },
          ]}
        />
      </FormSection>

      <section className="rounded-[var(--radius-card)] border border-line bg-white">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-display font-semibold tracking-tight">Selling fees & tax</h2>
          <p className="mt-0.5 text-sm text-muted">
            Percentage fees are built into the price equation: price = cost ÷ (1 − margin − fees). Tax is collected for the authorities and is never counted as revenue or cost.
          </p>
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Rows
              name="pricing.percentFees"
              initial={s.pricing.percentFees.map((f) => ({ label: f.label, rate: pct(f.rate) }))}
              blank={{ label: "", rate: 0 }}
              addLabel="Add percentage fee"
              maxRows={10}
              columns={[
                { key: "label", label: "Fee", type: "text", placeholder: "e.g. bKash merchant fee" },
                { key: "rate", label: "Rate", type: "number", unit: "% of amount paid", width: "180px" },
              ]}
            />
          </div>
          <NumF name="pricing.fixedFeePerOrder" label="Fixed fee per order" unit="৳" min={0} defaultValue={tk(s.pricing.fixedFeePerOrder)} hint="Spread across the items in the order" />
          <SelectF
            name="pricing.tax.mode"
            label="Tax treatment"
            defaultValue={s.pricing.tax.mode}
            options={[
              { value: "none", label: "Not registered / no tax" },
              { value: "exclusive", label: "Add tax on top of prices" },
              { value: "inclusive", label: "Prices include tax" },
            ]}
            tip="Check your obligations with a tax adviser. The calculator only applies the mode you choose."
          />
          <NumF name="pricing.tax.rate" label="Tax rate" unit="%" min={0} max={50} defaultValue={pct(s.pricing.tax.rate)} />
          <TextF name="pricing.tax.label" label="Tax name" defaultValue={s.pricing.tax.label} maxLength={20} />
        </div>
      </section>

      <FormSection title="Premium price assumptions" description="The premium price adds these cost-based items before applying the premium margin.">
        <NumF name="pricing.premium.personalizationMinutesPerItem" label="Personalisation time per item" unit="min" min={0} defaultValue={s.pricing.premium.personalizationMinutesPerItem} />
        <NumF name="pricing.premium.rushFeePerMachineHour" label="Rush fee per machine hour" unit="৳/h" min={0} defaultValue={tk(s.pricing.premium.rushFeePerMachineHour)} tip="Opportunity cost of bumping other scheduled work." />
        <NumF name="pricing.premium.smallOrderThreshold" label="Small order: fewer than" unit="units" min={0} step="1" defaultValue={s.pricing.premium.smallOrderThreshold} />
        <NumF name="pricing.premium.smallOrderFee" label="Small-order handling fee" unit="৳" min={0} defaultValue={tk(s.pricing.premium.smallOrderFee)} />
      </FormSection>
    </ActionForm>
  );
}
