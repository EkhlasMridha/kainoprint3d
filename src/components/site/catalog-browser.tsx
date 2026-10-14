"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { fromPrice, type PublicProduct } from "@/domain/product";
import { Button } from "../ui/button";
import { cn } from "../ui/cn";
import { Input, Select } from "../ui/field";
import { EmptyState } from "../ui/primitives";
import { ProductCard } from "./product-card";

type Sort = "featured" | "price-asc" | "price-desc" | "newest" | "name";

export function CatalogBrowser({ products, categories }: { products: PublicProduct[]; categories: { slug: string; name: string }[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const category = params.get("category") ?? "all";
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [sort, setSort] = useState<Sort>((params.get("sort") as Sort) || "featured");

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "" || value === "all" || (key === "sort" && value === "featured")) next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products.filter(
      (p) =>
        (category === "all" || p.category.slug === category) &&
        (!q || [p.name, p.shortDescription, p.category.name, p.material].some((s) => s.toLowerCase().includes(q))),
    );
    const sorted = list.slice();
    if (sort === "price-asc") sorted.sort((a, b) => fromPrice(a) - fromPrice(b));
    else if (sort === "price-desc") sorted.sort((a, b) => fromPrice(b) - fromPrice(a));
    else if (sort === "newest") sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    else if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else sorted.sort((a, b) => Number(b.featured) - Number(a.featured));
    return sorted;
  }, [products, category, query, sort]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) m.set(p.category.slug, (m.get(p.category.slug) ?? 0) + 1);
    return m;
  }, [products]);

  return (
    <div className="mt-10">
      <div className="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Categories" className="-mx-1 flex min-w-0 gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {[{ slug: "all", name: "All" }, ...categories.filter((c) => counts.get(c.slug))].map((c) => {
            const active = category === c.slug;
            return (
              <button
                key={c.slug}
                role="tab"
                aria-selected={active}
                onClick={() => setParam("category", c.slug)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors",
                  active ? "border-ink bg-ink text-paper" : "border-line-strong bg-white text-ink-2 hover:border-ink",
                )}
              >
                {c.name}
                <span className={cn("ml-1.5 text-xs", active ? "text-paper/60" : "text-subtle")}>{c.slug === "all" ? products.length : counts.get(c.slug)}</span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 lg:shrink-0">
          <div className="relative min-w-0 flex-1 lg:w-56 lg:flex-none">
            <label htmlFor="catalog-search" className="sr-only">
              Search products
            </label>
            <Input
              id="catalog-search"
              type="search"
              placeholder="Search products…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setParam("q", e.target.value);
              }}
            />
          </div>
          <label htmlFor="catalog-sort" className="sr-only">
            Sort by
          </label>
          <Select
            id="catalog-sort"
            className="w-auto"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as Sort);
              setParam("sort", e.target.value);
            }}
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="newest">Newest</option>
            <option value="name">Name</option>
          </Select>
        </div>
      </div>

      <p className="mt-6 text-sm text-muted" aria-live="polite">
        {visible.length} {visible.length === 1 ? "product" : "products"}
      </p>

      {visible.length ? (
        <div className="mt-6 grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < 4} />
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState
            title="No products match"
            description="Try a different search or category — or tell us what you have in mind and we'll make it."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  router.replace(pathname, { scroll: false });
                }}
              >
                Clear filters
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
}
