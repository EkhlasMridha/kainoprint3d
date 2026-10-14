"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { issuesToFieldErrors } from "@/domain/costing/schemas";
import { takaToPoisha } from "@/domain/money";
import { requireAdmin } from "../auth/session";
import { db } from "../db";
import { fdBool, fdJson, fdNum, fdStr, type ActionState } from "../form-data";
import { MEDIA_EXTENSIONS, storeUpload, UploadError } from "../storage";

const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens").max(80);
const key = z.string().trim().regex(/^[a-z0-9_-]{1,40}$/, "Keys: lowercase letters, numbers, - or _");
const takaToP = z.union([z.number(), z.literal("")]).transform((v) => (v === "" ? 0 : takaToPoisha(v)));

const productSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    slug,
    categoryId: z.string().min(1, "Choose a category"),
    shortDescription: z.string().trim().min(1, "Add a short description").max(200),
    description: z.string().trim().min(1, "Add a description").max(4000),
    material: z.string().trim().max(60),
    dimensions: z.string().trim().max(120),
    basePrice: z.number({ invalid_type_error: "Enter the starting price" }).int().min(0),
    minUnitPrice: z.number({ invalid_type_error: "Enter the minimum price" }).int().min(0),
    leadTimeMinDays: z.number({ invalid_type_error: "Required" }).int().min(0).max(120),
    leadTimeMaxDays: z.number({ invalid_type_error: "Required" }).int().min(0).max(120),
    availability: z.enum(["made_to_order", "limited", "unavailable"]),
    maxQuantity: z.number({ invalid_type_error: "Required" }).int().min(1).max(100_000),
    allowQuantityDiscount: z.boolean(),
    featured: z.boolean(),
    published: z.boolean(),
    isSample: z.boolean(),
    sortOrder: z.number().int().min(0).max(100_000),
    colors: z.array(z.string().trim().min(1).max(40)).max(30),
    sizeOptions: z.array(z.object({ key, label: z.string().trim().min(1).max(60), dimensions: z.string().trim().max(80).default(""), priceDelta: takaToP })).max(20),
    materialOptions: z.array(z.object({ key, label: z.string().trim().min(1).max(60), priceDelta: takaToP })).max(20),
    personalization: z
      .array(
        z.object({
          key,
          label: z.string().trim().min(1).max(60),
          type: z.enum(["text", "select"]),
          maxLength: z.union([z.number().int().min(1).max(200), z.literal("")]).transform((v) => (v === "" ? 20 : v)),
          options: z.string().default("").transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean)),
          required: z.boolean().default(false),
          price: takaToP,
        }),
      )
      .max(10),
    images: z.array(z.object({ src: z.string().trim().regex(/^\/(images|media)\/[\w./-]+$/, "Images must be uploaded files or /images/… paths"), alt: z.string().trim().max(200).default("") })).max(12),
  })
  .superRefine((p, ctx) => {
    if (p.leadTimeMaxDays < p.leadTimeMinDays) ctx.addIssue({ code: "custom", path: ["leadTimeMaxDays"], message: "Must be at least the minimum" });
    if (p.minUnitPrice > p.basePrice + Math.max(0, ...p.sizeOptions.map((s) => s.priceDelta))) {
      ctx.addIssue({ code: "custom", path: ["minUnitPrice"], message: "Minimum price is above every possible selling price" });
    }
    for (const [i, opt] of p.personalization.entries()) {
      if (opt.type === "select" && opt.options.length === 0) ctx.addIssue({ code: "custom", path: ["personalization"], message: `Row ${i + 1}: list the choices, separated by commas` });
    }
  });

