import "server-only";
import type { Category, Product } from "@prisma/client";
import { z } from "zod";
import type { CatalogPricing } from "@/domain/estimator/catalog";
import type { PublicProduct } from "@/domain/product";

export { toMaterialProfile, toPrinterProfile } from "./profiles";
export type { PublicProduct } from "@/domain/product";

/* ---------------------------------------------------------------- Product JSON columns */

const sizeOptionSchema = z.object({ key: z.string(), label: z.string(), dimensions: z.string().default(""), priceDelta: z.number().int() });
const materialChoiceSchema = z.object({ key: z.string(), label: z.string(), priceDelta: z.number().int() });
const personalizationSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["text", "select"]),
  maxLength: z.number().int().min(1).default(20),
  options: z.array(z.string()).default([]),
  required: z.boolean().default(false),
  price: z.number().int().min(0).default(0),
});
const imageSchema = z.object({ src: z.string(), alt: z.string().default("") });

export const productJson = {
  sizeOptions: z.array(sizeOptionSchema),
  materialOptions: z.array(materialChoiceSchema),
  colors: z.array(z.string()),
  personalization: z.array(personalizationSchema),
  images: z.array(imageSchema),
};

function parseJson<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, value: unknown, fallback: T): T {
  const r = schema.safeParse(value);
  return r.success ? r.data : fallback;
}

/** Map a product row to its browser-safe shape. minUnitPrice is intentionally omitted. */
export function toPublicProduct(p: Product & { category: Category }): PublicProduct {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: { slug: p.category.slug, name: p.category.name },
    shortDescription: p.shortDescription,
    description: p.description,
    material: p.material,
    dimensions: p.dimensions,
    basePrice: p.basePrice,
    sizeOptions: parseJson(productJson.sizeOptions, p.sizeOptions, []),
    materialOptions: parseJson(productJson.materialOptions, p.materialOptions, []),
    colors: parseJson(productJson.colors, p.colors, []),
    personalization: parseJson(productJson.personalization, p.personalization, []),
    images: parseJson(productJson.images, p.images, []),
    leadTimeMinDays: p.leadTimeMinDays,
    leadTimeMaxDays: p.leadTimeMaxDays,
    availability: p.availability === "limited" || p.availability === "unavailable" ? p.availability : "made_to_order",
    maxQuantity: p.maxQuantity,
    featured: p.featured,
    isSample: p.isSample,
    createdAt: p.createdAt.toISOString(),
  };
}

export function toCatalogPricing(p: Product): CatalogPricing {
  return {
    name: p.name,
    basePrice: p.basePrice,
    minUnitPrice: p.minUnitPrice,
    sizeOptions: parseJson(productJson.sizeOptions, p.sizeOptions, []),
    materialOptions: parseJson(productJson.materialOptions, p.materialOptions, []),
    colors: parseJson(productJson.colors, p.colors, []),
    personalization: parseJson(productJson.personalization, p.personalization, []),
    allowQuantityDiscount: p.allowQuantityDiscount,
    leadTimeMinDays: p.leadTimeMinDays,
    leadTimeMaxDays: p.leadTimeMaxDays,
    maxQuantity: p.maxQuantity,
  };
}
