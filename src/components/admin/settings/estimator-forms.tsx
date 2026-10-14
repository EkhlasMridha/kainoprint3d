"use client";

import type { EstimatorCommonConfig, KeychainConfig, OrganizerConfig } from "@/domain/estimator/types";
import { saveEstimatorCommon, saveKeychainConfig, saveOrganizerConfig } from "@/server/actions/settings";
import { ActionForm, FormSection, NumF, SelectF, usePrefixError } from "../form";
import { RowsEditor } from "../rows-editor";

const pct = (f: number) => +(f * 100).toFixed(4);
const tk = (p: number) => p / 100;

function Rows(props: Parameters<typeof RowsEditor>[0]) {
  return <RowsEditor {...props} error={usePrefixError(props.name)} />;
}

function RangeF({ name, label, unit, r }: { name: string; label: string; unit: string; r: { min: number; max: number } }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <NumF name={`${name}.min`} label={`${label} min`} unit={unit} min={0} defaultValue={r.min} />
      <NumF name={`${name}.max`} label={`${label} max`} unit={unit} min={0} defaultValue={r.max} />
    </div>
  );
}

function FloorSection({ floor, what }: { floor: { perUnit: number; perGram: number; perHour: number }; what: string }) {
  return (
    <FormSection
      title="Minimum sustainable price (private)"
      columns={3}
      description={`Quantity discounts on ${what} never go below: fixed + grams × per-gram + hours × per-hour. Set these from your cost calculations. Never shown to customers.`}
    >
      <NumF name="floor.perUnit" label="Fixed per item" unit="৳" min={0} defaultValue={tk(floor.perUnit)} />
      <NumF name="floor.perGram" label="Per gram" unit="৳/g" min={0} step="0.01" defaultValue={tk(floor.perGram)} />
      <NumF name="floor.perHour" label="Per print hour" unit="৳/h" min={0} defaultValue={tk(floor.perHour)} />
    </FormSection>
  );
}

export function EstimatorCommonForm({ c }: { c: EstimatorCommonConfig }) {
  return (
    <ActionForm action={saveEstimatorCommon} submitLabel="Save shared options">
      <FormSection title="Materials offered to customers" columns={1} description="Density is used only for weight estimates. The surcharge is applied to the item price.">
        <Rows
          name="materials"
          initial={c.materials.map((m) => ({ ...m, surchargePct: pct(m.surchargePct) }))}
          blank={{ key: "", label: "", description: "", density: 1.24, surchargePct: 0, active: true }}
          addLabel="Add material"
          columns={[
            { key: "key", label: "Key", type: "text", width: "90px" },
            { key: "label", label: "Label", type: "text", width: "130px" },
            { key: "description", label: "Customer description", type: "text" },
            { key: "density", label: "Density", unit: "g/cm³", type: "number", width: "100px" },
            { key: "surchargePct", label: "Surcharge", unit: "%", type: "number", width: "100px" },
            { key: "active", label: "On", type: "checkbox", width: "44px" },
          ]}
        />
      </FormSection>
      <FormSection title="Colours" columns={1}>
        <Rows
          name="colors"
          initial={c.colors.map((col) => ({ ...col }))}
          blank={{ key: "", label: "", hex: "#000000" }}
          addLabel="Add colour"
          columns={[
            { key: "key", label: "Key", type: "text", width: "120px" },
            { key: "label", label: "Label", type: "text" },
            { key: "hex", label: "Hex", type: "text", width: "120px", placeholder: "#111111" },
          ]}
        />
      </FormSection>
      <FormSection title="Quantity discounts" columns={1} description="Discounts never push a price below the private minimum sustainable price.">
        <Rows
          name="quantityTiers"
          initial={c.quantityTiers.map((t) => ({ minQty: t.minQty, discountPct: pct(t.discountPct) }))}
          blank={{ minQty: 10, discountPct: 5 }}
          addLabel="Add tier"
          maxRows={10}
          columns={[
            { key: "minQty", label: "From quantity", type: "number", step: "1" },
            { key: "discountPct", label: "Discount", unit: "%", type: "number" },
          ]}
        />
      </FormSection>
      <FormSection title="Estimate display" columns={3}>
        <SelectF
          name="roundingStep"
          label="Round totals to"
          defaultValue={String(c.roundingStep)}
          options={[0, 1, 5, 10, 50, 100].map((s) => ({ value: String(s), label: s ? `৳${s}` : "No rounding" }))}
        />
        <NumF name="range.lowPct" label="Range below estimate" unit="%" min={0} max={50} defaultValue={pct(c.range.lowPct)} />
        <NumF name="range.highPct" label="Range above estimate" unit="%" min={0} max={100} defaultValue={pct(c.range.highPct)} />
        <NumF name="range.reviewHighPct" label="Range above (needs review)" unit="%" min={0} max={200} defaultValue={pct(c.range.reviewHighPct)} />
        <NumF name="rushPct" label="Rush surcharge" unit="%" min={0} defaultValue={pct(c.rushPct)} />
        <NumF name="rushMinimumFee" label="Minimum rush fee" unit="৳" min={0} defaultValue={tk(c.rushMinimumFee)} />
        <RangeF name="leadTimeDays" label="Lead time" unit="days" r={c.leadTimeDays} />
        <RangeF name="rushLeadTimeDays" label="Rush lead time" unit="days" r={c.rushLeadTimeDays} />
        <NumF name="solidityFactor" label="Solid fraction of a print" unit="%" min={1} max={100} defaultValue={pct(c.solidityFactor)} tip="Walls + infill as a share of the solid volume, used for keychain weight estimates." />
        <NumF name="maxUploadMb" label="Max customer upload" unit="MB" min={1} max={100} step="1" defaultValue={c.maxUploadMb} />
      </FormSection>
    </ActionForm>
  );
}