export async function saveProduct(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = fdStr(fd, "id");
  const images = fdJson<{ src: string; alt: string }[]>(fd, "images") ?? [];
  const uploads = fd.getAll("newImages").filter((f): f is File => f instanceof File && f.size > 0);
  if (images.length + uploads.length > 12) return { ok: false, errors: { newImages: "A product can have at most 12 images" } };

  const taka = (k: string) => {
    const n = fdNum(fd, k);
    return Number.isFinite(n) ? takaToPoisha(n) : Number.NaN;
  };
  const parsed = productSchema.safeParse({
    name: fdStr(fd, "name"),
    slug: fdStr(fd, "slug"),
    categoryId: fdStr(fd, "categoryId"),
    shortDescription: fdStr(fd, "shortDescription"),
    description: fdStr(fd, "description"),
    material: fdStr(fd, "material"),
    dimensions: fdStr(fd, "dimensions"),
    basePrice: taka("basePrice"),
    minUnitPrice: taka("minUnitPrice"),
    leadTimeMinDays: fdNum(fd, "leadTimeMinDays"),
    leadTimeMaxDays: fdNum(fd, "leadTimeMaxDays"),
    availability: fdStr(fd, "availability"),
    maxQuantity: fdNum(fd, "maxQuantity"),
    allowQuantityDiscount: fdBool(fd, "allowQuantityDiscount"),
    featured: fdBool(fd, "featured"),
    published: fdBool(fd, "published"),
    isSample: fdBool(fd, "isSample"),
    sortOrder: Number.isFinite(fdNum(fd, "sortOrder")) ? fdNum(fd, "sortOrder") : 0,
    colors: fdStr(fd, "colors").split(",").map((c) => c.trim()).filter(Boolean),
    sizeOptions: fdJson(fd, "sizeOptions") ?? [],
    materialOptions: fdJson(fd, "materialOptions") ?? [],
    personalization: fdJson(fd, "personalization") ?? [],
    images,
  });
  if (!parsed.success) return { ok: false, errors: issuesToFieldErrors(parsed.error) };
  const p = parsed.data;
  const clash = await db.product.findFirst({ where: { slug: p.slug, NOT: id ? { id } : undefined }, select: { id: true } });
  if (clash) return { ok: false, errors: { slug: "Another product already uses this URL" } };

  // Store new images only after everything else validated (content-signature checked, served from /media).
  for (const file of uploads) {
    try {
      const stored = await storeUpload(file, "media", MEDIA_EXTENSIONS, 5 * 1024 * 1024);
      p.images.push({ src: `/media/${stored.storedName}`, alt: p.name });
    } catch (e) {
      if (e instanceof UploadError) return { ok: false, errors: { newImages: e.message } };
      throw e;
    }
  }

  const json = (v: unknown) => v as Prisma.InputJsonValue;
  const data = {
    ...p,
    colors: json(p.colors),
    sizeOptions: json(p.sizeOptions),
    materialOptions: json(p.materialOptions),
    personalization: json(p.personalization),
    images: json(p.images),
  };
  if (id) await db.product.update({ where: { id }, data });
  else await db.product.create({ data });
  revalidatePath("/", "layout");
  redirect("/admin/products");
}

export async function deleteProduct(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = fdStr(fd, "id");
  if (id) await db.product.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/admin/products");
}

/* ------------------------------------------------------------------ Categories */

const categorySchema = z.object({
  id: z.string().max(40).optional(),
  slug,
  name: z.string().trim().min(1, "Name is required").max(60),
  description: z.string().trim().max(200),
  sortOrder: z.number().int().min(0).max(1000),
});

export async function saveCategory(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = categorySchema.safeParse({
    id: fdStr(fd, "id") || undefined,
    slug: fdStr(fd, "slug"),
    name: fdStr(fd, "name"),
    description: fdStr(fd, "description"),
    sortOrder: Number.isFinite(fdNum(fd, "sortOrder")) ? fdNum(fd, "sortOrder") : 0,
  });
  if (!parsed.success) return { ok: false, errors: issuesToFieldErrors(parsed.error) };
  const { id, ...data } = parsed.data;
  const clash = await db.category.findFirst({ where: { slug: data.slug, NOT: id ? { id } : undefined } });
  if (clash) return { ok: false, errors: { slug: "Slug already in use" } };
  if (id) await db.category.update({ where: { id }, data });
  else await db.category.create({ data });
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

export async function deleteCategory(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = fdStr(fd, "id");
  const used = await db.product.count({ where: { categoryId: id } });
  if (used === 0 && id) await db.category.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect(used ? "/admin/categories?error=in-use" : "/admin/categories");
}
