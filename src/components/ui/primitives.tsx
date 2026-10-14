import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-[var(--radius-card)] border border-line bg-white", className)} {...props} />;
}

export function CardHeader({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4", className)}>
      <div className="min-w-0">
        <h2 className="font-display text-[0.98rem] font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

type Tone = "neutral" | "dark" | "profit" | "loss" | "warn" | "outline";

const tones: Record<Tone, string> = {
  neutral: "bg-panel text-ink-2",
  dark: "bg-ink text-paper",
  profit: "bg-profit-bg text-profit",
  loss: "bg-loss-bg text-loss",
  warn: "bg-warn-bg text-warn",
  outline: "border border-line-strong text-ink-2",
};

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)} {...props} />;
}

export function Alert({ tone = "warn", title, children, className }: { tone?: "warn" | "loss" | "info" | "profit"; title?: ReactNode; children?: ReactNode; className?: string }) {
  const styles = {
    warn: "border-warn/25 bg-warn-bg text-warn",
    loss: "border-loss/25 bg-loss-bg text-loss",
    info: "border-line bg-panel text-ink-2",
    profit: "border-profit/25 bg-profit-bg text-profit",
  }[tone];
  return (
    <div role={tone === "loss" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-sm", styles, className)}>
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={cn(!!title && "mt-0.5", "leading-relaxed")}>{children}</div> : null}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-line-strong px-6 py-14 text-center">
      <div className="mb-3 grid size-10 place-items-center rounded-full bg-panel text-muted" aria-hidden>
        <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 7l7-4 7 4-7 4-7-4zM3 7v6l7 4 7-4V7" />
        </svg>
      </div>
      <p className="font-display font-semibold">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: ReactNode; value: ReactNode; hint?: ReactNode; tone?: "profit" | "loss" | "cost" }) {
  const color = tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : tone === "cost" ? "text-cost" : "text-ink";
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={cn("num mt-1 truncate font-display text-2xl font-semibold tracking-tight", color)}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, description, className, align = "left" }: { eyebrow?: string; title: ReactNode; description?: ReactNode; className?: string; align?: "left" | "center" }) {
  return (
    <div className={cn(align === "center" && "mx-auto text-center", "max-w-2xl", className)}>
      {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
      <h2 className="font-display text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">{title}</h2>
      {description ? <p className="mt-4 text-base leading-relaxed text-muted text-pretty">{description}</p> : null}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("size-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
