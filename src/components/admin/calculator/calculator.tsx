"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { checkChosenPrice, type PriceTier, type TierKey } from "@/domain/costing/pricing";
import { combinedFailureRate, CostingError } from "@/domain/costing/rates";
import { evaluateJob, type ChosenTier, type Evaluation } from "@/domain/costing/record";
import { jobInputSchema, issuesToFieldErrors } from "@/domain/costing/schemas";
import { parseSlicerSummary } from "@/domain/costing/slicer";
import type { CostingSettings, JobInput, MaterialProfile, PrinterProfile } from "@/domain/costing/types";
import { formatBDT, formatPercent, formatRate, roundHalfUp } from "@/domain/money";
import { saveCalculation } from "@/server/actions/calculations";
import { Button } from "../../ui/button";
import { cn } from "../../ui/cn";
import { Checkbox, Field, Input, Select, Textarea } from "../../ui/field";
import { Alert, Badge, Spinner } from "../../ui/primitives";
import { DurationInput, MoneyInput, NumInput, Panel, PercentInput } from "./inputs";

export interface CalcPrinter {
  id: string;
  name: string;
  model: string;
  profile: PrinterProfile;
}
export interface CalcMaterial {
  id: string;
  name: string;
  category: string;
  profile: MaterialProfile;
}
export interface CalculatorInitial {
  id?: string;
  job: JobInput;
  printerId: string;
  materialId: string;
  productId: string | null;
  chosenTier: ChosenTier;
  customPrice: number | null;
  expectedMonthlyUnits: number;
  notes: string;
}

type Updater = (j: JobInput) => JobInput;

