import Link from "next/link";
import { formatBDT } from "@/domain/money";
import { AVAILABILITY_LABEL, fromPrice, type PublicProduct } from "@/domain/product";
import { Badge } from "../ui/primitives";

export function ProductCard({ product, priority = false }: { product: PublicProduct; priority?: boolean }) {
  const image = product.images[0];
  return (
    <Link href={`/products/${product.slug}`} className="group block focus-visible:outline-offset-4">
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] bg-panel">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.src}
            alt={image.alt}
            loading={priority ? "eager" : "lazy"}
            className="size-full object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.035]"
          />
        ) : null}
        <div className="absolute left-3 top-3 flex gap-1.5">
          {product.availability !== "made_to_order" ? (
            <Badge tone={product.availability === "unavailable" ? "loss" : "warn"}>{AVAILABILITY_LABEL[product.availability]}</Badge>
          ) : null}
          {product.personalization.length ? (
            <Badge tone="outline" className="bg-white/80 backdrop-blur">
              Personalised
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow !text-[0.65rem]">{product.category.name}</p>
          <h3 className="mt-1 font-display text-[1.02rem] font-semibold tracking-tight">{product.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted">{product.shortDescription}</p>
        </div>
        <p className="num shrink-0 text-right text-sm">
          <span className="block text-[0.7rem] text-muted">from</span>
          <span className="font-display text-base font-semibold">{formatBDT(fromPrice(product))}</span>
        </p>
      </div>
    </Link>
  );
}
