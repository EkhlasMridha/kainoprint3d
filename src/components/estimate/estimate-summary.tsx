"use client";

import { formatBDT } from "@/domain/money";
import type { EstimateState } from "./use-estimate";
import { Spinner } from "../ui/primitives";
import { cn } from "../ui/cn";

export function EstimateSummary({
  state,
  disclaimer,
  hasErrors,
  footer,
}: {
  state: EstimateState;
  disclaimer: string;
  hasErrors: boolean;
  footer?: React.ReactNode;
}) {
  const e = state.estimate;
  const stale = hasErrors || state.loading;
  return (
    <section aria-labelledby="estimate-heading" className="rounded-[var(--radius-card)] border border-line bg-white">
      <div className="border-b border-line p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 id="estimate-heading" className="eyebrow">
            Estimated price
          </h2>
          {state.loading ? <Spinner className="text-subtle" /> : null}
        </div>
        <div aria-live="polite" className={cn("mt-3 transition-opacity", stale && "opacity-40")}>
          {e ? (
            <>
              <p className="num font-display text-4xl font-bold tracking-[-0.03em]">
                {e.low === e.high ? formatBDT(e.total) : `${formatBDT(e.low)} – ${formatBDT(e.high)}`}
              </p>
              <p className="mt-1.5 text-sm text-muted">
                {e.quantity} × {formatBDT(e.unitPrice)} each
                {e.low !== e.high ? <> · most likely around <span className="font-medium text-ink">{formatBDT(e.total)}</span></> : null}
              </p>
            </>
          ) : state.failed ? (
            <p className="text-sm text-loss">We couldn&apos;t calculate an estimate right now. You can still send your request.</p>
          ) : (
            <p className="h-10 w-48 animate-pulse rounded bg-panel" />
          )}
        </div>
        {hasErrors ? <p className="mt-2 text-xs font-medium text-loss">Fix the highlighted fields to update the price.</p> : null}
        {e?.needsReview ? (
          <p className="mt-3 inline-flex rounded-full bg-warn-bg px-3 py-1 text-xs font-medium text-warn">Preliminary — needs a quick design review</p>
        ) : null}
      </div>

      {e ? (
        <div className={cn("p-5 transition-opacity sm:p-6", stale && "opacity-40")}>
          <h3 className="text-sm font-medium">How it adds up</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {e.lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span className="text-muted">
                  {l.label}
                  {l.scope === "order" ? <span className="ml-1 text-xs text-subtle">(per order)</span> : null}
                </span>
                <span className={cn("num shrink-0", l.amount < 0 && "text-profit")}>{l.amount < 0 ? `−${formatBDT(-l.amount)}` : formatBDT(l.amount)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 text-sm">
            <div>
              <dt className="text-xs text-muted">Production time</dt>
              <dd className="mt-0.5 font-medium">
                {e.leadTimeDays.min}–{e.leadTimeDays.max} working days
              </dd>
            </div>
            {e.approxGrams > 0 ? (
              <div>
                <dt className="text-xs text-muted">Approx. weight</dt>
                <dd className="mt-0.5 font-medium">~{e.approxGrams} g</dd>
              </div>
            ) : null}
          </dl>
          {e.notes.length ? (
            <ul className="mt-4 space-y-1.5 text-xs leading-relaxed text-muted">
              {e.notes.map((n, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden>·</span>
                  {n}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <p className="border-t border-line bg-paper px-5 py-4 text-xs leading-relaxed text-muted sm:px-6">{disclaimer}</p>
      {footer ? <div className="border-t border-line p-5 sm:p-6">{footer}</div> : null}
    </section>
  );
}
