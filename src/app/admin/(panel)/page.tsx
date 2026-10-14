import Link from "next/link";
import { BarList } from "@/components/admin/bar-list";
import { CalcFilterBar } from "@/components/admin/calc-filters";
import { PageHeader } from "@/components/admin/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Badge, Card, CardHeader, EmptyState, Stat } from "@/components/ui/primitives";
import { formatBDT, formatPercent, roundHalfUp, roundToTaka } from "@/domain/money";
import { requireAdmin } from "@/server/auth/session";
import { loadDashboard } from "@/server/dashboard";
import { db } from "@/server/db";
import { parseCalcFilters } from "@/server/filters";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const filters = parseCalcFilters(await searchParams);
  const [d, printers, materials, products] = await Promise.all([
    loadDashboard(filters),
    db.printer.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.material.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const openQuotes = (d.quotes.new ?? 0) + (d.quotes.reviewing ?? 0) + (d.quotes.quoted ?? 0);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Projections use the latest saved calculation for each product × its expected monthly sales."
        actions={<ButtonLink href="/admin/calculator">New calculation</ButtonLink>}
      />
      <CalcFilterBar action="/admin" filters={filters} printers={printers} materials={materials} products={products} />

      {d.lines.length === 0 ? (
        <EmptyState title="No calculations yet" description="Save a cost calculation to see revenue, profit and utilisation projections here." action={<ButtonLink href="/admin/calculator">Create a calculation</ButtonLink>} />
      ) : (
        <div className="space-y-6">
          <Card className="grid grid-cols-2 gap-6 p-5 lg:grid-cols-4">
            <Stat label="Est. monthly revenue" value={formatBDT(roundToTaka(d.kpis.monthlyRevenue))} hint={`${d.kpis.totalUnits} units / month · ex tax`} />
            <Stat label="Est. monthly profit" value={formatBDT(roundToTaka(d.kpis.monthlyProfit))} tone={d.kpis.monthlyProfit >= 0 ? "profit" : "loss"} hint={`${formatPercent(d.kpis.margin)} blended margin`} />
            <Stat label="Avg. cost per item" value={formatBDT(roundToTaka(d.kpis.avgUnitCost))} tone="cost" hint="Weighted by monthly units" />
            <Stat label="Open quote requests" value={openQuotes} hint={<Link className="underline" href="/admin/quotes">{d.quotes.new ?? 0} new</Link>} />
          </Card>

          {d.warnings.length ? (
            <Alert tone="loss" title={`${d.warnings.length} product${d.warnings.length > 1 ? "s need" : " needs"} a price review`}>
              <ul className="mt-1 space-y-0.5">
                {d.warnings.map((w) => (
                  <li key={w.key}>
                    <Link href={`/admin/calculations/${w.calcId}`} className="underline">
                      {w.name}
                    </Link>{" "}
                    — {w.status === "loss" ? `selling at ${formatBDT(w.price)} is below cost (${formatBDT(w.unitCost)})` : w.status === "below_minimum" ? `${formatBDT(w.price)} is below the minimum sustainable price` : `margin ${formatPercent(w.margin)} is under your ${formatPercent(d.lowMarginThreshold, 0)} threshold`}
                  </li>
                ))}
              </ul>
            </Alert>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Most profitable products" description="Expected monthly profit (profit per item × monthly units)" />
              <div className="p-5">
                <BarList
                  caption="Expected monthly profit by product"
                  empty="Set expected monthly sales on your calculations to rank products."
                  items={d.mostProfitable.map((l) => ({
                    label: l.name,
                    value: l.monthlyProfit,
                    display: formatBDT(roundToTaka(l.monthlyProfit)),
                    detail: `${formatBDT(l.profitPerItem)} per item · ${formatPercent(l.margin)} margin · ${l.monthlyUnits}/month`,
                    tone: l.monthlyProfit < 0 ? "loss" : l.status === "low_margin" ? "warn" : "default",
                  }))}
                />
              </div>
            </Card>
            <Card>
              <CardHeader title="Printer utilisation" description="Planned machine hours vs. productive capacity per month" />
              <div className="p-5">
                <BarList
                  caption="Printer utilisation"
                  max={1}
                  empty="No active printers."
                  items={d.utilization.map((u) => ({
                    label: u.name,
                    value: Math.min(u.ratio, 1),
                    display: formatPercent(u.ratio, 0),
                    detail: `${roundHalfUp(u.hours, 1)} of ${u.capacity} h${u.ratio > 1 ? " — over capacity" : ""}`,
                    tone: u.ratio > 1 ? "loss" : u.ratio > 0.85 ? "warn" : "default",
                  }))}
                />
              </div>
            </Card>
            <Card>
              <CardHeader title="Material consumption" description="Projected filament per month, including expected failures" />
              <div className="p-5">
                <BarList
                  caption="Projected monthly filament use by material"
                  empty="No projected consumption — set expected monthly sales on your calculations."
                  items={d.materialUse.map((m) => ({ label: m.name, value: m.grams, display: `${roundHalfUp(m.grams / 1000, 2)} kg`, detail: `≈ ${roundHalfUp(m.spools, 1)} spools` }))}
                />
              </div>
            </Card>
            <Card>
              <CardHeader title="Recent calculations" action={<Link href="/admin/calculations" className="text-sm text-muted hover:text-ink">View all →</Link>} />
              <ul className="divide-y divide-line">
                {d.recent.map((c) => (
                  <li key={c.id}>
                    <Link href={`/admin/calculations/${c.id}`} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-paper">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{c.name}</span>
                        <span className="text-xs text-muted">{c.updatedAt.toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka" })} · {c.printer?.name ?? "—"}</span>
                      </span>
                      <span className="num shrink-0 text-right text-sm">
                        <span className="text-cost">{formatBDT(c.unitCost)}</span> → {formatBDT(c.chosenPrice)}
                        <span className={`block text-xs ${c.profitPerItem < 0 ? "text-loss" : "text-profit"}`}>{formatPercent(c.margin)} margin</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card>
            <CardHeader title="Saved products and latest estimates" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-line bg-paper text-left text-xs text-muted">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">Product</th>
                    <th className="px-3 py-2.5 text-right font-medium">Unit cost</th>
                    <th className="px-3 py-2.5 text-right font-medium">Price</th>
                    <th className="px-3 py-2.5 text-right font-medium">Profit / item</th>
                    <th className="px-3 py-2.5 text-right font-medium">Margin</th>
                    <th className="px-3 py-2.5 text-right font-medium">Units / month</th>
                    <th className="px-5 py-2.5 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {d.lines.map((l) => (
                    <tr key={l.key} className="hover:bg-paper/60">
                      <td className="px-5 py-2.5">
                        <Link href={`/admin/calculations/${l.calcId}`} className="font-medium hover:underline">
                          {l.name}
                        </Link>
                      </td>
                      <td className="num px-3 py-2.5 text-right text-cost">{formatBDT(l.unitCost)}</td>
                      <td className="num px-3 py-2.5 text-right">{formatBDT(l.price)}</td>
                      <td className={`num px-3 py-2.5 text-right ${l.profitPerItem < 0 ? "text-loss" : "text-profit"}`}>{formatBDT(l.profitPerItem)}</td>
                      <td className="num px-3 py-2.5 text-right">{formatPercent(l.margin)}</td>
                      <td className="num px-3 py-2.5 text-right">{l.monthlyUnits}</td>
                      <td className="px-5 py-2.5 text-right">
                        <Badge tone={l.status === "ok" ? "profit" : l.status === "low_margin" ? "warn" : "loss"}>
                          {l.status === "ok" ? "Healthy" : l.status === "low_margin" ? "Low margin" : l.status === "loss" ? "Below cost" : "Below minimum"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
