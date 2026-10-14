import { notFound } from "next/navigation";
import { DangerZone } from "@/components/admin/danger-zone";
import { MaterialForm, type MaterialFormValues } from "@/components/admin/material-form";
import { PageHeader } from "@/components/admin/page-header";
import { deleteMaterial } from "@/server/actions/equipment";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db";

export const metadata = { title: "Material" };

const NEW: MaterialFormValues = {
  name: "",
  brand: "",
  category: "PLA",
  color: "",
  supplier: "",
  purchasePrice: 2000,
  spoolWeightGrams: 1000,
  netUsableGrams: "",
  handlingCostPerSpool: 0,
  failureRate: 0,
  wasteAllowancePct: 0,
  active: true,
  notes: "",
};

export default async function MaterialPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  let values = NEW;
  if (id !== "new") {
    const m = await db.material.findUnique({ where: { id } });
    if (!m) notFound();
    values = {
      id: m.id,
      name: m.name,
      brand: m.brand,
      category: m.category,
      color: m.color,
      supplier: m.supplier,
      purchasePrice: m.purchasePrice / 100,
      spoolWeightGrams: m.spoolWeightGrams,
      netUsableGrams: m.netUsableGrams ?? "",
      handlingCostPerSpool: m.handlingCostPerSpool / 100,
      failureRate: +(m.failureRate * 100).toFixed(4),
      wasteAllowancePct: +(m.wasteAllowancePct * 100).toFixed(4),
      active: m.active,
      notes: m.notes,
    };
  }
  return (
    <>
      <PageHeader title={values.id ? values.name : "Add material"} back={{ href: "/admin/materials", label: "Materials" }} />
      <div className="max-w-4xl space-y-8">
        <MaterialForm values={values} />
        {values.id ? <DangerZone action={deleteMaterial} id={values.id} label="Delete material" description="Saved calculations keep a snapshot of this material's cost." /> : null}
      </div>
    </>
  );
}
