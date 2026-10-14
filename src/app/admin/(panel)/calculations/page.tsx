import Link from "next/link";
import { CalcFilterBar } from "@/components/admin/calc-filters";
import { PageHeader, Table } from "@/components/admin/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { formatBDT, formatPercent } from "@/domain/money";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db";
import { calcWhere, filtersToQuery, parseCalcFilters } from "@/server/filters";
import { getSetting } from "@/server/settings";

export const metadata = { title: "Saved calculations" };

export default async function CalculationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const filters = parseCalcFilters(await searchParams);
  const [calcs, printers, materials, products, costing] = await Promise.all([
    db.costCalculation.findMany({
      where: calcWhere(filters),
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { printer: { select: { name: true } }, material: { select: { name: true } }, product: { select: { name: true } } },
    }),
    db.printer.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.material.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    getSetting("costing"),
  ]);
  const low = costing.pricing.lowMarginThreshold;

  return (
    <>
      <PageHeader
        title="Saved calculations"
        description="Every saved calculation keeps a snapshot of the costs used, so past figures stay auditable when prices change."
        actions={
          <>
            <ButtonLink href={`/api/admin/calculations/export${filtersToQuery(filters)}`} variant="secondary" prefetch={false}>
              Export CSV
            </ButtonLink>
            <ButtonLink href="/admin/calculator">New calculation</ButtonLink>
          </>
        }
      />
      <CalcFilterBar action="/admin/calculations" filters={filters} printers={printers} materials={materials} products={products} />
      {calcs.length === 0 ? (
        <EmptyState title="No calculations found" description="Try different filters, or create your first cost calculation." action={<ButtonLink href="/admin/calculator">New calculation</ButtonLink>} />
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Calculation</th>
              <th>Printer / material</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Unit cost</th>
              <th className="text-right">Price</th>
              <th className="text-right">Profit / item</th>
              <th className="text-right">Margin</th>
              <th>Saved</th>
            </tr>
          </thead>
          <tbody>
            {calcs.map((c) => {
              const tone = c.profitPerItem < 0 || c.chosenPrice < c.minimumPrice ? "loss" : c.margin < low ? "warn" : null;
              return (
                <tr key={c.id}>
                  <td>
                    <Link href={`/admin/calculations/${c.id}`} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                    {c.product ? <span className="block text-xs text-muted">{c.product.name}</span> : null}
                  </td>
                  <td className="text-xs text-muted">
                    {c.printer?.name ?? "—"}
                    <br />
                    {c.material?.name ?? "—"}
                  </td>
                  <td className="num text-right">{c.quantity}</td>
                  <td className="num text-right">{formatBDT(c.unitCost)}</td>
                  <td className="num text-right font-medium">
                    {formatBDT(c.chosenPrice)}
                    <span className="block text-[0.68rem] font-normal capitalize text-muted">{c.chosenTier}</span>
                  </td>
                  <td className={`num text-right ${c.profitPerItem < 0 ? "text-loss" : "text-profit"}`}>{formatBDT(c.profitPerItem)}</td>
                  <td className="num text-right">
                    {formatPercent(c.margin)}
                    {tone ? (
                      <Badge tone={tone} className="ml-2">
                        {c.profitPerItem < 0 ? "loss" : tone === "loss" ? "below min." : "low"}
                      </Badge>
                    ) : null}
                  </td>
                  <td className="text-xs text-muted">{c.createdAt.toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka" })}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}
