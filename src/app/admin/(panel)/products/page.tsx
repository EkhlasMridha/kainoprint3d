import Link from "next/link";
import { PageHeader, Table } from "@/components/admin/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { formatBDT } from "@/domain/money";
import { AVAILABILITY_LABEL, type Availability } from "@/domain/product";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db";

export const metadata = { title: "Products" };

export default async function AdminProductsPage() {
  await requireAdmin();
  const products = await db.product.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { category: true, calculations: { orderBy: { updatedAt: "desc" }, take: 1, select: { id: true, unitCost: true, minimumPrice: true } } },
  });
  return (
    <>
      <PageHeader title="Products" description="Catalog shown on the public website." actions={<ButtonLink href="/admin/products/new">Add product</ButtonLink>} />
      {products.length === 0 ? (
        <EmptyState title="No products yet" action={<ButtonLink href="/admin/products/new">Add product</ButtonLink>} />
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th className="text-right">Starting price</th>
              <th className="text-right">Latest unit cost</th>
              <th>Availability</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const images = (p.images as { src: string }[] | null) ?? [];
              const calc = p.calculations[0];
              return (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 font-medium hover:underline">
                      {images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={images[0].src} alt="" className="size-10 rounded-md bg-panel object-cover" />
                      ) : (
                        <span className="size-10 rounded-md bg-panel" />
                      )}
                      {p.name}
                    </Link>
                  </td>
                  <td>{p.category.name}</td>
                  <td className="num text-right">{formatBDT(p.basePrice)}</td>
                  <td className="num text-right">
                    {calc ? (
                      <Link href={`/admin/calculations/${calc.id}`} className={calc.minimumPrice > p.basePrice ? "text-loss underline" : "hover:underline"}>
                        {formatBDT(calc.unitCost)}
                      </Link>
                    ) : (
                      <Link href={`/admin/calculator?product=${p.id}`} className="text-xs text-muted underline">
                        Calculate
                      </Link>
                    )}
                  </td>
                  <td className="text-xs">{AVAILABILITY_LABEL[p.availability as Availability] ?? p.availability}</td>
                  <td className="space-x-1">
                    <Badge tone={p.published ? "profit" : "neutral"}>{p.published ? "Published" : "Hidden"}</Badge>
                    {p.featured ? <Badge tone="outline">Featured</Badge> : null}
                    {p.isSample ? <Badge tone="warn">Sample</Badge> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}
