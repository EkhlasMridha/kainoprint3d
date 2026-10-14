"use client";

import { saveMaterial } from "@/server/actions/equipment";
import { ActionForm, CheckF, FormSection, NumF, TextF, TextareaF } from "./form";

export interface MaterialFormValues {
  id?: string;
  name: string;
  brand: string;
  category: string;
  color: string;
  supplier: string;
  purchasePrice: number; // taka
  spoolWeightGrams: number;
  netUsableGrams: number | "";
  handlingCostPerSpool: number;
  failureRate: number; // percent
  wasteAllowancePct: number; // percent
  active: boolean;
  notes: string;
}

export function MaterialForm({ values }: { values: MaterialFormValues }) {
  return (
    <ActionForm action={saveMaterial} submitLabel={values.id ? "Save material" : "Add material"}>
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <FormSection title="Material" columns={3}>
        <TextF name="name" label="Name" defaultValue={values.name} required maxLength={80} placeholder="e.g. PLA+ Black" />
        <TextF name="category" label="Type" defaultValue={values.category} maxLength={40} list="material-types" />
        <datalist id="material-types">
          {["PLA", "PLA+", "Silk PLA", "PETG", "PETG-CF", "ABS", "ASA", "TPU", "Nylon"].map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <TextF name="brand" label="Brand" defaultValue={values.brand} maxLength={60} />
        <TextF name="color" label="Colour" defaultValue={values.color} maxLength={40} />
        <TextF name="supplier" label="Supplier" defaultValue={values.supplier} maxLength={120} />
        <CheckF name="active" label="Active" defaultChecked={values.active} />
      </FormSection>

      <FormSection title="Cost per gram" description="Cost per gram = (spool price + handling cost) ÷ net usable grams.">
        <NumF name="purchasePrice" label="Spool price" unit="৳" min={0} defaultValue={values.purchasePrice} required tip="What you actually paid per spool, including delivery." />
        <NumF name="spoolWeightGrams" label="Spool weight" unit="g" min={1} defaultValue={values.spoolWeightGrams} required />
        <NumF name="netUsableGrams" label="Net usable weight" unit="g" min={0} defaultValue={values.netUsableGrams} hint="Leave empty to use the full spool weight" tip="Filament you can actually print with, after tangles, spool ends and test lines. Using this avoids adding the same waste again later." />
        <NumF name="handlingCostPerSpool" label="Drying, storage & handling per spool" unit="৳" min={0} defaultValue={values.handlingCostPerSpool} tip="Desiccant, dryer electricity and storage boxes allocated to one spool." />
      </FormSection>

      <FormSection title="Risk" description="Only add allowances that are NOT already captured by the usable weight or your slicer estimate.">
        <NumF name="failureRate" label="Extra failure rate for this material" unit="%" min={0} max={90} step="0.1" defaultValue={values.failureRate} tip="Combined with the printer's failure rate as independent risks: 1 − (1 − printer)(1 − material). Use for tricky materials such as TPU or nylon." />
        <NumF name="wasteAllowancePct" label="Extra waste allowance" unit="%" min={0} max={50} step="0.1" defaultValue={values.wasteAllowancePct} tip="Handling loss beyond the slicer figure (e.g. colour-change tests). Applied only when enabled on a calculation." />
      </FormSection>

      <FormSection title="Notes" columns={1}>
        <TextareaF name="notes" label="Notes" defaultValue={values.notes} maxLength={1000} />
      </FormSection>
    </ActionForm>
  );
}
