import Link from "next/link";
import type { CalcFilters } from "@/server/filters";
import { Button } from "../ui/button";
import { Input, Select } from "../ui/field";

/** GET form so filters live in the URL (shareable, back-button friendly, no JS needed). */
export function CalcFilterBar({
  action,
  filters,
  printers,
  materials,
  products,
}: {
  action: string;
  filters: CalcFilters;
  printers: { id: string; name: string }[];
  materials: { id: string; name: string }[];
  products: { id: string; name: string }[];
}) {
  const active = Object.values(filters).some(Boolean);
  return (
    <form action={action} method="get" className="no-print mb-6 grid gap-3 rounded-[var(--radius-card)] border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
      <label className="text-xs text-muted">
        From
        <Input type="date" name="from" defaultValue={filters.from} className="mt-1" />
      </label>
      <label className="text-xs text-muted">
        To
        <Input type="date" name="to" defaultValue={filters.to} className="mt-1" />
      </label>
      <label className="text-xs text-muted">
        Printer
        <Select name="printer" defaultValue={filters.printer ?? ""} className="mt-1">
          <option value="">All printers</option>
          {printers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="text-xs text-muted">
        Material
        <Select name="material" defaultValue={filters.material ?? ""} className="mt-1">
          <option value="">All materials</option>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="text-xs text-muted">
        Product
        <Select name="product" defaultValue={filters.product ?? ""} className="mt-1">
          <option value="">All products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </label>
      <div className="flex items-end gap-2">
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {active ? (
          <Link href={action} className="px-2 py-2 text-sm text-muted hover:text-ink">
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}