export function Calculator({
  printers,
  materials,
  products,
  settings,
  initial,
}: {
  printers: CalcPrinter[];
  materials: CalcMaterial[];
  products: { id: string; name: string }[];
  settings: CostingSettings;
  initial: CalculatorInitial;
}) {
  const router = useRouter();
  const [job, setJob] = useState<JobInput>(initial.job);
  const [printerId, setPrinterId] = useState(initial.printerId);
  const [materialId, setMaterialId] = useState(initial.materialId);
  const [productId, setProductId] = useState<string | null>(initial.productId);
  const [tier, setTier] = useState<ChosenTier>(initial.chosenTier);
  const [customPrice, setCustomPrice] = useState<number>(initial.customPrice ?? Number.NaN);
  const [monthly, setMonthly] = useState(initial.expectedMonthlyUnits);
  const [notes, setNotes] = useState(initial.notes);
  const [slicerText, setSlicerText] = useState("");
  const [slicerMsg, setSlicerMsg] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<{ message?: string; ok?: boolean; errors?: Record<string, string> }>({});
  const [pending, startTransition] = useTransition();

  const update = (fn: Updater) => setJob((j) => fn(structuredClone(j)));
  const printer = printers.find((p) => p.id === printerId);
  const material = materials.find((m) => m.id === materialId);

  const fieldErrors = useMemo(() => {
    const r = jobInputSchema.safeParse(job);
    return r.success ? {} : issuesToFieldErrors(r.error);
  }, [job]);
  const [attempted, setAttempted] = useState(false);
  // Don't nag about the empty name on a fresh form; show it once the owner tries to save.
  const err = (k: string) => (k === "name" && !attempted && !job.name ? undefined : fieldErrors[k]) ?? saveState.errors?.[k];

  const result = useMemo((): { ev: Evaluation } | { error: string[] } => {
    if (!printer || !material) return { error: ["Choose a printer and a material."] };
    try {
      const custom = Number.isFinite(customPrice) ? customPrice : null;
      return { ev: evaluateJob(job, { printer: printer.profile, material: material.profile, settings }, tier, custom) };
    } catch (e) {
      return { error: e instanceof CostingError ? e.issues : [(e as Error).message] };
    }
  }, [job, printer, material, settings, tier, customPrice]);

  const defaultFailure = printer && material ? combinedFailureRate(printer.profile.failureRate, material.profile.failureRate) : 0;

  const applySlicer = () => {
    const r = parseSlicerSummary(slicerText);
    if (r.grams === null && r.hours === null) {
      setSlicerMsg("Couldn't find filament weight or print time in that text.");
      return;
    }
    update((j) => {
      if (r.grams !== null) {
        j.material.mode = "slicer_total";
        j.material.slicerTotalGrams = r.grams;
      }
      if (r.hours !== null) j.printHoursPerPlate = r.hours;
      return j;
    });
    setSlicerMsg(
      [r.grams !== null ? `${r.grams} g total filament` : null, r.hours !== null ? `${roundHalfUp(r.hours, 2)} h print time` : null].filter(Boolean).join(" and ") + " applied.",
    );
  };

  const save = (asNew: boolean) => {
    setAttempted(true);
    if (Object.keys(fieldErrors).length > 0) {
      setSaveState({ ok: false, message: "Please fix the highlighted fields." });
      return;
    }
    setSaveState({});
    startTransition(async () => {
      const res = await saveCalculation({
        id: initial.id,
        asNew,
        job,
        printerId,
        materialId,
        productId,
        chosenTier: tier,
        customPrice: tier === "custom" && Number.isFinite(customPrice) ? customPrice : null,
        expectedMonthlyUnits: Number.isFinite(monthly) ? Math.max(0, Math.round(monthly)) : 0,
        notes,
      });
      if (res.ok) {
        setSaveState({ ok: true, message: "Saved." });
        if (res.id !== initial.id) router.push(`/admin/calculations/${res.id}`);
        else router.refresh();
      } else setSaveState({ ok: false, message: res.message, errors: res.errors });
    });
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_440px]">
      {/* ------------------------------------------------------------ Inputs */}
      <div className="space-y-5">
        <Panel title="Job">
          <Field label="Product or job name" error={err("name")}>
            {(p) => <Input {...p} value={job.name} maxLength={120} onChange={(e) => update((j) => ((j.name = e.target.value), j))} placeholder="e.g. Name keychain — plate of 10" />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Printer" error={err("printerId")}>
              {(p) => (
                <Select {...p} value={printerId} onChange={(e) => setPrinterId(e.target.value)}>
                  <option value="">Choose…</option>
                  {printers.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Material" error={err("materialId")}>
              {(p) => (
                <Select {...p} value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
                  <option value="">Choose…</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.category})
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <NumInput label="Batch quantity" hint="Sellable items in this order or batch" value={job.quantity} min={1} step={1} error={err("quantity")} onChange={(v) => update((j) => ((j.quantity = v), j))} />
            <NumInput
              label="Items per print job"
              tip="How many items fit on one build plate. The batch needs ⌈quantity ÷ items per plate⌉ print jobs."
              value={job.itemsPerPlate}
              min={1}
              step={1}
              error={err("itemsPerPlate")}
              onChange={(v) => update((j) => ((j.itemsPerPlate = v), j))}
            />
          </div>
        </Panel>

        <Panel title="Slicer figures (per print job)" description="Enter values for ONE build plate, exactly as the slicer reports them.">
          <details className="rounded-lg bg-paper px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium">Paste from Bambu Studio, OrcaSlicer or PrusaSlicer</summary>
            <div className="mt-3 space-y-2">
              <Textarea value={slicerText} onChange={(e) => setSlicerText(e.target.value)} rows={4} placeholder={"Total filament: 48.23 g\nTotal time: 1h 36m"} aria-label="Slicer summary text" />
              <div className="flex items-center gap-3">
                <Button size="sm" variant="secondary" onClick={applySlicer} disabled={!slicerText.trim()}>
                  Apply
                </Button>
                {slicerMsg ? <span className="text-xs text-muted" role="status">{slicerMsg}</span> : null}
              </div>
            </div>
          </details>
          <DurationInput label="Printer run time per job" hours={job.printHoursPerPlate} onChange={(h) => update((j) => ((j.printHoursPerPlate = h), j))} error={err("printHoursPerPlate")} tip="Unattended machine time. It drives machine costs, not labour." />
          <fieldset>
            <legend className="mb-2 text-[0.8rem] font-medium text-ink-2">Filament entry</legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["slicer_total", "Slicer total (includes supports & purge)"],
                  ["components", "Model + supports + purge separately"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={job.material.mode === mode}
                  onClick={() => update((j) => ((j.material.mode = mode), j))}
                  className={cn("rounded-full border px-3.5 py-1.5 text-sm", job.material.mode === mode ? "border-ink bg-ink text-paper" : "border-line-strong bg-white hover:border-ink")}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          {job.material.mode === "slicer_total" ? (
            <NumInput label="Total filament per job" unit="g" value={job.material.slicerTotalGrams} min={0} error={err("material.slicerTotalGrams")} onChange={(v) => update((j) => ((j.material.slicerTotalGrams = v), j))} tip="Bambu Studio and OrcaSlicer's total already includes supports, prime/wipe tower and flushing. Nothing is added on top." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <NumInput label="Model" unit="g" value={job.material.modelGrams} min={0} error={err("material.modelGrams")} onChange={(v) => update((j) => ((j.material.modelGrams = v), j))} />
              <NumInput label="Supports" unit="g" value={job.material.supportGrams} min={0} error={err("material.supportGrams")} onChange={(v) => update((j) => ((j.material.supportGrams = v), j))} />
              <NumInput label="Purge / transitions" unit="g" value={job.material.purgeGrams} min={0} error={err("material.purgeGrams")} onChange={(v) => update((j) => ((j.material.purgeGrams = v), j))} tip="Flushing, prime tower and colour-change waste." />
            </div>
          )}
          <Checkbox
            label={`Apply ${material ? formatPercent(material.profile.wasteAllowancePct) : "the material's"} extra waste allowance`}
            hint="Only if the slicer figure does NOT already cover this handling loss."
            checked={job.material.applyWasteAllowance}
            onChange={(e) => update((j) => ((j.material.applyWasteAllowance = e.target.checked), j))}
          />
        </Panel>

        <Panel title="Hands-on labour (minutes)" description={`Billed at ${formatRate(job.laborRateOverride ?? settings.laborRatePerHour, "h")}. Unattended printing time is not labour.`}>
          <p className="text-xs font-medium text-muted">Per print job</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumInput label="Slicing & machine setup" unit="min" value={job.labor.perPlate.setup} min={0} error={err("labor.perPlate.setup")} onChange={(v) => update((j) => ((j.labor.perPlate.setup = v), j))} />
            <NumInput label="Removing from build plate" unit="min" value={job.labor.perPlate.removal} min={0} error={err("labor.perPlate.removal")} onChange={(v) => update((j) => ((j.labor.perPlate.removal = v), j))} />
          </div>
          <p className="text-xs font-medium text-muted">Per item</p>
          <div className="grid gap-4 sm:grid-cols-4">
            <NumInput label="Cleaning & post-processing" unit="min" value={job.labor.perItem.postProcessing} min={0} error={err("labor.perItem.postProcessing")} onChange={(v) => update((j) => ((j.labor.perItem.postProcessing = v), j))} />
            <NumInput label="Assembly" unit="min" value={job.labor.perItem.assembly} min={0} error={err("labor.perItem.assembly")} onChange={(v) => update((j) => ((j.labor.perItem.assembly = v), j))} />
            <NumInput label="Quality inspection" unit="min" value={job.labor.perItem.inspection} min={0} error={err("labor.perItem.inspection")} onChange={(v) => update((j) => ((j.labor.perItem.inspection = v), j))} />
            <NumInput label="Packaging" unit="min" value={job.labor.perItem.packaging} min={0} error={err("labor.perItem.packaging")} onChange={(v) => update((j) => ((j.labor.perItem.packaging = v), j))} />
          </div>
          <p className="text-xs font-medium text-muted">Per batch</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <NumInput label="Preparing the model" unit="min" value={job.labor.perBatch.modelPrep} min={0} error={err("labor.perBatch.modelPrep")} onChange={(v) => update((j) => ((j.labor.perBatch.modelPrep = v), j))} />
            <NumInput label="Customer communication" unit="min" value={job.labor.perBatch.communication} min={0} error={err("labor.perBatch.communication")} onChange={(v) => update((j) => ((j.labor.perBatch.communication = v), j))} />
            <MoneyInput
              label="Labour rate override"
              unit="৳/h"
              placeholder={String(settings.laborRatePerHour / 100)}
              value={job.laborRateOverride ?? Number.NaN}
              error={err("laborRateOverride")}
              onChange={(v) => update((j) => ((j.laborRateOverride = Number.isFinite(v) ? v : null), j))}
              hint="Empty = shop rate"
            />
          </div>
        </Panel>

        <Panel title="Design & modelling">
          <div className="grid gap-4 sm:grid-cols-3">
            <NumInput label="Design time" unit="min" value={job.design.minutes} min={0} error={err("design.minutes")} onChange={(v) => update((j) => ((j.design.minutes = v), j))} tip={`Billed at ${formatRate(settings.designRatePerHour, "h")}.`} />
            <Field label="How to charge design">
              {(p) => (
                <Select {...p} value={job.design.treatment} onChange={(e) => update((j) => ((j.design.treatment = e.target.value as JobInput["design"]["treatment"]), j))}>
                  <option value="include">Include in this batch</option>
                  <option value="amortize">Spread across future units</option>
                  <option value="separate">Bill as a separate design fee</option>
                </Select>
              )}
            </Field>
            {job.design.treatment === "amortize" ? (
              <NumInput label="Spread across" unit="units" value={job.design.amortizationUnits} min={1} step={1} error={err("design.amortizationUnits")} onChange={(v) => update((j) => ((j.design.amortizationUnits = v), j))} tip="Expected lifetime sales of this design." />
            ) : null}
          </div>
        </Panel>

        <Panel title="Failed prints" description="Expected cost of reprints, using expected attempts = 1 ÷ (1 − failure rate).">
          <div className="grid gap-4 sm:grid-cols-2">
            <PercentInput
              label="Failure rate"
              nullable
              placeholder={`${roundHalfUp(defaultFailure * 100, 2)} (printer + material)`}
              value={job.failure.rateOverride}
              error={err("failure.rateOverride")}
              onChange={(v) => update((j) => ((j.failure.rateOverride = v), j))}
              hint="Empty = printer & material defaults"
            />
            <PercentInput
              label="Share of a job lost when it fails"
              value={job.failure.consumptionFraction}
              error={err("failure.consumptionFraction")}
              onChange={(v) => update((j) => ((j.failure.consumptionFraction = v ?? Number.NaN), j))}
              tip="Most failures happen part-way through. 50% means a failed attempt wastes, on average, half the material and machine time."
            />
          </div>
          <Checkbox label="Include re-setup and cleanup labour for failed attempts" checked={job.failure.includeLabor} onChange={(e) => update((j) => ((j.failure.includeLabor = e.target.checked), j))} />
          <Checkbox
            label="My figures already include expected failures"
            hint="Turn on if you used measured averages that include reprints — prevents counting failures twice."
            checked={job.failure.alreadyIncluded}
            onChange={(e) => update((j) => ((j.failure.alreadyIncluded = e.target.checked), j))}
          />
        </Panel>

        <Panel title="Packaging, hardware & other direct costs">
          <div className="grid gap-4 sm:grid-cols-3">
            <MoneyInput label="Packaging per item" value={job.direct.packagingPerItem} min={0} error={err("direct.packagingPerItem")} onChange={(v) => update((j) => ((j.direct.packagingPerItem = v), j))} />
            <MoneyInput label="Hardware per item" value={job.direct.hardwarePerItem} min={0} error={err("direct.hardwarePerItem")} onChange={(v) => update((j) => ((j.direct.hardwarePerItem = v), j))} tip="Key rings, chains, magnets, screws, felt pads…" />
            <MoneyInput label="Other direct costs (batch)" value={job.direct.otherPerBatch} min={0} error={err("direct.otherPerBatch")} onChange={(v) => update((j) => ((j.direct.otherPerBatch = v), j))} tip="Courier to supplier, special paint, test print…" />
          </div>
        </Panel>

        <Panel title="Premium / custom order factors" description="Used only for the premium price.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Checkbox label="Personalised item" hint={`+${settings.pricing.premium.personalizationMinutesPerItem} min labour per item`} checked={job.premium.personalized} onChange={(e) => update((j) => ((j.premium.personalized = e.target.checked), j))} />
            <Checkbox label="Rush order" hint={`+${formatBDT(settings.pricing.premium.rushFeePerMachineHour)} per machine hour`} checked={job.premium.rush} onChange={(e) => update((j) => ((j.premium.rush = e.target.checked), j))} />
          </div>
          <MoneyInput label="Extra service fee (this order)" value={job.premium.extraServiceFee} min={0} error={err("premium.extraServiceFee")} onChange={(v) => update((j) => ((j.premium.extraServiceFee = v), j))} className="sm:w-1/2" />
        </Panel>
      </div>

      {/* ------------------------------------------------------------ Results */}
      <div className="space-y-5 xl:sticky xl:top-6 xl:self-start">
        {"error" in result ? (
          <Alert tone="loss" title="Can't calculate yet">
            <ul className="list-disc pl-4">
              {result.error.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </Alert>
        ) : (
          <Results ev={result.ev} job={job} settings={settings} tier={tier} setTier={setTier} customPrice={customPrice} setCustomPrice={setCustomPrice} />
        )}

        <Panel title="Save">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Linked product">
              {(p) => (
                <Select {...p} value={productId ?? ""} onChange={(e) => setProductId(e.target.value || null)}>
                  <option value="">None</option>
                  {products.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <NumInput label="Expected sales per month" unit="units" value={monthly} min={0} step={1} onChange={setMonthly} tip="Used for dashboard revenue, profit and printer-utilisation projections." />
          </div>
          <Field label="Notes">{(p) => <Textarea {...p} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={2000} />}</Field>
          {saveState.message ? <Alert tone={saveState.ok ? "profit" : "loss"}>{saveState.message}</Alert> : null}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => save(false)} disabled={pending || "error" in result}>
              {pending ? <Spinner /> : null}
              {initial.id ? "Save changes" : "Save calculation"}
            </Button>
            {initial.id ? (
              <Button variant="secondary" onClick={() => save(true)} disabled={pending || "error" in result}>
                Save as new copy
              </Button>
            ) : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ================================================================== Results panel */

const LINE_SHADES = ["#0b0b0b", "#2a2a2a", "#454542", "#5f5f5b", "#7a7a76", "#949490", "#afafab", "#c9c9c5", "#dcdcd8"];

function Results({
  ev,
  job,
  settings,
  tier,
  setTier,
  customPrice,
  setCustomPrice,
}: {
  ev: Evaluation;
  job: JobInput;
  settings: CostingSettings;
  tier: ChosenTier;
  setTier: (t: ChosenTier) => void;
  customPrice: number;
  setCustomPrice: (p: number) => void;
}) {
  const { cost, pricing } = ev;
  const total = cost.totalBatchCost;
  const m = ev.check.metrics;
  const Q = job.quantity;
  const tiers: TierKey[] = ["minimum", "standard", "premium"];

  return (
    <>
      <section className="rounded-[var(--radius-card)] border border-line bg-white">
        <div className="grid grid-cols-2 gap-4 border-b border-line p-5">
          <div>
            <p className="text-xs font-medium text-muted">Manufacturing cost per item</p>
            <p className="num mt-1 font-display text-3xl font-bold tracking-tight text-cost">{formatBDT(cost.unitCostExact, { decimals: true })}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Batch cost ({Q} items)</p>
            <p className="num mt-1 font-display text-3xl font-bold tracking-tight text-cost">{formatBDT(total)}</p>
          </div>
        </div>
        <div className="p-5">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-panel" aria-hidden>
            {cost.lines.map((l, i) => (l.amount > 0 ? <span key={l.key} style={{ width: `${(l.amount / total) * 100}%`, background: LINE_SHADES[i] }} /> : null))}
          </div>
          <ul className="mt-4 divide-y divide-line text-sm">
            {cost.lines.map((l, i) => (
              <li key={l.key} className="py-2">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-2.5">
                    <span className="size-2.5 shrink-0 rounded-sm" style={{ background: LINE_SHADES[i] }} aria-hidden />
                    <span className="flex-1">{l.label}</span>
                    <span className="num text-xs text-muted">{total > 0 ? formatPercent(l.amount / total, 0) : "—"}</span>
                    <span className="num w-24 text-right font-medium">{formatBDT(l.amount)}</span>
                  </summary>
                  <p className="mt-1.5 rounded-md bg-paper px-2.5 py-1.5 font-mono text-[0.7rem] leading-relaxed text-muted">{l.formula}</p>
                </details>
              </li>
            ))}
          </ul>
          <dl className="mt-3 grid grid-cols-3 gap-3 border-t border-line pt-3 text-xs text-muted">
            <div>
              <dt>Print jobs</dt>
              <dd className="num font-medium text-ink">{cost.quantities.plates}</dd>
            </div>
            <div>
              <dt>Expected filament</dt>
              <dd className="num font-medium text-ink">{roundHalfUp(cost.quantities.expectedTotalGrams, 1)} g</dd>
            </div>
            <div>
              <dt>Machine time</dt>
              <dd className="num font-medium text-ink">{roundHalfUp(cost.quantities.expectedMachineHours, 2)} h</dd>
            </div>
          </dl>
          {cost.separateDesignFee > 0 ? <p className="mt-3 text-xs text-muted">Separate design fee to invoice: <span className="font-medium text-ink">{formatBDT(cost.separateDesignFee)}</span></p> : null}
        </div>
      </section>

      {[...cost.warnings, ...pricing.warnings].map((w) => (
        <Alert key={w} tone="warn">
          {w}
        </Alert>
      ))}
      {cost.notes.length ? (
        <ul className="space-y-1 px-1 text-xs text-muted">
          {cost.notes.map((n) => (
            <li key={n}>· {n}</li>
          ))}
        </ul>
      ) : null}

      <section className="rounded-[var(--radius-card)] border border-line bg-white">
        <div className="border-b border-line px-5 py-3.5">
          <h2 className="font-display text-[0.95rem] font-semibold tracking-tight">Suggested prices (per item)</h2>
          <p className="mt-0.5 text-xs text-muted">
            Margin = profit ÷ price. Markup = profit ÷ cost. Fees {formatPercent(pricing.feeRate, 2)}
            {pricing.taxRate > 0 ? ` · ${settings.pricing.tax.label} ${formatPercent(pricing.taxRate)} ${settings.pricing.tax.mode === "inclusive" ? "included" : "added on top"}` : ""} · rounded up to ৳{settings.pricing.roundingStep || "0.01"}.
          </p>
        </div>
        <div className="grid gap-2 p-3 sm:grid-cols-3">
          {tiers.map((k) => (
            <TierCard key={k} t={pricing.tiers[k]} selected={tier === k} onSelect={() => setTier(k)} />
          ))}
        </div>
        <div className="border-t border-line p-5">
          <div className="flex items-end gap-3">
            <MoneyInput
              label="Your price (override)"
              value={customPrice}
              min={0}
              className="flex-1"
              onChange={(v) => {
                setCustomPrice(v);
                if (Number.isFinite(v) && v > 0) setTier("custom");
              }}
              hint="Type any price to see its profit and margin instantly"
            />
            {tier === "custom" ? (
              <Button variant="ghost" size="sm" className="mb-6" onClick={() => setTier("standard")}>
                Reset
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <ChosenPriceSummary ev={ev} job={job} settings={settings} />

      <details className="rounded-[var(--radius-card)] border border-line bg-white px-5 py-3.5 text-sm">
        <summary className="cursor-pointer font-medium">How each price was calculated</summary>
        <div className="mt-3 space-y-4">
          {tiers.map((k) => (
            <div key={k}>
              <p className="font-medium">{pricing.tiers[k].label}</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-xs text-muted">
                {pricing.tiers[k].steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
          ))}
          <p className="text-xs text-muted">
            Rates used: material {formatRate(cost.rates.materialPerGram, "g", 3)}, depreciation {formatRate(cost.rates.depreciationPerHour, "h")}, electricity {formatRate(cost.rates.electricityPerHour, "h")}, maintenance {formatRate(cost.rates.maintenancePerHour, "h")}, consumables {formatRate(cost.rates.consumablesPerHour, "h")}, overhead {formatRate(cost.rates.overheadRate, cost.rates.overheadBasis === "production_unit" ? "unit" : cost.rates.overheadBasis === "labor_hour" ? "labour h" : "machine h")}, failure {formatPercent(cost.rates.failureProbability)}.
          </p>
        </div>
      </details>
    </>
  );
}

function TierCard({ t, selected, onSelect }: { t: PriceTier; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} className={cn("rounded-xl border p-3 text-left transition-colors", selected ? "border-ink bg-ink text-paper" : "border-line hover:border-line-strong")}>
      <p className={cn("text-[0.7rem] font-medium", selected ? "text-paper/60" : "text-muted")}>{t.label}</p>
      <p className="num mt-1 font-display text-xl font-bold">{formatBDT(t.listPrice)}</p>
      <dl className={cn("mt-2 space-y-0.5 text-[0.7rem]", selected ? "text-paper/70" : "text-muted")}>
        <div className="flex justify-between">
          <dt>Profit</dt>
          <dd className={cn("num", !selected && t.profit > 0 && "text-profit")}>{formatBDT(t.profit, { decimals: true })}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Margin</dt>
          <dd className="num">{formatPercent(t.margin)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Markup</dt>
          <dd className="num">{formatPercent(t.markup)}</dd>
        </div>
      </dl>
    </button>
  );
}

function ChosenPriceSummary({ ev, job, settings }: { ev: Evaluation; job: JobInput; settings: CostingSettings }) {
  const m = ev.check.metrics;
  const Q = job.quantity;
  const status = ev.check.status;
  const recheck = checkChosenPrice(ev.chosenPrice, { unitCost: ev.cost.unitCostExact, quantity: Q, settings: settings.pricing, minimumListPrice: ev.pricing.tiers.minimum.listPrice });
  const tone = status === "ok" ? "profit" : status === "low_margin" ? "warn" : "loss";
  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[0.95rem] font-semibold tracking-tight">
          Selling at <span className="num">{formatBDT(ev.chosenPrice)}</span>
        </h2>
        <Badge tone={tone}>{status === "ok" ? "Healthy" : status === "low_margin" ? "Low margin" : status === "below_minimum" ? "Below minimum" : "Loss"}</Badge>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <Row label="Revenue per item (ex tax)" value={formatBDT(m.netPrice, { decimals: true })} />
        <Row label="Manufacturing cost" value={formatBDT(m.unitCost, { decimals: true })} cls="text-cost" />
        <Row label="Selling fees" value={formatBDT(m.fees, { decimals: true })} cls="text-cost" />
        <Row label="Profit per item" value={formatBDT(m.profit, { decimals: true })} cls={m.profit >= 0 ? "text-profit" : "text-loss"} strong />
        <Row label="Profit margin" value={formatPercent(m.margin)} strong />
        <Row label="Markup on cost" value={formatPercent(m.markup)} />
      </dl>
      <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-paper p-3 text-center text-xs">
        <div>
          <p className="text-muted">Batch revenue</p>
          <p className="num mt-0.5 font-display text-base font-semibold">{formatBDT(m.netPrice * Q)}</p>
        </div>
        <div>
          <p className="text-muted">Batch cost + fees</p>
          <p className="num mt-0.5 font-display text-base font-semibold text-cost">{formatBDT((m.unitCost + m.fees) * Q)}</p>
        </div>
        <div>
          <p className="text-muted">Batch profit</p>
          <p className={cn("num mt-0.5 font-display text-base font-semibold", m.profit >= 0 ? "text-profit" : "text-loss")}>{formatBDT(m.profit * Q)}</p>
        </div>
      </div>
      {m.tax > 0 ? <p className="mt-3 text-xs text-muted">{settings.pricing.tax.label} collected for the authorities: {formatBDT(m.tax * Q)} (not revenue).</p> : null}
      {recheck.warnings.map((w) => (
        <Alert key={w} tone={tone === "profit" ? "info" : tone} className="mt-3">
          {w}
        </Alert>
      ))}
    </section>
  );
}

function Row({ label, value, cls, strong }: { label: string; value: string; cls?: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-line pb-1.5">
      <dt className="text-muted">{label}</dt>
      <dd className={cn("num", strong && "font-semibold", cls)}>{value}</dd>
    </div>
  );
}
