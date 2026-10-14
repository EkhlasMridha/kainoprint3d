import { NextResponse } from "next/server";
import { toCsv, takaCell, type CsvCell } from "@/domain/csv";
import { adminOrNull } from "@/server/auth/session";
import { db } from "@/server/db";

export async function GET() {
  if (!(await adminOrNull())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const quotes = await db.quoteRequest.findMany({ orderBy: { createdAt: "desc" } });
  const rows: CsvCell[][] = [
    ["Created (UTC)", "Reference", "Kind", "Status", "Customer", "Phone", "Email", "Title", "Quantity", "Indicative low (BDT)", "Indicative high (BDT)", "Final price (BDT)", "File"],
    ...quotes.map((q): CsvCell[] => [
      q.createdAt.toISOString(),
      q.reference,
      q.kind,
      q.status,
      q.customerName,
      q.phone,
      q.email,
      q.title,
      q.quantity,
      takaCell(q.estimateLow),
      takaCell(q.estimateHigh),
      takaCell(q.finalPrice),
      q.fileName ?? "",
    ]),
  ];
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kaino-quotes-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