export function KeychainConfigForm({ k }: { k: KeychainConfig }) {
  return (
    <ActionForm action={saveKeychainConfig} submitLabel="Save keychain pricing">
      <FormSection title="Keychain styles" columns={1} description="Fill factor = share of the width × height × thickness box that is solid material.">
        <Rows
          name="types"
          initial={k.types.map((t) => ({ ...t, basePrice: tk(t.basePrice), fillFactor: pct(t.fillFactor) }))}
          blank={{ key: "text", label: "", description: "", basePrice: 0, fillFactor: 60, needsReview: false, requiresDesignFee: false }}
          addLabel="Add style"
          maxRows={4}
          columns={[
            { key: "key", label: "Type", type: "select", width: "110px", options: ["text", "shape", "logo", "custom"].map((v) => ({ value: v, label: v })) },
            { key: "label", label: "Label", type: "text", width: "130px" },
            { key: "description", label: "Description", type: "text" },
            { key: "basePrice", label: "Base", unit: "৳", type: "number", width: "90px" },
            { key: "fillFactor", label: "Fill", unit: "%", type: "number", width: "80px" },
            { key: "needsReview", label: "Review", type: "checkbox", width: "60px" },
            { key: "requiresDesignFee", label: "Design fee", type: "checkbox", width: "70px" },
          ]}
        />
      </FormSection>
      <FormSection title="Size & limits" columns={3}>
        <RangeF name="limits.width" label="Width" unit="mm" r={k.limits.width} />
        <RangeF name="limits.height" label="Height" unit="mm" r={k.limits.height} />
        <RangeF name="limits.thickness" label="Thickness" unit="mm" r={k.limits.thickness} />
        <NumF name="limits.maxTextLength" label="Max text length" min={1} step="1" defaultValue={k.limits.maxTextLength} />
        <NumF name="limits.maxColors" label="Max colours" min={1} step="1" defaultValue={k.limits.maxColors} />
        <NumF name="limits.maxQuantity" label="Max online quantity" min={1} step="1" defaultValue={k.limits.maxQuantity} />
      </FormSection>
      <FormSection title="Prices" columns={3}>
        <NumF name="includedGrams" label="Material included in base" unit="g" min={0} defaultValue={k.includedGrams} />
        <NumF name="pricePerExtraGram" label="Price per extra gram" unit="৳/g" min={0} step="0.01" defaultValue={tk(k.pricePerExtraGram)} />
        <NumF name="gramsPerHour" label="Print speed (small parts)" unit="g/h" min={1} defaultValue={k.gramsPerHour} />
        <NumF name="includedCharacters" label="Characters included" min={0} step="1" defaultValue={k.includedCharacters} />
        <NumF name="pricePerExtraCharacter" label="Per extra character" unit="৳" min={0} defaultValue={tk(k.pricePerExtraCharacter)} />
        <NumF name="personalizationFee" label="Name personalisation fee" unit="৳" min={0} defaultValue={tk(k.personalizationFee)} />
        <NumF name="extraColorCharge" label="Per extra colour" unit="৳" min={0} defaultValue={tk(k.extraColorCharge)} />
        <NumF name="doubleSidedFee" label="Double-sided fee" unit="৳" min={0} defaultValue={tk(k.doubleSidedFee)} />
        <NumF name="designFee" label="Design fee (per order)" unit="৳" min={0} defaultValue={tk(k.designFee)} />
        <NumF name="minimumOrderPrice" label="Minimum order price" unit="৳" min={0} defaultValue={tk(k.minimumOrderPrice)} />
      </FormSection>
      <FormSection title="Ring & hardware options" columns={1}>
        <Rows
          name="hardware"
          initial={k.hardware.map((h) => ({ ...h, price: tk(h.price) }))}
          blank={{ key: "", label: "", price: 0 }}
          addLabel="Add option"
          columns={[
            { key: "key", label: "Key", type: "text", width: "140px" },
            { key: "label", label: "Label", type: "text" },
            { key: "price", label: "Price", unit: "৳", type: "number", width: "110px" },
          ]}
        />
      </FormSection>
      <FloorSection floor={k.floor} what="keychains" />
    </ActionForm>
  );
}

