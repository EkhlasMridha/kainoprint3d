import { notFound } from "next/navigation";
import { PrintButton } from "@/components/admin/print-button";
import { PageHeader } from "@/components/admin/page-header";
import { Alert } from "@/components/ui/primitives";
import { formatBDT, formatPercent, formatRate, roundHalfUp } from "@/domain/money";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db";
import { getSetting } from "@/server/settings";
import { readStoredCalculation } from "@/server/stored-result";

export const metadata = { title: "Cost report" };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [calc, business] = await Promise.all([db.costCalculation.findUnique({ where: { id }, include: { product: true } }), getSetting("business")]);
  if (!calc) notFound();
  const stored = readStoredCalculation(calc);
  if (!stored) {
    return <Alert tone="loss">This calculation&apos;s stored data could not be read.</Alert>;
  }
  const { result, snapshot, job } = stored;
  const { cost, pricing } = result;
  const s = snapshot.settings;
  const tiers = [pricing.tiers.minimum, pricing.tiers.standard, pricing.tiers.premium];
  const date = calc.updatedAt.toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Dhaka" });

  return (
    <article className="mx-auto max-w-3xl print:max-w-none">
      <div className="no-print">
        <PageHeader title="Cost report" back={{ href: `/admin/calculations/${id}`, label: "Back to calculation" }} actions={<PrintButton />} />
      </div>
      <div className="print-plain rounded-[var(--radius-card)] border border-line bg-white p-8 print:border-0 print:p-0">
        <header className="flex items-start justify-between border-b border-line pb-5">
          <div>
            <p className="eyebrow">{business.name} · Manufacturing cost report</p>
            <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">{calc.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {calc.product ? `${calc.product.name} · ` : ""}Saved {date}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="text-muted">Unit cost</p>
            <p className="num font-display text-2xl font-bold">{formatBDT(cost.unitCostExact, { decimals: true })}</p>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
          <Info label="Printer" value={snapshot.printer.name} />
          <Info label="Material" value={snapshot.material.name} />
          <Info label="Batch quantity" value={`${job.quantity} (${cost.quantities.plates} print job${cost.quantities.plates > 1 ? "s" : ""})`} />
          <Info label="Print time / job" value={`${roundHalfUp(job.printHoursPerPlate, 2)} h`} />
          <Info label="Filament / job" value={`${roundHalfUp(cost.quantities.gramsPerPlate, 2)} g`} />
          <Info label="Failure rate" value={formatPercent(cost.rates.failureProbability)} />
          <Info label="Labour" value={`${roundHalfUp(cost.quantities.directLaborHours, 2)} h @ ${formatRate(cost.rates.laborRatePerHour, "h")}`} />
          <Info label="Overhead basis" value={cost.rates.overheadBasis.replace("_", " ")} />
        </section>

        <h2 className="mt-8 font-display font-semibold">Cost breakdown (batch)</h2>
        <table className="mt-3 w-full text-sm">
          <thead className="border-b border-line text-left text-xs text-muted">
            <tr>
              <th className="py-2 font-medium">Component</th>
              <th className="py-2 font-medium">Calculation</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {cost.lines.map((l) => (
              <tr key={l.key} className="border-b border-line align-top">
                <td className="py-2 pr-4 font-medium">{l.label}</td>
                <td className="py-2 pr-4 font-mono text-[0.7rem] leading-relaxed text-muted">{l.formula}</td>
                <td className="num py-2 text-right">{formatBDT(l.amount)}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="py-2">Total manufacturing cost</td>
              <td className="py-2 text-xs font-normal text-muted">÷ {job.quantity} sellable items = {formatBDT(cost.unitCostExact, { decimals: true })} per item</td>
              <td className="num py-2 text-right">{formatBDT(cost.totalBatchCost)}</td>
            </tr>
          </tbody>
        </table>
        {cost.separateDesignFee > 0 ? <p className="mt-2 text-xs text-muted">Design fee billed separately: {formatBDT(cost.separateDesignFee)}</p> : null}

        <h2 className="mt-8 font-display font-semibold">Pricing (per item)</h2>
        <table className="mt-3 w-full text-sm">
          <thead className="border-b border-line text-left text-xs text-muted">
            <tr>
              <th className="py-2 font-medium">Tier</th>
              <th className="py-2 text-right font-medium">Price</th>
              <th className="py-2 text-right font-medium">Fees</th>
              <th className="py-2 text-right font-medium">Profit</th>
              <th className="py-2 text-right font-medium">Margin</th>
              <th className="py-2 text-right font-medium">Markup</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((t) => (
              <tr key={t.key} className="border-b border-line">
                <td className="py-2">{t.label}</td>
                <td className="num py-2 text-right font-medium">{formatBDT(t.listPrice)}</td>
                <td className="num py-2 text-right">{formatBDT(t.fees, { decimals: true })}</td>
                <td className="num py-2 text-right">{formatBDT(t.profit, { decimals: true })}</td>
                <td className="num py-2 text-right">{formatPercent(t.margin)}</td>
                <td className="num py-2 text-right">{formatPercent(t.markup)}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="py-2 capitalize">Chosen ({calc.chosenTier})</td>
              <td className="num py-2 text-right">{formatBDT(calc.chosenPrice)}</td>
              <td className="num py-2 text-right">{formatBDT(result.check.metrics.fees, { decimals: true })}</td>
              <td className="num py-2 text-right">{formatBDT(result.check.metrics.profit, { decimals: true })}</td>
              <td className="num py-2 text-right">{formatPercent(result.check.metrics.margin)}</td>
              <td className="num py-2 text-right">{formatPercent(result.check.metrics.markup)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3 text-sm">
          Batch revenue {formatBDT(result.check.metrics.netPrice * job.quantity)} · batch profit{" "}
          <span className={result.check.metrics.profit >= 0 ? "text-profit" : "text-loss"}>{formatBDT(result.check.metrics.profit * job.quantity)}</span>
        </p>
        {result.check.warnings.map((w) => (
          <Alert key={w} tone="warn" className="mt-3">
            {w}
          </Alert>
        ))}

        <section className="mt-8 break-inside-avoid text-xs leading-relaxed text-muted">
          <h2 className="font-display text-sm font-semibold text-ink">Assumptions</h2>
          <p className="mt-1">
            Target margin {formatPercent(s.pricing.targetMargin)}, premium margin {formatPercent(s.pricing.premiumMargin)}, selling fees{" "}
            {s.pricing.percentFees.map((f) => `${f.label} ${formatPercent(f.rate, 2)}`).join(", ") || "none"}, tax {s.pricing.tax.mode === "none" ? "not applied" : `${s.pricing.tax.label} ${formatPercent(s.pricing.tax.rate)} (${s.pricing.tax.mode})`}, prices rounded up to ৳
            {s.pricing.roundingStep || "0.01"}. Material {formatRate(cost.rates.materialPerGram, "g", 3)}; machine: depreciation {formatRate(cost.rates.depreciationPerHour, "h")}, electricity {formatRate(cost.rates.electricityPerHour, "h")}, maintenance {formatRate(cost.rates.maintenancePerHour, "h")}, consumables {formatRate(cost.rates.consumablesPerHour, "h")}; overhead {formatRate(cost.rates.overheadRate, "unit of basis")}.
          </p>
          {[...cost.warnings, ...cost.notes].map((n) => (
            <p key={n} className="mt-1">
              · {n}
            </p>
          ))}
          {calc.notes ? <p className="mt-2">Notes: {calc.notes}</p> : null}
        </section>
      </div>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="font-medium ">{value}</p>
    </div>
  );
}
