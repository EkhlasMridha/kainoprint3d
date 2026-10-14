import { NextResponse } from "next/server";
import { toCsv, takaCell, type CsvCell } from "@/domain/csv";
import { adminOrNull } from "@/server/auth/session";
import { db } from "@/server/db";
import { calcWhere, parseCalcFilters } from "@/server/filters";

/** CSV export of saved calculations matching the current filters (admin only). */
export async function GET(req: Request) {
  if (!(await adminOrNull())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sp = Object.fromEntries(new URL(req.url).searchParams.entries());
  const calcs = await db.costCalculation.findMany({
    where: calcWhere(parseCalcFilters(sp)),
    orderBy: { createdAt: "desc" },
    include: { printer: { select: { name: true } }, material: { select: { name: true } }, product: { select: { name: true } }, components: { orderBy: { sortOrder: "asc" } } },
  });
  const keys = ["material", "depreciation", "electricity", "maintenance", "labor", "design", "failure", "packaging", "overhead"];
  const rows: CsvCell[][] = [
    ["Created (UTC)", "Name", "Product", "Printer", "Material", "Quantity", ...keys.map((k) => `${k} (BDT)`), "Total batch cost", "Unit cost", "Minimum price", "Standard price", "Premium price", "Chosen tier", "Chosen price", "Profit per item", "Margin %", "Markup %", "Filament g", "Machine h", "Labour h", "Monthly units"],
    ...calcs.map((c): CsvCell[] => [
      c.createdAt.toISOString(),
      c.name,
      c.product?.name ?? "",
      c.printer?.name ?? "",
      c.material?.name ?? "",
      c.quantity,
      ...keys.map((k) => takaCell(c.components.find((x) => x.key === k)?.amount ?? 0)),
      takaCell(c.totalBatchCost),
      takaCell(c.unitCost),
      takaCell(c.minimumPrice),
      takaCell(c.standardPrice),
      takaCell(c.premiumPrice),
      c.chosenTier,
      takaCell(c.chosenPrice),
      takaCell(c.profitPerItem),
      Math.round(c.margin * 10000) / 100,
      Math.round(c.markup * 10000) / 100,
      Math.round(c.totalGrams * 10) / 10,
      Math.round(c.machineHours * 100) / 100,
      Math.round(c.laborHours * 100) / 100,
      c.expectedMonthlyUnits,
    ]),
  ];
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kaino-calculations-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
