"use client";

import { useRef, useState } from "react";
import type { QuoteKind } from "@/domain/quote";
import { formatPriceRange } from "@/domain/quote";
import { Button, buttonClass } from "../ui/button";
import { Field, Input, Textarea } from "../ui/field";
import { Alert, Spinner } from "../ui/primitives";

export interface Receipt {
  reference: string;
  title: string;
  summary: { label: string; value: string }[];
  quantity: number;
  low: number | null;
  high: number | null;
  needsReview: boolean;
  whatsappUrl: string | null;
  mailtoUrl: string | null;
  facebookUrl: string | null;
  message: string;
}

type SubmitResult = { ok: true; receipt: Receipt } | { ok: false; errors: Record<string, string> };

export async function submitQuote(fd: FormData): Promise<SubmitResult> {
  try {
    const res = await fetch("/api/quotes", { method: "POST", body: fd });
    if (res.status === 429) return { ok: false, errors: { _form: "Too many requests. Please wait a few minutes and try again." } };
    if (res.status === 413) return { ok: false, errors: { file: "The file is too large." } };
    return (await res.json()) as SubmitResult;
  } catch {
    return { ok: false, errors: { _form: "Network error. Please check your connection and try again." } };
  }
}

/** Contact fields + optional reference file + submit, for configured products/estimators. */
export function QuoteRequestForm({
  kind,
  config,
  productSlug,
  disabled,
  fileAccept = ".stl,.3mf,.obj,.png,.jpg,.jpeg,.webp,.pdf",
  fileLabel = "Reference file (optional)",
  fileHint,
  maxUploadMb,
  heading = "Request a final quote",
  intro = "We'll review your design and reply with a confirmed price. No payment needed now.",
  submitLabel = "Send quote request",
}: {
  heading?: string;
  intro?: string;
  submitLabel?: string;
  kind: QuoteKind;
  config: unknown;
  productSlug?: string;
  disabled?: boolean;
  fileAccept?: string;
  fileLabel?: string;
  fileHint?: string;
  maxUploadMb: number;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  if (receipt) return <QuoteReceipt receipt={receipt} />;

  return (
    <form
      ref={formRef}
      noValidate
      className="space-y-4"
      onSubmit={async (ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.currentTarget);
        const local: Record<string, string> = {};
        if (String(fd.get("name") ?? "").trim().length < 2) local.name = "Please enter your name";
        if (!String(fd.get("email") ?? "").trim() && !String(fd.get("phone") ?? "").trim()) local.phone = "Enter an email or phone number so we can reply";
        const file = fd.get("file");
        if (file instanceof File && file.size > maxUploadMb * 1024 * 1024) local.file = `File is too large (max ${maxUploadMb} MB)`;
        if (Object.keys(local).length) {
          setErrors(local);
          return;
        }
        fd.set("kind", kind);
        fd.set("config", JSON.stringify(config));
        if (productSlug) fd.set("productSlug", productSlug);
        setPending(true);
        const result = await submitQuote(fd);
        setPending(false);
        if (result.ok) setReceipt(result.receipt);
        else setErrors(result.errors);
      }}
    >
      <div>
        <h3 className="font-display text-lg font-semibold tracking-tight">{heading}</h3>
        <p className="mt-1 text-sm text-muted">{intro}</p>
      </div>
      <ContactFields errors={errors} />
      <Field label={fileLabel} hint={fileHint ?? `STL, 3MF, OBJ, PNG, JPG, WEBP or PDF · up to ${maxUploadMb} MB`} error={errors.file}>
        {(p) => <Input {...p} name="file" type="file" accept={fileAccept} className="file:mr-3 file:rounded-full file:border-0 file:bg-panel file:px-3 file:py-1 file:text-sm" />}
      </Field>
      <Field label="Notes (optional)" error={errors.notes}>
        {(p) => <Textarea {...p} name="notes" rows={3} maxLength={2000} placeholder="Anything else we should know — colours, deadline, occasion…" />}
      </Field>
      {errors._form ? <Alert tone="loss">{errors._form}</Alert> : null}
      {Object.keys(errors).some((k) => !["name", "email", "phone", "notes", "file", "_form"].includes(k)) ? (
        <Alert tone="loss">Please check your product options above.</Alert>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending || disabled}>
        {pending ? <Spinner /> : null}
        {pending ? "Sending…" : submitLabel}
      </Button>
    </form>
  );
}

export function ContactFields({ errors }: { errors: Record<string, string> }) {
  return (
    <>
      <Field label="Your name" error={errors.name}>
        {(p) => <Input {...p} name="name" autoComplete="name" required maxLength={80} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone / WhatsApp" error={errors.phone}>
          {(p) => <Input {...p} name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="01XXXXXXXXX" maxLength={20} />}
        </Field>
        <Field label="Email" error={errors.email} hint="Phone or email is enough">
          {(p) => <Input {...p} name="email" type="email" autoComplete="email" maxLength={120} />}
        </Field>
      </div>
    </>
  );
}

export function QuoteReceipt({ receipt }: { receipt: Receipt }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <div>
        <p className="eyebrow">Request received</p>
        <h3 className="mt-2 font-display text-2xl font-bold tracking-tight">Thank you!</h3>
        <p className="mt-1 text-sm text-muted">
          Your reference number is <span className="font-mono font-medium text-ink">{receipt.reference}</span>. Keep it handy when you contact us.
        </p>
      </div>
      <div className="rounded-xl bg-panel p-4 text-sm">
        <p className="font-medium">{receipt.title}</p>
        <dl className="mt-2 space-y-1">
          {receipt.summary.map((s) => (
            <div key={s.label} className="flex justify-between gap-4">
              <dt className="text-muted">{s.label}</dt>
              <dd className="text-right">{s.value}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Quantity</dt>
            <dd>{receipt.quantity}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-line pt-2 font-medium">
            <dt>Indicative price</dt>
            <dd className="num">{formatPriceRange(receipt.low, receipt.high)}</dd>
          </div>
        </dl>
      </div>
      <p className="text-xs leading-relaxed text-muted">
        This estimate is indicative. We&apos;ll confirm the final price after reviewing the design, material and print settings — usually within one working day.
      </p>
      <div className="flex flex-col gap-2">
        {receipt.whatsappUrl ? (
          <a href={receipt.whatsappUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "lg", "w-full")}>
            Continue on WhatsApp
          </a>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          {receipt.mailtoUrl ? (
            <a href={receipt.mailtoUrl} className={buttonClass("secondary", "md")}>
              Email us
            </a>
          ) : null}
          {receipt.facebookUrl ? (
            <a href={receipt.facebookUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "md")}>
              Facebook
            </a>
          ) : null}
        </div>
        <Button
          variant="ghost"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(receipt.message);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* clipboard unavailable */
            }
          }}
        >
          {copied ? "Copied ✓" : "Copy request details"}
        </Button>
      </div>
    </div>
  );
}
