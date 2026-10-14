import Link from "next/link";
import { notFound } from "next/navigation";
import { DangerZone } from "@/components/admin/danger-zone";
import { PageHeader } from "@/components/admin/page-header";
import { ProductForm, type ProductFormValues } from "@/components/admin/product-form";
import type { Row } from "@/components/admin/rows-editor";
import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";
import { formatBDT } from "@/domain/money";
import { deleteProduct } from "@/server/actions/catalog";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db";
import { productJson } from "@/server/mappers";

export const metadata = { title: "Product" };

export default async function AdminProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } });
  let values: ProductFormValues = {
    name: "",
    slug: "",
    categoryId: categories[0]?.id ?? "",
    shortDescription: "",
    description: "",
    material: "PLA",
    dimensions: "",
    basePrice: 0,
    minUnitPrice: 0,
    leadTimeMinDays: 3,
    leadTimeMaxDays: 5,
    availability: "made_to_order",
    maxQuantity: 200,
    allowQuantityDiscount: true,
    featured: false,
    published: true,
    isSample: false,
    sortOrder: 0,
    colors: "Black, White",
    sizeOptions: [],
    materialOptions: [],
    personalization: [],
    images: [],
  };
  let costHint: React.ReactNode = null;

  if (id !== "new") {
    const p = await db.product.findUnique({ where: { id }, include: { calculations: { orderBy: { updatedAt: "desc" }, take: 1 } } });
    if (!p) notFound();
    const parse = <T,>(schema: { safeParse: (v: unknown) => { success: boolean; data?: T } }, v: unknown, fb: T): T => {
      const r = schema.safeParse(v);
      return r.success ? (r.data as T) : fb;
    };
    values = {
      id: p.id,
      name: p.name,
      slug: p.slug,
      categoryId: p.categoryId,
      shortDescription: p.shortDescription,
      description: p.description,
      material: p.material,
      dimensions: p.dimensions,
      basePrice: p.basePrice / 100,
      minUnitPrice: p.minUnitPrice / 100,
      leadTimeMinDays: p.leadTimeMinDays,
      leadTimeMaxDays: p.leadTimeMaxDays,
      availability: p.availability,
      maxQuantity: p.maxQuantity,
      allowQuantityDiscount: p.allowQuantityDiscount,
      featured: p.featured,
      published: p.published,
      isSample: p.isSample,
      sortOrder: p.sortOrder,
      colors: parse(productJson.colors, p.colors, [] as string[]).join(", "),
      sizeOptions: parse(productJson.sizeOptions, p.sizeOptions, []).map((s) => ({ ...s, priceDelta: s.priceDelta / 100 })),
      materialOptions: parse(productJson.materialOptions, p.materialOptions, []).map((s) => ({ ...s, priceDelta: s.priceDelta / 100 })),
      personalization: parse(productJson.personalization, p.personalization, []).map((f) => ({ ...f, options: f.options.join(", "), price: f.price / 100 })),
      images: parse(productJson.images, p.images, []),
    };
    const c = p.calculations[0];
    costHint = c ? (
      <Alert tone={c.minimumPrice > p.basePrice ? "loss" : "info"}>
        Latest <Link className="underline" href={`/admin/calculations/${c.id}`}>cost calculation</Link>: unit cost {formatBDT(c.unitCost)}, minimum sustainable {formatBDT(c.minimumPrice)}, standard {formatBDT(c.standardPrice)}, premium {formatBDT(c.premiumPrice)}.
        {c.minimumPrice > p.basePrice ? " The starting price is below the minimum sustainable price." : ""}
      </Alert>
    ) : (
      <Alert tone="info">
        No cost calculation linked yet. <Link className="underline" href={`/admin/calculator?product=${p.id}`}>Calculate this product&apos;s cost</Link> to set prices with confidence.
      </Alert>
    );
  }

  return (
    <>
      <PageHeader
        title={values.id ? values.name : "Add product"}
        back={{ href: "/admin/products", label: "Products" }}
        actions={
          values.id ? (
            <>
              <ButtonLink href={`/products/${values.slug}`} variant="secondary" size="sm" target="_blank">
                View on site ↗
              </ButtonLink>
              <ButtonLink href={`/admin/calculator?product=${values.id}`} variant="secondary" size="sm">
                New cost calculation
              </ButtonLink>
            </>
          ) : null
        }
      />
      <div className="max-w-5xl space-y-8">
        <ProductForm values={values} categories={categories} costHint={costHint} />
        {values.id ? <DangerZone action={deleteProduct} id={values.id} label="Delete product" description="Linked calculations and quote requests are kept but unlinked." /> : null}
      </div>
    </>
  );
}
