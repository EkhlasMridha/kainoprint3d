"use client";

import { useMemo, useState } from "react";
import type { PublicCommonOptions, PublicKeychainOptions } from "@/domain/estimator/public";
import { cn } from "../ui/cn";
import { Field, Input, Select } from "../ui/field";
import { ColorPicker, MaterialPicker, NumberField, Section, TierHint, Toggle } from "./controls";
import { EstimateSummary } from "./estimate-summary";
import { QuantityInput } from "./quantity-input";
import { QuoteRequestForm } from "./quote-request";
import { useEstimate } from "./use-estimate";

const SIZE_PRESETS = [
  { label: "Small", width: 40, height: 15 },
  { label: "Standard", width: 55, height: 20 },
  { label: "Large", width: 75, height: 28 },
];

export function KeychainEstimator({
  options,
  common,
  disclaimer,
}: {
  options: PublicKeychainOptions;
  common: PublicCommonOptions;
  disclaimer: string;
}) {
  const L = options.limits;
  const [type, setType] = useState(options.types[0]?.key ?? "text");
  const [text, setText] = useState("Nusrat");
  const [width, setWidth] = useState(55);
  const [height, setHeight] = useState(20);
  const [thickness, setThickness] = useState(4);
  const [palette, setPalette] = useState<string[]>(() => common.colors.slice(0, 2).map((c) => c.key));
  const [material, setMaterial] = useState(common.materials[0]?.key ?? "pla");
  const [hardware, setHardware] = useState(options.hardware[0]?.key ?? "");
  const [doubleSided, setDoubleSided] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [designAssistance, setDesignAssistance] = useState(false);
  const [rush, setRush] = useState(false);

  const config = {
    type,
    text: type === "text" ? text : "",
    width,
    height,
    thickness,
    colors: palette.length,
    palette,
    material,
    hardware,
    doubleSided,
    quantity,
    designAssistance,
    rush,
  };
  const state = useEstimate("keychain", config);
  const e = state.errors;
  const typeInfo = options.types.find((t) => t.key === type);
  const hasErrors = Object.keys(e).length > 0;
  const colorHex = useMemo(() => palette.map((k) => common.colors.find((c) => c.key === k)?.hex ?? "#111"), [palette, common.colors]);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-14">
      <div className="space-y-10">
        <KeychainPreview type={type} text={text} width={width} height={height} colors={colorHex} />

        <Section step={1} title="Choose a style">
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Keychain style">
            {options.types.map((t) => (
              <label key={t.key} className={cn("cursor-pointer rounded-xl border bg-white px-4 py-3 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink", type === t.key ? "border-ink" : "border-line hover:border-line-strong")}>
                <input type="radio" name="type" className="sr-only" checked={type === t.key} onChange={() => setType(t.key as typeof type)} />
                <span className="flex items-center justify-between text-sm font-medium">
                  {t.label}
                  {t.needsReview ? <span className="text-[0.65rem] font-normal text-warn">needs review</span> : null}
                </span>
                <span className="mt-0.5 block text-xs text-muted">{t.description}</span>
              </label>
            ))}
          </div>
          {type === "text" ? (
            <Field label="Name or text" error={e.text} hint={`${text.length}/${L.maxTextLength} characters`}>
              {(p) => <Input {...p} value={text} maxLength={L.maxTextLength} onChange={(ev) => setText(ev.target.value)} placeholder="e.g. Nusrat" />}
            </Field>
          ) : (
            <p className="rounded-xl bg-panel px-4 py-3 text-sm text-muted">
              {type === "logo"
                ? "You can attach your logo (PNG, JPG or PDF) when you send the request below. We'll prepare the 3D design and confirm the price."
                : "Describe your idea in the notes or attach a sketch when you send the request below."}
            </p>
          )}
        </Section>

        <Section step={2} title="Size">
          <div className="flex flex-wrap gap-2">
            {SIZE_PRESETS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => {
                  setWidth(s.width);
                  setHeight(s.height);
                }}
                aria-pressed={width === s.width && height === s.height}
                className={cn("rounded-full border px-3.5 py-1.5 text-sm", width === s.width && height === s.height ? "border-ink bg-ink text-paper" : "border-line-strong bg-white hover:border-ink")}
              >
                {s.label} <span className="opacity-60">{s.width}×{s.height} mm</span>
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField label="Width" suffix="mm" value={width} onChange={setWidth} min={L.width.min} max={L.width.max} error={e.width} />
            <NumberField label="Height" suffix="mm" value={height} onChange={setHeight} min={L.height.min} max={L.height.max} error={e.height} />
            <NumberField label="Thickness" suffix="mm" value={thickness} onChange={setThickness} min={L.thickness.min} max={L.thickness.max} step={0.5} error={e.thickness} tip="3–5 mm is sturdy for everyday keys. Thicker keychains use more material." />
          </div>
        </Section>

        <Section step={3} title="Colours & material">
          <ColorPicker colors={common.colors} value={palette} onChange={setPalette} max={L.maxColors} error={e.colors ?? e.palette} />
          <MaterialPicker materials={common.materials} value={material} onChange={setMaterial} error={e.material} />
        </Section>

        <Section step={4} title="Finishing">
          <Field label="Key ring" error={e.hardware}>
            {(p) => (
              <Select {...p} value={hardware} onChange={(ev) => setHardware(ev.target.value)}>
                {options.hardware.map((h) => (
                  <option key={h.key} value={h.key}>
                    {h.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle label="Double-sided" description="Design printed on both sides" checked={doubleSided} onChange={setDoubleSided} />
            <Toggle label="Design help" description="We'll refine the design with you" checked={designAssistance} onChange={setDesignAssistance} />
            <Toggle label="Rush order" description={`Ready in ${common.rushLeadTimeDays.min}–${common.rushLeadTimeDays.max} days`} checked={rush} onChange={setRush} />
          </div>
        </Section>

        <Section step={5} title="Quantity">
          <div>
            <QuantityInput value={quantity} onChange={setQuantity} max={L.maxQuantity} error={e.quantity} />
            <TierHint tiers={common.quantityTiers} />
          </div>
        </Section>
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <EstimateSummary
          state={state}
          disclaimer={disclaimer}
          hasErrors={hasErrors}
          footer={
            <QuoteRequestForm
              kind="keychain"
              config={config}
              disabled={hasErrors}
              maxUploadMb={common.maxUploadMb}
              fileLabel={type === "logo" ? "Your logo" : "Reference image (optional)"}
              fileHint={typeInfo?.needsReview ? `PNG, JPG, WEBP or PDF · up to ${common.maxUploadMb} MB` : undefined}
              fileAccept=".png,.jpg,.jpeg,.webp,.pdf,.stl,.3mf,.obj"
            />
          }
        />
      </div>
    </div>
  );
}

/** Proportional illustrative preview — not an exact render of the final design. */
function KeychainPreview({ type, text, width, height, colors }: { type: string; text: string; width: number; height: number; colors: string[] }) {
  const w = Number.isFinite(width) ? Math.min(Math.max(width, 20), 120) : 55;
  const h = Number.isFinite(height) ? Math.min(Math.max(height, 10), 80) : 20;
  const scale = Math.min(300 / w, 150 / h);
  const pw = w * scale;
  const ph = h * scale;
  const plate = colors[0] ?? "#111";
  const accent = colors[1] ?? (plate.toLowerCase() === "#f5f5f4" ? "#111111" : "#f5f5f4");
  const label = type === "text" ? text || "Your name" : type === "logo" ? "LOGO" : type === "shape" ? "★" : "?";
  const fontSize = Math.min(ph * 0.55, (pw - ph * 0.9) / Math.max(label.length * 0.62, 1));
  return (
    <figure className="layer-lines relative flex aspect-[16/8] items-center justify-center overflow-hidden rounded-[var(--radius-card)] bg-panel">
      <svg viewBox="0 0 440 220" className="h-full w-full" role="img" aria-label={`Preview: ${label} keychain, ${w} by ${h} millimetres`}>
        <g transform={`translate(${220 - pw / 2 + 18} ${110 - ph / 2})`}>
          <circle cx={-14} cy={ph / 2} r={Math.min(22, ph * 0.5)} fill="none" stroke="#a5a5a0" strokeWidth={5} />
          <rect x={0} y={6} width={pw} height={ph} rx={Math.min(ph / 2, 26)} fill="#000" opacity={0.18} />
          <rect x={0} y={0} width={pw} height={ph} rx={Math.min(ph / 2, 26)} fill={plate} stroke="#00000014" />
          <circle cx={ph * 0.32} cy={ph / 2} r={Math.max(4, ph * 0.1)} fill="#ebebe7" />
          <text x={ph * 0.6 + (pw - ph * 0.6) / 2} y={ph / 2} dominantBaseline="central" textAnchor="middle" fontFamily="var(--font-inter-tight), Arial Black, sans-serif" fontWeight={800} fontSize={Math.max(fontSize, 8)} fill={accent}>
            {label}
          </text>
        </g>
      </svg>
      <figcaption className="absolute bottom-3 left-4 font-mono text-[0.65rem] uppercase tracking-widest text-muted">Illustrative preview · {w} × {h} mm</figcaption>
    </figure>
  );
}
