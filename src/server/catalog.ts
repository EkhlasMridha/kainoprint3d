import "server-only";
import { db } from "./db";
import { toPublicProduct, type PublicProduct } from "./mappers";

export async function listPublicProducts(): Promise<PublicProduct[]> {
  const rows = await db.product.findMany({
    where: { published: true },
    include: { category: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toPublicProduct);
}

export async function getPublicProduct(slug: string): Promise<PublicProduct | null> {
  const row = await db.product.findFirst({ where: { slug, published: true }, include: { category: true } });
  return row ? toPublicProduct(row) : null;
}

export async function listCategories() {
  return db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
}