export function OrganizerConfigForm({ o }: { o: OrganizerConfig }) {
  const f = o.features;
  const feature = (key: keyof OrganizerConfig["features"], label: string) => (
    <div className="grid grid-cols-3 gap-2 sm:col-span-3">
      <NumF name={`features.${key}.grams`} label={`${label}: material`} unit="g" min={0} defaultValue={f[key].grams} />
      <NumF name={`features.${key}.hours`} label="Print time" unit="h" min={0} step="0.1" defaultValue={f[key].hours} />
      <NumF name={`features.${key}.price`} label="Price" unit="৳" min={0} defaultValue={tk(f[key].price)} />
    </div>
  );
  return (
    <ActionForm action={saveOrganizerConfig} submitLabel="Save organizer pricing">
      <FormSection title="Size & limits" columns={3} description="Keep maximum sizes within your largest build volume.">
        <RangeF name="limits.width" label="Width" unit="mm" r={o.limits.width} />
        <RangeF name="limits.length" label="Depth" unit="mm" r={o.limits.length} />
        <RangeF name="limits.height" label="Height" unit="mm" r={o.limits.height} />
        <NumF name="limits.maxCompartments" label="Max compartments" min={1} step="1" defaultValue={o.limits.maxCompartments} />
        <NumF name="limits.maxPenHolders" label="Max pen holders" min={0} step="1" defaultValue={o.limits.maxPenHolders} />
        <NumF name="limits.maxDrawers" label="Max drawers" min={0} step="1" defaultValue={o.limits.maxDrawers} />
        <NumF name="limits.maxColors" label="Max colours" min={1} step="1" defaultValue={o.limits.maxColors} />
        <NumF name="limits.maxQuantity" label="Max online quantity" min={1} step="1" defaultValue={o.limits.maxQuantity} />
      </FormSection>
      <FormSection title="Material model" columns={3} description="Material = (base + outer walls + dividers) × wall thickness × solid fraction × density. It grows with surface area, not volume.">
        <NumF name="geometry.wallMm" label="Wall thickness" unit="mm" min={0.4} step="0.1" defaultValue={o.geometry.wallMm} />
        <NumF name="geometry.baseMm" label="Base thickness" unit="mm" min={0.4} step="0.1" defaultValue={o.geometry.baseMm} />
        <NumF name="geometry.dividerHeightFactor" label="Divider height" unit="% of wall" min={0} max={100} defaultValue={pct(o.geometry.dividerHeightFactor)} />
        <NumF name="geometry.solidity" label="Wall solid fraction" unit="%" min={1} max={100} defaultValue={pct(o.geometry.solidity)} />
        <NumF name="gramsPerHour" label="Print speed" unit="g/h" min={1} defaultValue={o.gramsPerHour} />
      </FormSection>
      <FormSection title="Prices" columns={3}>
        <NumF name="pricePerGram" label="Per gram" unit="৳/g" min={0} step="0.01" defaultValue={tk(o.pricePerGram)} />
        <NumF name="pricePerPrintHour" label="Per print hour" unit="৳/h" min={0} defaultValue={tk(o.pricePerPrintHour)} />
        <NumF name="compartmentFee" label="Per extra compartment" unit="৳" min={0} defaultValue={tk(o.compartmentFee)} />
        <NumF name="extraColorCharge" label="Per extra colour" unit="৳" min={0} defaultValue={tk(o.extraColorCharge)} />
        <NumF name="assemblyFeePerUnit" label="Assembly (with drawers)" unit="৳" min={0} defaultValue={tk(o.assemblyFeePerUnit)} />
        <NumF name="customTextFee" label="Custom text" unit="৳" min={0} defaultValue={tk(o.customTextFee)} />
        <NumF name="customLogoFee" label="Custom logo" unit="৳" min={0} defaultValue={tk(o.customLogoFee)} />
        <NumF name="baseDesignFee" label="Custom size setup (per order)" unit="৳" min={0} defaultValue={tk(o.baseDesignFee)} hint="Waived for unchanged presets" />
        <NumF name="designAssistanceFee" label="Design assistance (per order)" unit="৳" min={0} defaultValue={tk(o.designAssistanceFee)} />
        <NumF name="minimumOrderPrice" label="Minimum order price" unit="৳" min={0} defaultValue={tk(o.minimumOrderPrice)} />
      </FormSection>
      <FormSection title="Features" columns={3}>
        {feature("penHolder", "Pen holder")}
        {feature("phoneStand", "Phone stand")}
        {feature("drawer", "Drawer")}
        {feature("cableManagement", "Cable management")}
      </FormSection>
      <FormSection title="Presets" columns={1} description="Starting designs shown to customers. Unchanged presets skip the custom setup fee.">
        <Rows
          name="presets"
          initial={o.presets.map((p) => ({ ...p }))}
          blank={{ key: "", name: "", description: "", width: 160, length: 100, height: 50, compartments: 3, penHolders: 0, phoneStand: false, drawers: 0, cableManagement: false }}
          addLabel="Add preset"
          maxRows={20}
          columns={[
            { key: "key", label: "Key", type: "text", width: "90px" },
            { key: "name", label: "Name", type: "text", width: "170px" },
            { key: "description", label: "Description", type: "text" },
            { key: "width", label: "W", type: "number", width: "70px" },
            { key: "length", label: "D", type: "number", width: "70px" },
            { key: "height", label: "H", type: "number", width: "70px" },
            { key: "compartments", label: "Comp.", type: "number", width: "64px", step: "1" },
            { key: "penHolders", label: "Pens", type: "number", width: "60px", step: "1" },
            { key: "drawers", label: "Drw.", type: "number", width: "60px", step: "1" },
            { key: "phoneStand", label: "Phone", type: "checkbox", width: "50px" },
            { key: "cableManagement", label: "Cable", type: "checkbox", width: "50px" },
          ]}
        />
      </FormSection>
      <FloorSection floor={o.floor} what="organizers" />
    </ActionForm>
  );
}
