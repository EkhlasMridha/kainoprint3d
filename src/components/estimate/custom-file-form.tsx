"use client";

import { useState } from "react";
import type { PublicCommonOptions } from "@/domain/estimator/public";
import { Button } from "../ui/button";
import { Field, Input, Select, Textarea } from "../ui/field";
import { Alert, Spinner } from "../ui/primitives";
import { ContactFields, QuoteReceipt, submitQuote, type Receipt } from "./quote-request";

const ALLOWED = ["stl", "3mf", "obj"];

export function CustomFileForm({ common, disclaimer }: { common: PublicCommonOptions; disclaimer: string }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [fileName, setFileName] = useState("");

  if (receipt) {
    return (
      <div className="max-w-xl rounded-[var(--radius-card)] border border-line bg-white p-6 sm:p-8">
        <QuoteReceipt receipt={receipt} />
      </div>
    );
  }

  const validateFile = (f: File | null): string | null => {
    if (!f || f.size === 0) return "Please attach your STL, 3MF or OBJ file";
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED.includes(ext)) return "Only STL, 3MF or OBJ files can be quoted";
    if (f.size > common.maxUploadMb * 1024 * 1024) return `File is too large (max ${common.maxUploadMb} MB)`;
    return null;
  };

  return (
    <form
      noValidate
      className="grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-14"
      onSubmit={async (ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.currentTarget);
        const local: Record<string, string> = {};
        const fileErr = validateFile(fd.get("file") as File | null);
        if (fileErr) local.file = fileErr;
        if (String(fd.get("name") ?? "").trim().length < 2) local.name = "Please enter your name";
        if (!String(fd.get("email") ?? "").trim() && !String(fd.get("phone") ?? "").trim()) local.phone = "Enter an email or phone number so we can reply";
        const qty = Number(fd.get("quantity"));
        if (!Number.isInteger(qty) || qty < 1) local.quantity = "Enter a quantity of at least 1";
        if (Object.keys(local).length) {
          setErrors(local);
          return;
        }
        fd.set("kind", "custom_file");
        setPending(true);
        const r = await submitQuote(fd);
        setPending(false);
        if (r.ok) setReceipt(r.receipt);
        else setErrors(r.errors);
      }}
    >
      <div className="space-y-6">
        <Field label="3D model file" error={errors.file} hint={`STL, 3MF or OBJ · up to ${common.maxUploadMb} MB`}>
          {(p) => (
            <label htmlFor={p.id} className="flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-line-strong bg-white px-6 py-10 text-center transition-colors hover:border-ink has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink">
              <span className="font-display text-base font-semibold">{fileName || "Choose a file"}</span>
              <span className="mt-1 text-sm text-muted">{fileName ? "Click to choose a different file" : "Click to browse your computer or phone"}</span>
              <input
                {...p}
                name="file"
                type="file"
                accept=".stl,.3mf,.obj"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFileName(f?.name ?? "");
                  const err = validateFile(f);
                  setErrors((s) => {
                    const { file: _omit, ...rest } = s;
                    return err ? { ...rest, file: err } : rest;
                  });
                }}
              />
            </label>
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Approximate size" hint="e.g. 120 × 80 × 40 mm" error={errors.dimensions}>
            {(p) => <Input {...p} name="dimensions" maxLength={80} />}
          </Field>
          <Field label="Quantity" error={errors.quantity}>
            {(p) => <Input {...p} name="quantity" type="number" min={1} defaultValue={1} inputMode="numeric" />}
          </Field>
          <Field label="Material preference" error={errors.material}>
            {(p) => (
              <Select {...p} name="material" defaultValue="">
                <option value="">Recommend for me</option>
                {common.materials.map((m) => (
                  <option key={m.key} value={m.label}>
                    {m.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Colour" error={errors.color}>
            {(p) => (
              <Select {...p} name="color" defaultValue="">
                <option value="">No preference</option>
                {common.colors.map((c) => (
                  <option key={c.key} value={c.label}>
                    {c.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label="What will it be used for?" hint="Helps us choose strength, material and settings" error={errors.intendedUse}>
          {(p) => <Input {...p} name="intendedUse" maxLength={300} placeholder="e.g. replacement clip for a fan, outdoor use" />}
        </Field>
        <Field label="Special requirements" error={errors.requirements}>
          {(p) => <Textarea {...p} name="requirements" maxLength={1000} rows={3} placeholder="Tolerances, finish, strength, mating parts…" />}
        </Field>
        <Field label="Needed by (optional)" error={errors.desiredDate}>
          {(p) => <Input {...p} name="desiredDate" type="date" className="sm:w-56" />}
        </Field>
      </div>

      <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-[var(--radius-card)] border border-line bg-white p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold tracking-tight">Your details</h2>
          <div className="mt-4 space-y-4">
            <ContactFields errors={errors} />
            <Field label="Notes (optional)" error={errors.notes}>
              {(p) => <Textarea {...p} name="notes" rows={3} maxLength={2000} />}
            </Field>
            {errors._form ? <Alert tone="loss">{errors._form}</Alert> : null}
            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending ? <Spinner /> : null}
              {pending ? "Uploading…" : "Request a quote"}
            </Button>
          </div>
        </div>
        <div className="rounded-[var(--radius-card)] bg-panel p-5 text-sm leading-relaxed text-muted">
          <p className="font-medium text-ink">Why no instant price?</p>
          <p className="mt-1">
            Every model is different. We open your file, check that it&apos;s printable, choose the right settings and slice it to measure the exact material and
            printing time — then send you a confirmed price, usually within one working day.
          </p>
          <p className="mt-3 text-xs">{disclaimer}</p>
        </div>
      </div>
    </form>
  );
}
