import Link from "next/link";
import { Calculator, type CalculatorInitial } from "@/components/admin/calculator/calculator";
import { PageHeader } from "@/components/admin/page-header";
import { Alert } from "@/components/ui/primitives";
import { defaultJobInput } from "@/domain/costing/defaults";
import { requireAdmin } from "@/server/auth/session";
import { initialFromCalculation, loadCalculatorData } from "@/server/calculator-data";
import { db } from "@/server/db";

export const metadata = { title: "New calculation" };

export default async function NewCalculationPage({ searchParams }: { searchParams: Promise<{ from?: string; product?: string }> }) {
  await requireAdmin();
  const { from, product } = await searchParams;
  const data = await loadCalculatorData();
  let initial: CalculatorInitial | null = from ? await initialFromCalculation(from, "duplicate") : null;
  if (!initial) {
    const linked = product ? await db.product.findUnique({ where: { id: product }, select: { id: true, name: true } }) : null;
    initial = {
      job: { ...defaultJobInput(data.settings), name: linked?.name ?? "" },
      printerId: data.printers[0]?.id ?? "",
      materialId: data.materials[0]?.id ?? "",
      productId: linked?.id ?? null,
      chosenTier: "standard",
      customPrice: null,
      expectedMonthlyUnits: 0,
      notes: "",
    };
  }
  return (
    <>
      <PageHeader
        title={from ? "Duplicate calculation" : "New cost calculation"}
        description="Enter what one print job uses. Costs, the three suggested prices and your profit update as you type."
        back={{ href: "/admin/calculations", label: "Saved calculations" }}
      />
      {data.printers.length === 0 || data.materials.length === 0 ? (
        <Alert tone="warn" title="Set up equipment first" className="mb-6">
          Add at least one <Link href="/admin/printers/new" className="underline">printer</Link> and one{" "}
          <Link href="/admin/materials/new" className="underline">material</Link> to calculate costs.
        </Alert>
      ) : null}
      <Calculator {...data} initial={initial} />
    </>
  );
}
