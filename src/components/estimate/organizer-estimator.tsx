"use client";

import { useState } from "react";
import type { PublicCommonOptions, PublicOrganizerOptions } from "@/domain/estimator/public";
import { cn } from "../ui/cn";
import { Field, Input } from "../ui/field";
import { ColorPicker, MaterialPicker, NumberField, Section, Stepper, TierHint, Toggle } from "./controls";
import { EstimateSummary } from "./estimate-summary";
import { QuantityInput } from "./quantity-input";
import { QuoteRequestForm } from "./quote-request";
import { useEstimate } from "./use-estimate";

type Preset = PublicOrganizerOptions["presets"][number];

export function OrganizerEstimator({ options, common, disclaimer }: { options: PublicOrganizerOptions; common: PublicCommonOptions; disclaimer: string }) {
  const L = options.limits;
  const first = options.presets[0];
  const [preset, setPreset] = useState<string | undefined>(first?.key);
  const [width, setWidth] = useState(first?.width ?? 160);
  const [length, setLength] = useState(first?.length ?? 100);
  const [height, setHeight] = useState(first?.height ?? 50);
  const [compartments, setCompartments] = useState(first?.compartments ?? 3);
  const [penHolders, setPenHolders] = useState(first?.penHolders ?? 0);
  const [phoneStand, setPhoneStand] = useState(first?.phoneStand ?? false);
  const [drawers, setDrawers] = useState(first?.drawers ?? 0);
  const [cableManagement, setCableManagement] = useState(first?.cableManagement ?? false);
  const [material, setMaterial] = useState(common.materials[0]?.key ?? "pla");
  const [palette, setPalette] = useState<string[]>(() => common.colors.slice(1, 2).map((c) => c.key));
  const [customization, setCustomization] = useState<"none" | "text" | "logo">("none");
  const [customText, setCustomText] = useState("");
  const [designAssistance, setDesignAssistance] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const applyPreset = (p: Preset) => {
    setPreset(p.key);
    setWidth(p.width);
    setLength(p.length);
    setHeight(p.height);
    setCompartments(p.compartments);
    setPenHolders(p.penHolders);
    setPhoneStand(p.phoneStand);
    setDrawers(p.drawers);
    setCableManagement(p.cableManagement);
  };

  const config = {
    preset,
    width,
    length,
    height,
    compartments,
    penHolders,
    phoneStand,
    drawers,
    cableManagement,
    material,
    colors: palette.length,
    palette,
    quantity,
    customization,
    customText: customization === "text" ? customText : "",
    designAssistance,
  };
  const state = useEstimate("organizer", config);
  const e = state.errors;
  const hasErrors = Object.keys(e).length > 0;
  const activePreset = options.presets.find((p) => p.key === preset);
  const isModified =
    !!activePreset &&
    (activePreset.width !== width ||
      activePreset.length !== length ||
      activePreset.height !== height ||
      activePreset.compartments !== compartments ||
      activePreset.penHolders !== penHolders ||
      activePreset.phoneStand !== phoneStand ||
      activePreset.drawers !== drawers ||
      activePreset.cableManagement !== cableManagement);
  const colorHex = palette.map((k) => common.colors.find((c) => c.key === k)?.hex ?? "#ddd");

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-14">
      <div className="space-y-10">
        <Section step={1} title="Start from a design">
          <div className="grid gap-2 sm:grid-cols-2">
            {options.presets.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPreset(p)}
                aria-pressed={preset === p.key}
                className={cn("rounded-xl border bg-white px-4 py-3 text-left transition-colors", preset === p.key ? "border-ink" : "border-line hover:border-line-strong")}
              >
                <span className="flex items-center justify-between text-sm font-medium">
                  {p.name}
                  {preset === p.key && isModified ? <span className="text-[0.65rem] font-normal text-muted">customised</span> : null}
                </span>
                <span className="mt-0.5 block text-xs text-muted">{p.description}</span>
                <span className="mt-2 block font-mono text-[0.65rem] text-subtle">
                  {p.width}×{p.length}×{p.height} mm
                </span>
              </button>
            ))}
          </div>
          <OrganizerPreview width={width} length={length} compartments={compartments} penHolders={penHolders} phoneStand={phoneStand} drawers={drawers} color={colorHex[0] ?? "#f5f5f4"} />
        </Section>

        <Section step={2} title="Size">
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField label="Width" suffix="mm" value={width} onChange={setWidth} min={L.width.min} max={L.width.max} error={e.width} step={5} />
            <NumberField label="Depth" suffix="mm" value={length} onChange={setLength} min={L.length.min} max={L.length.max} error={e.length} step={5} />
            <NumberField label="Height" suffix="mm" value={height} onChange={setHeight} min={L.height.min} max={L.height.max} error={e.height} step={5} />
          </div>
          <p className="text-xs text-muted">Maximum {L.width.max} × {L.length.max} × {L.height.max} mm — the largest size we can print in one piece.</p>
        </Section>

        <Section step={3} title="Compartments & features">
          <div className="flex flex-wrap gap-8">
            <Stepper label="Compartments" value={compartments} onChange={setCompartments} min={1} max={L.maxCompartments} error={e.compartments} />
            <Stepper label="Pen holders" value={penHolders} onChange={setPenHolders} min={0} max={L.maxPenHolders} error={e.penHolders} />
            {L.maxDrawers > 0 ? <Stepper label="Drawers" value={drawers} onChange={setDrawers} min={0} max={L.maxDrawers} error={e.drawers} /> : null}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle label="Phone stand" description="Angled slot that fits most phones" checked={phoneStand} onChange={setPhoneStand} />
            <Toggle label="Cable management" description="Rear notch and clip for a charger cable" checked={cableManagement} onChange={setCableManagement} />
          </div>
        </Section>

        <Section step={4} title="Colours, material & personal touch">
          <ColorPicker colors={common.colors} value={palette} onChange={setPalette} max={L.maxColors} error={e.colors ?? e.palette} />
          <MaterialPicker materials={common.materials} value={material} onChange={setMaterial} error={e.material} />
          <fieldset>
            <legend className="mb-2 text-[0.8rem] font-medium text-ink-2">Custom text or logo</legend>
            <div className="flex flex-wrap gap-2">
              {(["none", "text", "logo"] as const).map((c) => (
                <button key={c} type="button" aria-pressed={customization === c} onClick={() => setCustomization(c)} className={cn("rounded-full border px-4 py-1.5 text-sm", customization === c ? "border-ink bg-ink text-paper" : "border-line-strong bg-white hover:border-ink")}>
                  {c === "none" ? "None" : c === "text" ? "Name / text" : "Logo"}
                </button>
              ))}
            </div>
          </fieldset>
          {customization === "text" ? (
            <Field label="Text to add" error={e.customText} hint="Up to 40 characters">
              {(p) => <Input {...p} value={customText} maxLength={40} onChange={(ev) => setCustomText(ev.target.value)} placeholder="e.g. Rahman & Co." />}
            </Field>
          ) : null}
          {customization === "logo" ? <p className="rounded-xl bg-panel px-4 py-3 text-sm text-muted">Attach your logo when you send the request below.</p> : null}
          <Toggle label="Design help" description="We'll help plan the layout for the things you want to store" checked={designAssistance} onChange={setDesignAssistance} />
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
          footer={<QuoteRequestForm kind="organizer" config={config} disabled={hasErrors} maxUploadMb={common.maxUploadMb} fileLabel={customization === "logo" ? "Your logo" : "Reference image or sketch (optional)"} />}
        />
      </div>
    </div>
  );
}

