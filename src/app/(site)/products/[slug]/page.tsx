import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/site/product-card";
import { ProductConfigurator } from "@/components/site/product-configurator";
import { ProductGallery } from "@/components/site/product-gallery";
import { SampleNotice } from "@/components/site/sample-notice";
import { Badge } from "@/components/ui/primitives";
import { formatBDT } from "@/domain/money";
import { AVAILABILITY_LABEL, fromPrice } from "@/domain/product";
import { getPublicProduct, listPublicProducts } from "@/server/catalog";
import { getSetting } from "@/server/settings";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const product = await getPublicProduct((await params).slug);
  return product ? { title: product.name, description: product.shortDescription } : { title: "Product not found" };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getPublicProduct(slug);
  if (!product) notFound();
  const [landing, common, all] = await Promise.all([getSetting("landing"), getSetting("estimator.common"), listPublicProducts()]);
  const related = all.filter((p) => p.category.slug === product.category.slug && p.id !== product.id).slice(0, 4);

  return (
    <div className="container-page pt-6 sm:pt-10">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/products" className="hover:text-ink">Products</Link></li>
          <li aria-hidden>/</li>
          <li><Link href={`/products?category=${product.category.slug}`} className="hover:text-ink">{product.category.name}</Link></li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-ink">{product.name}</li>
        </ol>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ProductGallery images={product.images} name={product.name} />
        </div>

        <div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={product.availability === "made_to_order" ? "neutral" : product.availability === "limited" ? "warn" : "loss"}>
              {AVAILABILITY_LABEL[product.availability]}
            </Badge>
            {product.isSample ? <Badge tone="outline">Sample listing</Badge> : null}
          </div>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-[-0.04em] text-balance">{product.name}</h1>
          <p className="num mt-3 text-lg">
            <span className="text-muted">From </span>
            <span className="font-display font-semibold">{formatBDT(fromPrice(product))}</span>
          </p>
          <p className="mt-5 leading-relaxed text-muted">{product.description}</p>

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line py-5 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted">Material</dt>
              <dd className="mt-0.5 font-medium">{product.material}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Size</dt>
              <dd className="mt-0.5 font-medium">{product.dimensions || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Production time</dt>
              <dd className="mt-0.5 font-medium">
                {product.leadTimeMinDays}–{product.leadTimeMaxDays} working days
              </dd>
            </div>
          </dl>

          {product.isSample && landing.showSampleNotice ? (
            <div className="mt-6">
              <SampleNotice compact />
            </div>
          ) : null}

          <div className="mt-8">
            <ProductConfigurator product={product} disclaimer={landing.estimateDisclaimer} maxUploadMb={common.maxUploadMb} />
          </div>
        </div>
      </div>

      {related.length ? (
        <section className="mt-24">
          <h2 className="font-display text-2xl font-semibold tracking-tight">More {product.category.name.toLowerCase()}</h2>
          <div className="mt-8 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
