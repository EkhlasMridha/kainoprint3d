import { BarList } from "@/components/admin/bar-list";
import { CalcFilterBar } from "@/components/admin/calc-filters";
import { PageHeader } from "@/components/admin/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader, Stat } from "@/components/ui/primitives";
import { formatBDT, formatPercent } from "@/domain/money";
import { QUOTE_STATUS_LABELS, QUOTE_STATUSES } from "@/domain/quote";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db";
import { calcWhere, dateRange, filtersToQuery, parseCalcFilters } from "@/server/filters";

export const metadata = { title: "Reports" };

const monthKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" }).slice(0, 7);

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const filters = parseCalcFilters(await searchParams);
  const range = dateRange(filters);
  const quoteWhere = range ? { createdAt: range } : {};
  const [quotes, calcs, printers, materials, products] = await Promise.all([
    db.quoteRequest.findMany({ where: quoteWhere, orderBy: { createdAt: "asc" } }),
    db.costCalculation.findMany({ where: calcWhere(filters), include: { product: { select: { name: true } } } }),
    db.printer.findMany({ select: { id: true, name: true } }),
    db.material.findMany({ select: { id: true, name: true } }),
    db.product.findMany({ select: { id: true, name: true } }),
  ]);

  const won = quotes.filter((q) => ["accepted", "in_production", "completed"].includes(q.status));
  const sales = won.reduce((s, q) => s + (q.finalPrice ?? q.estimateTotal ?? 0), 0);
  const byMonth = new Map<string, number>();
  for (const q of won) byMonth.set(monthKey(q.createdAt), (byMonth.get(monthKey(q.createdAt)) ?? 0) + (q.finalPrice ?? q.estimateTotal ?? 0));
  const decided = quotes.filter((q) => ["accepted", "in_production", "completed", "cancelled"].includes(q.status)).length;
  const conversion = decided ? won.length / decided : 0;

  const avgMargin = calcs.length ? calcs.reduce((s, c) => s + c.margin, 0) / calcs.length : 0;
  const avgCost = calcs.length ? calcs.reduce((s, c) => s + c.unitCost, 0) / calcs.length : 0;
  const totalGrams = calcs.reduce((s, c) => s + c.totalGrams, 0);
  const totalHours = calcs.reduce((s, c) => s + c.machineHours, 0);

  return (
    <>
      <PageHeader
        title="Sales & cost reports"
        description="Sales use the confirmed final price of accepted orders (or the indicative estimate where no final price was entered)."
        actions={
          <>
            <ButtonLink href="/api/admin/quotes/export" variant="secondary" size="sm" prefetch={false}>
              Quotes CSV
            </ButtonLink>
            <ButtonLink href={`/api/admin/calculations/export${filtersToQuery(filters)}`} variant="secondary" size="sm" prefetch={false}>
              Calculations CSV
            </ButtonLink>
          </>
        }
      />
      <CalcFilterBar action="/admin/reports" filters={filters} printers={printers} materials={materials} products={products} />
      <div className="space-y-6">
        <Card className="grid grid-cols-2 gap-6 p-5 lg:grid-cols-4">
          <Stat label="Confirmed sales" value={formatBDT(sales)} hint={`${won.length} accepted order(s)`} />
          <Stat label="Quote requests" value={quotes.length} hint={`${formatPercent(conversion, 0)} win rate on decided requests`} />
          <Stat label="Calculations" value={calcs.length} hint={`avg unit cost ${formatBDT(avgCost)}`} tone="cost" />
          <Stat label="Average margin" value={formatPercent(avgMargin)} hint="across saved calculations" tone={avgMargin >= 0 ? "profit" : "loss"} />
        </Card>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Confirmed sales by month" />
            <div className="p-5">
              <BarList
                caption="Confirmed sales by month"
                empty="No accepted orders in this period yet."
                items={[...byMonth.entries()].map(([m, v]) => ({ label: new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric" }), value: v, display: formatBDT(v) }))}
              />
            </div>
          </Card>
          <Card>
            <CardHeader title="Quote pipeline" />
            <div className="p-5">
              <BarList
                caption="Quote requests by status"
                empty="No quote requests in this period."
                items={QUOTE_STATUSES.map((s) => {
                  const list = quotes.filter((q) => q.status === s);
                  return { label: QUOTE_STATUS_LABELS[s], value: list.length, display: String(list.length), detail: list.length ? `indicative ${formatBDT(list.reduce((a, q) => a + (q.estimateTotal ?? 0), 0))}` : undefined };
                }).filter((i) => i.value > 0)}
              />
            </div>
          </Card>
        </div>
        <Card>
          <CardHeader title="Production planned in saved calculations" description="Totals of the batches costed in this period, including expected failures." />
          <dl className="grid grid-cols-2 gap-6 p-5 sm:grid-cols-3">
            <Stat label="Filament" value={`${(totalGrams / 1000).toFixed(2)} kg`} />
            <Stat label="Machine time" value={`${totalHours.toFixed(1)} h`} />
            <Stat label="Batch cost" value={formatBDT(calcs.reduce((s, c) => s + c.totalBatchCost, 0))} tone="cost" />
          </dl>
        </Card>
      </div>
    </>
  );
}
