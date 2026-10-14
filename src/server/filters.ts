import "server-only";
import type { Prisma } from "@prisma/client";

export interface CalcFilters {
  from?: string;
  to?: string;
  printer?: string;
  material?: string;
  product?: string;
}

const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isId = (s?: string) => !!s && /^[a-z0-9]{10,40}$/i.test(s);

export function parseCalcFilters(sp: Record<string, string | string[] | undefined>): CalcFilters {
  const one = (k: string) => {
    const v = sp[k];
    return typeof v === "string" ? v : undefined;
  };
  const f: CalcFilters = {};
  if (isDate(one("from"))) f.from = one("from");
  if (isDate(one("to"))) f.to = one("to");
  if (isId(one("printer"))) f.printer = one("printer");
  if (isId(one("material"))) f.material = one("material");
  if (isId(one("product"))) f.product = one("product");
  return f;
}

/** Dates are interpreted in Bangladesh time (UTC+6) and stored/compared in UTC. */
export function dateRange(f: Pick<CalcFilters, "from" | "to">): { gte?: Date; lte?: Date } | undefined {
  if (!f.from && !f.to) return undefined;
  return {
    ...(f.from ? { gte: new Date(`${f.from}T00:00:00+06:00`) } : {}),
    ...(f.to ? { lte: new Date(`${f.to}T23:59:59.999+06:00`) } : {}),
  };
}

export function calcWhere(f: CalcFilters): Prisma.CostCalculationWhereInput {
  const where: Prisma.CostCalculationWhereInput = {};
  const range = dateRange(f);
  if (range) where.createdAt = range;
  if (f.printer) where.printerId = f.printer;
  if (f.material) where.materialId = f.material;
  if (f.product) where.productId = f.product;
  return where;
}

export function filtersToQuery(f: CalcFilters): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
}
