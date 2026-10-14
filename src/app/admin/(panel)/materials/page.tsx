import Link from "next/link";
import { PageHeader, Table } from "@/components/admin/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { materialCostPerGram, usableGrams } from "@/domain/costing/rates";
import { formatBDT, formatPercent, formatRate } from "@/domain/money";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db";
import { toMaterialProfile } from "@/server/profiles";

export const metadata = { title: "Materials" };

export default async function MaterialsPage() {
  await requireAdmin();
  const materials = await db.material.findMany({ orderBy: [{ active: "desc" }, { category: "asc" }, { name: "asc" }] });
  return (
    <>
      <PageHeader
        title="Materials"
        description="Cost per gram = (spool price + handling cost) ÷ net usable grams. Use net usable weight to account for spool-end waste."
        actions={<ButtonLink href="/admin/materials/new">Add material</ButtonLink>}
      />
      {materials.length === 0 ? (
        <EmptyState title="No materials yet" description="Add the filaments you buy to calculate material cost per gram." action={<ButtonLink href="/admin/materials/new">Add material</ButtonLink>} />
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Material</th>
              <th>Type</th>
              <th className="text-right">Spool price</th>
              <th className="text-right">Usable weight</th>
              <th className="text-right">Cost per gram</th>
              <th className="text-right">Failure</th>
              <th className="text-right">Extra waste</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((m) => {
              let perGram: number | null = null;
              try {
                perGram = materialCostPerGram(toMaterialProfile(m));
              } catch {
                perGram = null;
              }
              return (
                <tr key={m.id}>
                  <td>
                    <Link href={`/admin/materials/${m.id}`} className="font-medium hover:underline">
                      {m.name}
                    </Link>
                    <span className="block text-xs text-muted">
                      {[m.brand, m.supplier].filter(Boolean).join(" · ")}
                    </span>
                    {!m.active ? <Badge className="mt-1">Inactive</Badge> : null}
                  </td>
                  <td>{m.category}</td>
                  <td className="num text-right">{formatBDT(m.purchasePrice)}</td>
                  <td className="num text-right">{usableGrams(m)} g</td>
                  <td className="num text-right font-semibold">{perGram !== null ? formatRate(perGram, "g", 3) : "—"}</td>
                  <td className="num text-right">{formatPercent(m.failureRate)}</td>
                  <td className="num text-right">{formatPercent(m.wasteAllowancePct)}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}
