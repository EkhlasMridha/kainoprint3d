import { PageHeader } from "@/components/admin/page-header";
import { CostingSettingsForm } from "@/components/admin/settings/costing-form";
import { Alert } from "@/components/ui/primitives";
import { overheadRate, totalOverheadMonthly } from "@/domain/costing/rates";
import { formatBDT, formatRate } from "@/domain/money";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db";
import { getSetting } from "@/server/settings";

export const metadata = { title: "Costing & pricing" };

export default async function CostingSettingsPage() {
  await requireAdmin();
  const [s, printers] = await Promise.all([getSetting("costing"), db.printer.findMany({ where: { active: true }, select: { monthlyProductiveHours: true } })]);
  const activeHours = printers.reduce((a, p) => a + p.monthlyProductiveHours, 0);
  let rate = "—";
  try {
    rate = formatRate(overheadRate(s.overhead), s.overhead.method === "production_unit" ? "unit" : s.overhead.method === "labor_hour" ? "labour h" : "machine h");
  } catch {
    /* shown as — */
  }
  return (
    <>
      <PageHeader title="Costing & pricing" description="Shop-wide assumptions used by every cost calculation. Saved calculations keep the values they were made with." />
      <Alert tone="info" className="mb-6 max-w-5xl">
        Current allocated overhead: <strong>{formatBDT(totalOverheadMonthly(s.overhead.items))}</strong> per month → <strong>{rate}</strong>.
      </Alert>
      <div className="max-w-5xl">
        <CostingSettingsForm s={s} activePrinterHours={activeHours} />
      </div>
    </>
  );
}
