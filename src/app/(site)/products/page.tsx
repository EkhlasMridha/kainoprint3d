import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogBrowser } from "@/components/site/catalog-browser";
import { SampleNotice } from "@/components/site/sample-notice";
import { listCategories, listPublicProducts } from "@/server/catalog";
import { getSetting } from "@/server/settings";

export const metadata: Metadata = {
  title: "Products",
  description: "Personalised keychains, lockets, desk organizers and functional 3D-printed products.",
};

export default async function ProductsPage() {
  const [products, categories, landing] = await Promise.all([listPublicProducts(), listCategories(), getSetting("landing")]);
  return (
    <div className="container-page pb-10 pt-10 sm:pt-14">
      <p className="eyebrow">Catalogue</p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Products</h1>
      <p className="mt-3 max-w-xl text-muted">Every piece is printed to order. Personalise it, check the estimated price and send us a request — we confirm before printing.</p>
      {landing.showSampleNotice && products.some((p) => p.isSample) ? (
        <div className="mt-6">
          <SampleNotice compact />
        </div>
      ) : null}
      <Suspense>
        <CatalogBrowser products={products} categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} />
      </Suspense>
    </div>
  );
}
