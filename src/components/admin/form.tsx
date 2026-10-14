"use client";

import { createContext, startTransition, useActionState, useContext, type ComponentProps, type ReactNode } from "react";
import type { ActionState } from "@/server/form-data";
import { Button } from "../ui/button";
import { cn } from "../ui/cn";
import { Checkbox, Field, Input, Select, Textarea } from "../ui/field";
import { Alert, Spinner } from "../ui/primitives";

const ErrorsContext = createContext<Record<string, string>>({});
const useFieldError = (name: string) => useContext(ErrorsContext)[name];

/**
 * Server-action form with inline field errors. The action validates on the server (Zod) and
 * returns `{ errors: { fieldName: message } }`; browser validation attributes give instant feedback.
 */
export function ActionForm({
  action,
  children,
  submitLabel = "Save",
  className,
  footer,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel?: string;
  className?: string;
  footer?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, { ok: false });
  const errors = state.errors ?? {};
  return (
    <ErrorsContext.Provider value={errors}>
      <form
        onSubmit={(e) => {
          // Dispatch manually (instead of `action=`) so React does not reset the form —
          // the owner keeps their input when the server reports validation errors.
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => formAction(fd));
        }}
        className={cn("space-y-8", className)}
      >
        {children}
        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-paper/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-5">
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null}
            {submitLabel}
          </Button>
          {footer}
          <div aria-live="polite" className="text-sm">
            {state.ok && state.message ? <span className="text-profit">{state.message}</span> : null}
            {!state.ok && (state.message || Object.keys(errors).length) ? (
              <span className="text-loss">{state.message ?? "Please fix the highlighted fields."}</span>
            ) : null}
          </div>
        </div>
      </form>
    </ErrorsContext.Provider>
  );
}

export function FormSection({ title, description, children, columns = 2 }: { title: string; description?: ReactNode; children: ReactNode; columns?: 1 | 2 | 3 }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-white">
      <div className="border-b border-line px-5 py-4">
        <h2 className="font-display font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
      </div>
      <div className={cn("grid gap-5 p-5", columns === 2 && "sm:grid-cols-2", columns === 3 && "sm:grid-cols-2 lg:grid-cols-3")}>{children}</div>
    </section>
  );
}

type InputProps = Omit<ComponentProps<"input">, "name"> & { name: string; label: string; hint?: string; tip?: string; suffix?: string; className?: string };

export function TextF({ name, label, hint, tip, suffix, className, ...rest }: InputProps) {
  const error = useFieldError(name);
  return (
    <Field label={label} hint={hint} tip={tip} error={error} suffix={suffix} className={className}>
      {(p) => <Input {...p} {...rest} name={name} className={suffix ? "pr-14" : undefined} />}
    </Field>
  );
}

/** Numeric field. `unit` is shown inside the input (e.g. ৳, %, h, W, g). */
export function NumF({ name, label, hint, tip, unit, className, step = "any", ...rest }: Omit<InputProps, "suffix"> & { unit?: string }) {
  const error = useFieldError(name);
  return (
    <Field label={label} hint={hint} tip={tip} error={error} suffix={unit} className={className}>
      {(p) => <Input {...p} {...rest} name={name} type="number" inputMode="decimal" step={step} className={cn("num", unit && "pr-14")} />}
    </Field>
  );
}

export function SelectF({ name, label, hint, tip, options, defaultValue, className }: { name: string; label: string; hint?: string; tip?: string; options: { value: string; label: string }[]; defaultValue?: string; className?: string }) {
  const error = useFieldError(name);
  return (
    <Field label={label} hint={hint} tip={tip} error={error} className={className}>
      {(p) => (
        <Select {...p} name={name} defaultValue={defaultValue}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

export function TextareaF({ name, label, hint, defaultValue, rows = 3, className, maxLength }: { name: string; label: string; hint?: string; defaultValue?: string; rows?: number; className?: string; maxLength?: number }) {
  const error = useFieldError(name);
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {(p) => <Textarea {...p} name={name} defaultValue={defaultValue} rows={rows} maxLength={maxLength} />}
    </Field>
  );
}

export function CheckF({ name, label, hint, defaultChecked, className }: { name: string; label: string; hint?: string; defaultChecked?: boolean; className?: string }) {
  const error = useFieldError(name);
  return (
    <div className={className}>
      <Checkbox name={name} label={label} hint={hint} defaultChecked={defaultChecked} />
      {error ? <p className="mt-1 text-xs font-medium text-loss">{error}</p> : null}
    </div>
  );
}

export function FormError({ name }: { name: string }) {
  const error = useFieldError(name);
  return error ? <Alert tone="loss">{error}</Alert> : null;
}

/** First error whose field path starts with `prefix` (for JSON row editors, e.g. "sizeOptions.2.key"). */
export function usePrefixError(prefix: string): string | undefined {
  const errors = useContext(ErrorsContext);
  const hit = Object.entries(errors).find(([k]) => k === prefix || k.startsWith(`${prefix}.`));
  if (!hit) return undefined;
  const row = hit[0].split(".")[1];
  return row && /^\d+$/.test(row) ? `Row ${Number(row) + 1}: ${hit[1]}` : hit[1];
}

export function PrefixError({ prefix }: { prefix: string }) {
  const error = usePrefixError(prefix);
  return error ? <p className="text-xs font-medium text-loss">{error}</p> : null;
}
