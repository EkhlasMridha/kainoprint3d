import { notFound } from "next/navigation";
import { Calculator } from "@/components/admin/calculator/calculator";
import { DangerZone } from "@/components/admin/danger-zone";
import { PageHeader } from "@/components/admin/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";
import { formatBDT } from "@/domain/money";
import { deleteCalculation } from "@/server/actions/calculations";
import { requireAdmin } from "@/server/auth/session";
import { initialFromCalculation, loadCalculatorData } from "@/server/calculator-data";
import { db } from "@/server/db";

export const metadata = { title: "Calculation" };

export default async function CalculationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [calc, data, initial] = await Promise.all([
    db.costCalculation.findUnique({ where: { id }, include: { product: { select: { name: true } } } }),
    loadCalculatorData(),
    initialFromCalculation(id, "edit"),
  ]);
  if (!calc || !initial) notFound();
  const missingEquipment = !data.printers.some((p) => p.id === calc.printerId) || !data.materials.some((m) => m.id === calc.materialId);

  return (
    <>
      <PageHeader
        title={calc.name}
        description={
          <>
            Saved {calc.updatedAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" })} · unit cost {formatBDT(calc.unitCost)} · selling at {formatBDT(calc.chosenPrice)}
            {calc.product ? ` · ${calc.product.name}` : ""}
          </>
        }
        back={{ href: "/admin/calculations", label: "Saved calculations" }}
        actions={
          <>
            <ButtonLink href={`/admin/calculations/${id}/report`} variant="secondary" size="sm">
              Printable report
            </ButtonLink>
            <ButtonLink href={`/api/admin/calculations/${id}/csv`} variant="secondary" size="sm" prefetch={false}>
              CSV
            </ButtonLink>
            <ButtonLink href={`/admin/calculator?from=${id}`} variant="secondary" size="sm">
              Duplicate
            </ButtonLink>
          </>
        }
      />
      <Alert tone="info" className="mb-6">
        Editing recalculates with your <strong>current</strong> printer, material and costing settings. The printable report shows the figures exactly as they were saved.
      </Alert>
      {missingEquipment ? (
        <Alert tone="warn" className="mb-6">
          The printer or material used originally is no longer active. Choose a current one to recalculate.
        </Alert>
      ) : null}
      <Calculator {...data} initial={initial} />
      <div className="mt-10 max-w-xl">
        <DangerZone action={deleteCalculation} id={id} label="Delete calculation" />
      </div>
    </>
  );
}
