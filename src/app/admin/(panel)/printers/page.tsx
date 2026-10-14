import Link from "next/link";
import { PageHeader, Table } from "@/components/admin/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { consumablesPerHour, depreciationPerHour, electricityPerHour, maintenancePerHour, printerOverheadPerHour } from "@/domain/costing/rates";
import { formatBDT, formatPercent, formatRate } from "@/domain/money";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db";
import { toPrinterProfile } from "@/server/profiles";
import { getSetting } from "@/server/settings";

export const metadata = { title: "Printers" };

function safe(fn: () => number): number | null {
  try {
    return fn();
  } catch {
    return null;
  }
}

export default async function PrintersPage() {
  await requireAdmin();
  const [printers, costing] = await Promise.all([db.printer.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }), getSetting("costing")]);
  const activeHours = printers.filter((p) => p.active).reduce((s, p) => s + p.monthlyProductiveHours, 0);

  return (
    <>
      <PageHeader
        title="Printers"
        description="Each printer carries its own depreciation, electricity, maintenance and consumable costs per productive hour."
        actions={<ButtonLink href="/admin/printers/new">Add printer</ButtonLink>}
      />
      {printers.length === 0 ? (
        <EmptyState title="No printers yet" description="Add your first printer to start calculating machine costs." action={<ButtonLink href="/admin/printers/new">Add printer</ButtonLink>} />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th>Printer</th>
                <th className="text-right">Purchase</th>
                <th className="text-right">Depreciation</th>
                <th className="text-right">Electricity</th>
                <th className="text-right">Maint. + consumables</th>
                <th className="text-right">Machine cost</th>
                <th className="text-right">Failure</th>
                <th className="text-right">Hours/month</th>
              </tr>
            </thead>
            <tbody>
              {printers.map((row) => {
                const p = toPrinterProfile(row);
                const dep = safe(() => depreciationPerHour(p));
                const el = safe(() => electricityPerHour(p));
                const mc = safe(() => maintenancePerHour(p) + consumablesPerHour(p));
                const oh = safe(() => printerOverheadPerHour(p)) ?? 0;
                const total = dep !== null && el !== null && mc !== null ? dep + el + mc + oh : null;
                return (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/admin/printers/${row.id}`} className="font-medium hover:underline">
                        {row.name}
                      </Link>
                      <span className="block text-xs text-muted">{row.model}</span>
                      {!row.active ? <Badge className="mt-1">Inactive</Badge> : null}
                    </td>
                    <td className="num text-right">{formatBDT(row.purchasePrice)}</td>
                    <td className="num text-right">{dep !== null ? formatRate(dep, "h") : "—"}</td>
                    <td className="num text-right">{el !== null ? formatRate(el, "h") : "—"}</td>
                    <td className="num text-right">{mc !== null ? formatRate(mc, "h") : "—"}</td>
                    <td className="num text-right font-semibold">{total !== null ? formatRate(total, "h") : "—"}</td>
                    <td className="num text-right">{formatPercent(row.failureRate)}</td>
                    <td className="num text-right">{row.monthlyProductiveHours}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          <p className="mt-4 text-sm text-muted">
            Active printers plan <span className="num font-medium text-ink">{activeHours} productive hours</span> per month. Overhead allocation currently assumes{" "}
            <span className="num font-medium text-ink">{costing.overhead.monthlyMachineHours} machine hours</span>
            {Math.abs(activeHours - costing.overhead.monthlyMachineHours) > 1 ? (
              <>
                {" "}— <Link className="underline" href="/admin/settings/costing">update it in Costing settings</Link> if your capacity has changed.
              </>
            ) : (
              "."
            )}
          </p>
        </>
      )}
    </>
  );
}
