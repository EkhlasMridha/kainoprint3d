import { notFound } from "next/navigation";
import { DangerZone } from "@/components/admin/danger-zone";
import { PageHeader } from "@/components/admin/page-header";
import { PrinterForm, type PrinterFormValues } from "@/components/admin/printer-form";
import { deletePrinter } from "@/server/actions/equipment";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db";

export const metadata = { title: "Printer" };

const NEW: PrinterFormValues = {
  name: "",
  model: "",
  purchasePrice: 0,
  residualValue: 0,
  lifetimeHours: 5000,
  monthlyProductiveHours: 200,
  averagePowerWatts: 100,
  electricityRatePerKwh: 12,
  maintenanceMethod: "per_hour",
  maintenancePerHour: 4,
  maintenanceMonthly: 0,
  nozzleCost: 1000,
  nozzleLifeHours: 600,
  otherConsumablesPerHour: 2,
  failureRate: 5,
  additionalOverheadMonthly: 0,
  active: true,
  notes: "",
};

export default async function PrinterPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  let values = NEW;
  if (id !== "new") {
    const p = await db.printer.findUnique({ where: { id } });
    if (!p) notFound();
    values = {
      id: p.id,
      name: p.name,
      model: p.model,
      purchasePrice: p.purchasePrice / 100,
      residualValue: p.residualValue / 100,
      lifetimeHours: p.lifetimeHours,
      monthlyProductiveHours: p.monthlyProductiveHours,
      averagePowerWatts: p.averagePowerWatts,
      electricityRatePerKwh: p.electricityRatePerKwh / 100,
      maintenanceMethod: p.maintenanceMethod === "monthly" ? "monthly" : "per_hour",
      maintenancePerHour: p.maintenancePerHour / 100,
      maintenanceMonthly: p.maintenanceMonthly / 100,
      nozzleCost: p.nozzleCost / 100,
      nozzleLifeHours: p.nozzleLifeHours,
      otherConsumablesPerHour: p.otherConsumablesPerHour / 100,
      failureRate: +(p.failureRate * 100).toFixed(4),
      additionalOverheadMonthly: p.additionalOverheadMonthly / 100,
      active: p.active,
      notes: p.notes,
    };
  }
  return (
    <>
      <PageHeader title={values.id ? values.name : "Add printer"} back={{ href: "/admin/printers", label: "Printers" }} />
      <div className="max-w-4xl space-y-8">
        <PrinterForm values={values} />
        {values.id ? (
          <DangerZone action={deletePrinter} id={values.id} label="Delete printer" description="Saved calculations keep a snapshot of this printer's costs, so their history is not affected." />
        ) : null}
      </div>
    </>
  );
}
