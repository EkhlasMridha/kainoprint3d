"use client";

import { useState } from "react";
import { formatBDT } from "@/domain/money";
import type { PublicProduct } from "@/domain/product";
import { EstimateSummary } from "../estimate/estimate-summary";
import { QuoteRequestForm } from "../estimate/quote-request";
import { useEstimate } from "../estimate/use-estimate";
import { cn } from "../ui/cn";
import { Field, Input, Select } from "../ui/field";
import { QuantityInput } from "../estimate/quantity-input";

export function ProductConfigurator({ product, disclaimer, maxUploadMb }: { product: PublicProduct; disclaimer: string; maxUploadMb: number }) {
  const [size, setSize] = useState(product.sizeOptions[0]?.key);
  const [material, setMaterial] = useState(product.materialOptions[0]?.key);
  const [color, setColor] = useState(product.colors[0]);
  const [personalization, setPersonalization] = useState<Record<string, string>>(() =>
    Object.fromEntries(product.personalization.map((f) => [f.key, f.type === "select" ? (f.options[0] ?? "") : ""])),
  );
  const [quantity, setQuantity] = useState(1);
  const config = { size, material, color, personalization, quantity };
  const state = useEstimate("product", config, product.slug);
  const errors = state.errors;
  const unavailable = product.availability === "unavailable";

  return (
    <div className="space-y-8">
      <fieldset className="space-y-6" disabled={unavailable}>
        <legend className="sr-only">Customise your {product.name}</legend>

        {product.sizeOptions.length ? (
          <OptionGroup label="Size" error={errors.size}>
            {product.sizeOptions.map((o) => (
              <Choice key={o.key} name="size" checked={size === o.key} onChange={() => setSize(o.key)}>
                <span className="font-medium">{o.label}</span>
                <span className="block text-xs text-muted">{o.dimensions}</span>
                {o.priceDelta ? <span className="block text-xs text-muted">{o.priceDelta > 0 ? "+" : "−"}{formatBDT(Math.abs(o.priceDelta))}</span> : null}
              </Choice>
            ))}
          </OptionGroup>
        ) : null}

        {product.materialOptions.length ? (
          <OptionGroup label="Material" error={errors.material}>
            {product.materialOptions.map((o) => (
              <Choice key={o.key} name="material" checked={material === o.key} onChange={() => setMaterial(o.key)}>
                <span className="font-medium">{o.label}</span>
                {o.priceDelta ? <span className="block text-xs text-muted">+{formatBDT(o.priceDelta)}</span> : null}
              </Choice>
            ))}
          </OptionGroup>
        ) : null}

        {product.colors.length ? (
          <OptionGroup label="Colour" error={errors.color}>
            {product.colors.map((c) => (
              <Choice key={c} name="color" checked={color === c} onChange={() => setColor(c)} compact>
                {c}
              </Choice>
            ))}
          </OptionGroup>
        ) : null}

        {product.personalization.map((f) => (
          <Field key={f.key} label={`${f.label}${f.price ? ` (+${formatBDT(f.price)})` : ""}`} error={errors[`personalization.${f.key}`]} hint={f.type === "text" ? `Up to ${f.maxLength} characters` : undefined}>
            {(p) =>
              f.type === "select" ? (
                <Select {...p} value={personalization[f.key] ?? ""} onChange={(e) => setPersonalization((s) => ({ ...s, [f.key]: e.target.value }))}>
                  {f.options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </Select>
              ) : (
                <Input
                  {...p}
                  value={personalization[f.key] ?? ""}
                  maxLength={f.maxLength}
                  required={f.required}
                  onChange={(e) => setPersonalization((s) => ({ ...s, [f.key]: e.target.value }))}
                  placeholder={f.required ? "Required" : "Optional"}
                />
              )
            }
          </Field>
        ))}

        <QuantityInput value={quantity} onChange={setQuantity} max={product.maxQuantity} error={errors.quantity} />
      </fieldset>

      {unavailable ? (
        <p className="rounded-xl bg-loss-bg px-4 py-3 text-sm text-loss">This product is temporarily unavailable. Contact us for alternatives.</p>
      ) : (
        <EstimateSummary
          state={state}
          disclaimer={disclaimer}
          hasErrors={Object.keys(errors).length > 0}
          footer={<QuoteRequestForm kind="product" config={config} productSlug={product.slug} disabled={Object.keys(errors).length > 0} maxUploadMb={maxUploadMb} />}
        />
      )}
    </div>
  );
}

function OptionGroup({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-[0.8rem] font-medium text-ink-2">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
      {error ? <p className="mt-1 text-xs font-medium text-loss" role="alert">{error}</p> : null}
    </fieldset>
  );
}

export function Choice({ name, checked, onChange, children, compact }: { name: string; checked: boolean; onChange: () => void; children: React.ReactNode; compact?: boolean }) {
  return (
    <label
      className={cn(
        "cursor-pointer rounded-xl border text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
        compact ? "px-3.5 py-2" : "min-w-28 px-4 py-2.5",
        checked ? "border-ink bg-ink text-paper [&_.text-muted]:text-paper/60" : "border-line-strong bg-white hover:border-ink",
      )}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      {children}
    </label>
  );
}
