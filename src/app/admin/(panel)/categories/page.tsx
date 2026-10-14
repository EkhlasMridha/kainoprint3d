import { CategoryForm } from "@/components/admin/category-row";
import { PageHeader } from "@/components/admin/page-header";
import { Alert, Card, CardHeader } from "@/components/ui/primitives";
import { deleteCategory } from "@/server/actions/catalog";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db";

export const metadata = { title: "Categories" };

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const { error } = await searchParams;
  const categories = await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } });
  return (
    <>
      <PageHeader title="Categories" description="Used for catalog filters on the website." />
      {error === "in-use" ? (
        <Alert tone="warn" className="mb-6">
          That category still has products. Move them to another category before deleting it.
        </Alert>
      ) : null}
      <div className="max-w-5xl space-y-6">
        <Card>
          <CardHeader title="Existing categories" />
          <ul className="divide-y divide-line">
            {categories.map((c) => (
              <li key={c.id} className="space-y-2 px-5 py-4">
                <CategoryForm c={c} />
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>{c._count.products} product(s)</span>
                  {c._count.products === 0 ? (
                    <form action={deleteCategory}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className="text-loss hover:underline">
                        Delete
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Add category" />
          <div className="p-5">
            <CategoryForm />
          </div>
        </Card>
      </div>
    </>
  );
}
