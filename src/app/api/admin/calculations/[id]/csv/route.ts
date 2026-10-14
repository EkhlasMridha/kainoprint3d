import { NextResponse } from "next/server";
import { toCsv, takaCell, type CsvCell } from "@/domain/csv";
import { adminOrNull } from "@/server/auth/session";
import { db } from "@/server/db";
import { readStoredCalculation } from "@/server/stored-result";

/** CSV cost breakdown for one calculation (admin only). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await adminOrNull())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const calc = await db.costCalculation.findUnique({ where: { id } });
  if (!calc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const stored = readStoredCalculation(calc);
  if (!stored) return NextResponse.json({ error: "Unreadable calculation" }, { status: 422 });
  const { result, snapshot, job } = stored;
  const rows: CsvCell[][] = [
    ["Kaino Print 3D — cost breakdown"],
    ["Calculation", calc.name],
    ["Saved (UTC)", calc.updatedAt.toISOString()],
    ["Printer", snapshot.printer.name],
    ["Material", snapshot.material.name],
    ["Batch quantity", job.quantity],
    ["Print jobs", result.cost.quantities.plates],
    [],
    ["Component", "Amount (BDT)", "Calculation"],
    ...result.cost.lines.map((l): CsvCell[] => [l.label, takaCell(l.amount), l.formula]),
    ["Total manufacturing cost", takaCell(result.cost.totalBatchCost)],
    ["Unit manufacturing cost", Math.round(result.cost.unitCostExact) / 100],
    [],
    ["Tier", "List price (BDT)", "Fees (BDT)", "Profit (BDT)", "Margin %", "Markup %"],
    ...[result.pricing.tiers.minimum, result.pricing.tiers.standard, result.pricing.tiers.premium].map((t): CsvCell[] => [
      t.label,
      takaCell(t.listPrice),
      Math.round(t.fees) / 100,
      Math.round(t.profit) / 100,
      Math.round(t.margin * 10000) / 100,
      Math.round(t.markup * 10000) / 100,
    ]),
    [
      `Chosen (${calc.chosenTier})`,
      takaCell(calc.chosenPrice),
      Math.round(result.check.metrics.fees) / 100,
      Math.round(result.check.metrics.profit) / 100,
      Math.round(result.check.metrics.margin * 10000) / 100,
      Math.round(result.check.metrics.markup * 10000) / 100,
    ],
  ];
  const safeName = calc.name.replace(/[^\w-]+/g, "-").slice(0, 60) || "calculation";
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cost-${safeName}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
