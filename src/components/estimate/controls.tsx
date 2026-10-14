"use client";

import { useId } from "react";
import type { PublicCommonOptions } from "@/domain/estimator/public";
import { cn } from "../ui/cn";
import { Field, Input } from "../ui/field";

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  error,
  hint,
  tip,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  error?: string;
  hint?: string;
  tip?: string;
}) {
  return (
    <Field label={label} error={error} hint={hint ?? (min !== undefined && max !== undefined ? `${min}–${max}${suffix ? ` ${suffix}` : ""}` : undefined)} suffix={suffix} tip={tip}>
      {(p) => (
        <Input
          {...p}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? Number.NaN : Number(e.target.value))}
          className={cn("num", suffix && "pr-10")}
        />
      )}
    </Field>
  );
}

export function Stepper({ label, value, onChange, min, max, error }: { label: string; value: number; onChange: (n: number) => void; min: number; max: number; error?: string }) {
  const id = useId();
  return (
    <div>
      <p id={id} className="mb-1.5 text-[0.8rem] font-medium text-ink-2">
        {label}
      </p>
      <div role="group" aria-labelledby={id} className="inline-flex items-center rounded-full border border-line-strong bg-white">
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="grid size-9 place-items-center rounded-l-full hover:bg-panel disabled:opacity-30">
          −
        </button>
        <output aria-live="polite" className="num w-10 text-center text-sm font-medium">
          {value}
        </output>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="grid size-9 place-items-center rounded-r-full hover:bg-panel disabled:opacity-30">
          +
        </button>
      </div>
      {error ? <p className="mt-1 text-xs font-medium text-loss">{error}</p> : null}
    </div>
  );
}

export function Toggle({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <label htmlFor={id} className={cn("flex cursor-pointer items-start justify-between gap-4 rounded-xl border px-4 py-3 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink", checked ? "border-ink bg-white" : "border-line bg-white hover:border-line-strong")}>
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-muted">{description}</span> : null}
      </span>
      <input id={id} type="checkbox" role="switch" aria-checked={checked} checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden className={cn("relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-ink" : "bg-line-strong")}>
        <span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
      </span>
    </label>
  );
}

export function MaterialPicker({ materials, value, onChange, error }: { materials: PublicCommonOptions["materials"]; value: string; onChange: (k: string) => void; error?: string }) {
  return (
    <fieldset>
      <legend className="mb-2 text-[0.8rem] font-medium text-ink-2">Material</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {materials.map((m) => (
          <label
            key={m.key}
            className={cn(
              "cursor-pointer rounded-xl border px-4 py-3 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink",
              value === m.key ? "border-ink bg-white" : "border-line bg-white hover:border-line-strong",
            )}
          >
            <input type="radio" name="material" className="sr-only" checked={value === m.key} onChange={() => onChange(m.key)} />
            <span className="flex items-center justify-between text-sm font-medium">
              {m.label}
              <span aria-hidden className={cn("size-3.5 rounded-full border", value === m.key ? "border-[5px] border-ink" : "border-line-strong")} />
            </span>
            <span className="mt-0.5 block text-xs text-muted">{m.description}</span>
          </label>
        ))}
      </div>
      {error ? <p className="mt-1 text-xs font-medium text-loss">{error}</p> : null}
    </fieldset>
  );
}

/** Choose up to `max` colours; the number of chosen colours drives the colour count. */
export function ColorPicker({
  colors,
  value,
  onChange,
  max,
  error,
}: {
  colors: PublicCommonOptions["colors"];
  value: string[];
  onChange: (keys: string[]) => void;
  max: number;
  error?: string;
}) {
  const toggle = (k: string) => {
    if (value.includes(k)) {
      if (value.length > 1) onChange(value.filter((v) => v !== k));
    } else if (value.length < max) onChange([...value, k]);
  };
  return (
    <fieldset>
      <legend className="mb-2 text-[0.8rem] font-medium text-ink-2">
        Colours <span className="font-normal text-muted">· pick up to {max} ({value.length} selected)</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {colors.map((c) => {
          const on = value.includes(c.key);
          const order = value.indexOf(c.key);
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(c.key)}
              disabled={!on && value.length >= max}
              className={cn("flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors disabled:opacity-40", on ? "border-ink bg-white" : "border-line bg-white hover:border-line-strong")}
            >
              <span className="size-6 rounded-full border border-black/10" style={{ background: c.hex }} aria-hidden />
              {c.label}
              {on ? <span className="font-mono text-[0.65rem] text-muted">{order + 1}</span> : null}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-muted">Each extra colour needs a filament change, so it adds a little to the price.</p>
      {error ? <p className="mt-1 text-xs font-medium text-loss">{error}</p> : null}
    </fieldset>
  );
}

export function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-8 first:border-t-0 first:pt-0">
      <h2 className="flex items-baseline gap-3 font-display text-lg font-semibold tracking-tight">
        <span className="font-mono text-xs font-normal text-subtle">{String(step).padStart(2, "0")}</span>
        {title}
      </h2>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

export function TierHint({ tiers }: { tiers: PublicCommonOptions["quantityTiers"] }) {
  if (!tiers.length) return null;
  return (
    <p className="mt-2 text-xs text-muted">
      Order more, save more: {tiers.map((t) => `${t.minQty}+ pcs −${t.discountPercent}%`).join(" · ")}
    </p>
  );
}
