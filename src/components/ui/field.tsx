import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "./cn";
import { InfoTip } from "./info-tip";

export const inputClass =
  "block w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-sm text-ink placeholder:text-subtle transition-colors focus:border-ink focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-ink/10 aria-[invalid=true]:border-loss disabled:bg-panel disabled:text-muted";

export function Field({
  label,
  hint,
  tip,
  error,
  children,
  className,
  suffix,
  id: idProp,
}: {
  label: ReactNode;
  hint?: ReactNode;
  tip?: string;
  error?: string;
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode;
  className?: string;
  suffix?: ReactNode;
  id?: string;
}) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-err` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-1.5 flex items-center gap-1.5">
        <label htmlFor={id} className="text-[0.8rem] font-medium text-ink-2">
          {label}
        </label>
        {tip ? <InfoTip text={tip} /> : null}
      </div>
      <div className="relative">
        {children({ id, "aria-invalid": !!error, "aria-describedby": describedBy })}
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted">{suffix}</span>
        ) : null}
      </div>
      {hint && !error ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-err`} className="mt-1 text-xs font-medium text-loss" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, "min-h-24 resize-y", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(inputClass, "appearance-none bg-[length:12px] bg-[right_0.75rem_center] bg-no-repeat pr-8", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%236b6b68' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")" }} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({ label, hint, className, ...props }: ComponentProps<"input"> & { label: ReactNode; hint?: ReactNode }) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <input id={props.id ?? id} type="checkbox" className="mt-0.5 size-4 shrink-0 rounded border-line-strong accent-ink" {...props} />
      <label htmlFor={props.id ?? id} className="text-sm leading-snug text-ink-2">
        {label}
        {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
      </label>
    </div>
  );
}