/** Top-down illustrative layout of the organizer. */
function OrganizerPreview({ width, length, compartments, penHolders, phoneStand, drawers, color }: { width: number; length: number; compartments: number; penHolders: number; phoneStand: boolean; drawers: number; color: string }) {
  const W = Number.isFinite(width) ? Math.min(Math.max(width, 40), 300) : 160;
  const Lh = Number.isFinite(length) ? Math.min(Math.max(length, 40), 300) : 100;
  const s = Math.min(380 / W, 170 / Lh);
  const w = W * s;
  const l = Lh * s;
  const featureCols = (penHolders > 0 ? 1 : 0) + (phoneStand ? 1 : 0);
  const featureW = featureCols ? Math.min(w * 0.3, 90) : 0;
  const gridW = w - featureW;
  const n = Math.max(1, Math.min(compartments, 12));
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const ox = 220 - w / 2;
  const oy = 110 - l / 2;
  const dark = /^#(0|1|2)/.test(color);
  const inner = dark ? "#2a2a2a" : "#e9e9e5";
  const stroke = dark ? "#000" : "#c9c9c4";
  return (
    <figure className="relative overflow-hidden rounded-[var(--radius-card)] bg-panel">
      <svg viewBox="0 0 440 220" className="w-full" role="img" aria-label={`Top view: ${compartments} compartments${penHolders ? `, ${penHolders} pen holders` : ""}${phoneStand ? ", phone stand" : ""}${drawers ? `, ${drawers} drawer(s)` : ""}`}>
        <rect x={ox} y={oy + 6} width={w} height={l} rx={10} fill="#000" opacity={0.12} />
        <rect x={ox} y={oy} width={w} height={l} rx={10} fill={color} stroke={stroke} />
        {Array.from({ length: n }).map((_, i) => {
          const c = i % cols;
          const r = Math.floor(i / cols);
          const rowCount = r === rows - 1 ? n - cols * (rows - 1) : cols;
          const cw = (gridW - 6) / rowCount;
          const ch = (l - 6) / rows;
          return <rect key={i} x={ox + 6 + c * cw} y={oy + 6 + r * ch} width={cw - 6} height={ch - 6} rx={6} fill={inner} />;
        })}
        {featureCols ? (
          <g>
            {penHolders > 0
              ? Array.from({ length: Math.min(penHolders, 4) }).map((_, i) => (
                  <circle key={i} cx={ox + gridW + featureW / 2} cy={oy + 18 + i * Math.min(26, (l - 30) / Math.max(penHolders, 1))} r={9} fill={inner} stroke={stroke} />
                ))
              : null}
            {phoneStand ? <rect x={ox + gridW + 4} y={oy + l - Math.min(40, l * 0.4) - 6} width={featureW - 10} height={Math.min(40, l * 0.4)} rx={4} fill={dark ? "#111" : "#d6d6d1"} /> : null}
          </g>
        ) : null}
        {drawers > 0 ? (
          <g>
            <rect x={ox + w * 0.25} y={oy + l - 2} width={w * 0.5} height={10} rx={3} fill="#111" />
            <text x={220} y={oy + l + 26} textAnchor="middle" fontSize={11} fill="#6b6b68" fontFamily="var(--font-mono-face), monospace">
              + {drawers} drawer{drawers > 1 ? "s" : ""} below
            </text>
          </g>
        ) : null}
      </svg>
      <figcaption className="absolute bottom-3 left-4 font-mono text-[0.65rem] uppercase tracking-widest text-muted">Top view · illustrative</figcaption>
    </figure>
  );
}
