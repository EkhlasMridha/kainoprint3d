import { NextResponse } from "next/server";
import { adminOrNull } from "@/server/auth/session";
import { db } from "@/server/db";
import { readStored } from "@/server/storage";

/**
 * Download a customer's uploaded file (admin only). Always served as an opaque attachment so the
 * browser never renders or executes it.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await adminOrNull())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const q = await db.quoteRequest.findUnique({ where: { id }, select: { fileStoredName: true, fileName: true, reference: true } });
  if (!q?.fileStoredName) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const file = await readStored("quotes", q.fileStoredName);
  if (!file) return NextResponse.json({ error: "File missing" }, { status: 404 });
  const name = `${q.reference}-${(q.fileName ?? "file").replace(/[^\w.\-]+/g, "_")}`;
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${name}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, no-store",
    },
  });
}
