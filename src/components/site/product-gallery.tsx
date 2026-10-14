"use client";

import { useState } from "react";
import type { ProductImage } from "@/domain/product";
import { cn } from "../ui/cn";

export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [active, setActive] = useState(0);
  const current = images[active];
  if (!current) {
    return <div className="aspect-square rounded-[var(--radius-card)] bg-panel" aria-label={`${name} — no image yet`} />;
  }
  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] bg-panel">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={current.src} src={current.src} alt={current.alt || name} className="size-full object-cover animate-rise" />
        {images.length > 1 ? (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 sm:hidden" aria-hidden>
            {images.map((_, i) => (
              <span key={i} className={cn("h-1.5 rounded-full transition-all", i === active ? "w-5 bg-ink" : "w-1.5 bg-ink/30")} />
            ))}
          </div>
        ) : null}
      </div>
      {images.length > 1 ? (
        <div className="mt-3 grid grid-cols-5 gap-2" role="tablist" aria-label="Product images">
          {images.map((img, i) => (
            <button
              key={img.src + i}
              role="tab"
              aria-selected={i === active}
              aria-label={`Show image ${i + 1}: ${img.alt || name}`}
              onClick={() => setActive(i)}
              className={cn("aspect-square overflow-hidden rounded-lg bg-panel ring-offset-2 transition", i === active ? "ring-2 ring-ink" : "opacity-70 hover:opacity-100")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
