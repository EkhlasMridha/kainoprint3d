import type { MaterialChoice, PersonalizationField, SizeOption } from "./estimator/catalog";

export interface ProductImage {
  src: string;
  alt: string;
}

export type Availability = "made_to_order" | "limited" | "unavailable";

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  made_to_order: "Made to order",
  limited: "Limited availability",
  unavailable: "Temporarily unavailable",
};

/** Product data that is safe to send to the browser. Deliberately has no minUnitPrice. */
export interface PublicProduct {
  id: string;
  slug: string;
  name: string;
  category: { slug: string; name: string };
  shortDescription: string;
  description: string;
  material: string;
  dimensions: string;
  basePrice: number;
  sizeOptions: SizeOption[];
  materialOptions: MaterialChoice[];
  colors: string[];
  personalization: PersonalizationField[];
  images: ProductImage[];
  leadTimeMinDays: number;
  leadTimeMaxDays: number;
  availability: Availability;
  maxQuantity: number;
  featured: boolean;
  isSample: boolean;
  createdAt: string;
}

/** Lowest possible configured unit price (base + cheapest options). */
export function fromPrice(p: Pick<PublicProduct, "basePrice" | "sizeOptions" | "materialOptions">): number {
  const minSize = p.sizeOptions.length ? Math.min(...p.sizeOptions.map((s) => s.priceDelta)) : 0;
  const minMat = p.materialOptions.length ? Math.min(...p.materialOptions.map((m) => m.priceDelta)) : 0;
  return p.basePrice + minSize + minMat;
}
