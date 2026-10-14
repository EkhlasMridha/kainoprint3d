"use client";

import { useEffect, useState } from "react";
import { roundHalfUp, takaToPoisha } from "@/domain/money";
import { cn } from "../../ui/cn";
import { Field, Input } from "../../ui/field";

/**
 * Controlled numeric input that keeps the user's raw text while typing (so "1." or "" are allowed)
 * and reports parsed numbers upward. NaN is reported for empty input so validation can flag it.
 */
function useNumericText(value: number, toDisplay: (v: number) => string) {
  const [text, setText] = useState(() => (Number.isFinite(value) ? toDisplay(value) : ""));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(Number.isFinite(value) ? toDisplay(value) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused]);
  return { text, setText, setFocused };
}

interface BaseProps {
  label: string;
  unit?: string;
  tip?: string;
  hint?: string;
  error?: string;
  min?: number;
  max?: number;
  step?: number | "any";
  placeholder?: string;
  className?: string;
}

export function NumInput({ value, onChange, ...p }: BaseProps & { value: number; onChange: (n: number) => void }) {
  const s = useNumericText(value, (v) => String(roundHalfUp(v, 4)));
  return (
    <RawNumber
      {...p}
      text={s.text}
      onFocus={() => s.setFocused(true)}
      onBlur={() => s.setFocused(false)}
      onText={(t) => {
        s.setText(t);
        onChange(t.trim() === "" ? Number.NaN : Number(t));
      }}
    />
  );
}

/** Money input: displays taka, stores integer poisha. */
export function MoneyInput({ value, onChange, ...p }: BaseProps & { value: number; onChange: (poisha: number) => void }) {
  const s = useNumericText(value, (v) => String(v / 100));
  return (
    <RawNumber
      unit="৳"
      step="any"
      {...p}
      text={s.text}
      onFocus={() => s.setFocused(true)}
      onBlur={() => s.setFocused(false)}
      onText={(t) => {
        s.setText(t);
        const n = Number(t);
        onChange(t.trim() === "" ? Number.NaN : Number.isFinite(n) ? takaToPoisha(n) : Number.NaN);
      }}
    />
  );
}

/** Percent input: displays %, stores a fraction. Optional `nullable` lets empty mean "use default". */
export function PercentInput({
  value,
  onChange,
  nullable = false,
  ...p
}: BaseProps & { value: number | null; onChange: (fraction: number | null) => void; nullable?: boolean }) {
  const s = useNumericText(value ?? Number.NaN, (v) => String(roundHalfUp(v * 100, 4)));
  return (
    <RawNumber
      unit="%"
      step="any"
      {...p}
      text={s.text}
      onFocus={() => s.setFocused(true)}
      onBlur={() => s.setFocused(false)}
      onText={(t) => {
        s.setText(t);
        if (t.trim() === "") onChange(nullable ? null : Number.NaN);
        else onChange(Number(t) / 100);
      }}
    />
  );
}

function RawNumber({
  label,
  unit,
  tip,
  hint,
  error,
  min,
  max,
  step = "any",
  placeholder,
  className,
  text,
  onText,
  onFocus,
  onBlur,
}: BaseProps & { text: string; onText: (t: string) => void; onFocus: () => void; onBlur: () => void }) {
  return (
    <Field label={label} tip={tip} hint={hint} error={error} suffix={unit} className={className}>
      {(fp) => (
        <Input
          {...fp}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          value={text}
          onFocus={onFocus}
          onBlur={onBlur}
          onChange={(e) => onText(e.target.value)}
          className={cn("num", unit && "pr-12")}
        />
      )}
    </Field>
  );
}

export function DurationInput({ hours, onChange, error, label, tip }: { hours: number; onChange: (h: number) => void; error?: string; label: string; tip?: string }) {
  const h = Number.isFinite(hours) ? Math.floor(hours) : Number.NaN;
  const m = Number.isFinite(hours) ? Math.round((hours - Math.floor(hours)) * 60) : Number.NaN;
  const set = (nh: number, nm: number) => onChange((Number.isFinite(nh) ? nh : 0) + (Number.isFinite(nm) ? nm : 0) / 60);
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 flex items-center gap-1.5 text-[0.8rem] font-medium text-ink-2">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        <NumInput label="Hours" unit="h" value={m === 60 ? h + 1 : h} min={0} step={1} onChange={(nh) => set(nh, m === 60 ? 0 : m)} />
        <NumInput label="Minutes" unit="min" value={m === 60 ? 0 : m} min={0} max={59} step={1} onChange={(nm) => set(h, nm)} />
      </div>
      {tip ? <p className="mt-1 text-xs text-muted">{tip}</p> : null}
      {error ? <p className="mt-1 text-xs font-medium text-loss">{error}</p> : null}
    </fieldset>
  );
}

export function Panel({ title, description, children, className }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[var(--radius-card)] border border-line bg-white", className)}>
      <div className="border-b border-line px-5 py-3.5">
        <h2 className="font-display text-[0.95rem] font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}
