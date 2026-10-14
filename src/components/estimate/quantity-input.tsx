"use client";

import { useId } from "react";

export function QuantityInput({ value, onChange, max, error, label = "Quantity" }: { value: number; onChange: (n: number) => void; max: number; error?: string; label?: string }) {
  const id = useId();
  const clamp = (n: number) => Math.max(1, Math.min(max, Math.round(n) || 1));
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[0.8rem] font-medium text-ink-2">
        {label}
      </label>
      <div className="inline-flex items-center rounded-full border border-line-strong bg-white">
        <button type="button" aria-label="Decrease quantity" className="grid size-10 place-items-center rounded-l-full text-lg hover:bg-panel disabled:opacity-30" disabled={value <= 1} onClick={() => onChange(clamp(value - 1))}>
          −
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={1}
          max={max}
          value={value}
          aria-invalid={!!error}
          onChange={(e) => onChange(Number(e.target.value))}
          onBlur={(e) => onChange(clamp(Number(e.target.value)))}
          className="num w-16 border-x border-line bg-transparent py-2 text-center text-sm focus:outline-none"
        />
        <button type="button" aria-label="Increase quantity" className="grid size-10 place-items-center rounded-r-full text-lg hover:bg-panel disabled:opacity-30" disabled={value >= max} onClick={() => onChange(clamp(value + 1))}>
          +
        </button>
      </div>
      {error ? <p className="mt-1 text-xs font-medium text-loss" role="alert">{error}</p> : null}
    </div>
  );
}
