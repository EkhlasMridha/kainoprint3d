import { NextResponse } from "next/server";
import { z } from "zod";
import { runPublicEstimate } from "@/server/estimates";
import { clientKey, rateLimit } from "@/server/rate-limit";

const bodySchema = z.object({
  kind: z.enum(["keychain", "organizer", "product"]),
  input: z.unknown(),
  productSlug: z.string().max(120).optional(),
});

/** Public, unauthenticated estimate endpoint. Returns only customer-facing fields. */
export async function POST(req: Request) {
  if (!rateLimit(`estimate:${await clientKey()}`, 120, 60_000)) {
    return NextResponse.json({ ok: false, errors: { _form: "Too many requests" } }, { status: 429 });
  }
  const text = await req.text();
  if (text.length > 20_000) return NextResponse.json({ ok: false, errors: { _form: "Request too large" } }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false, errors: { _form: "Invalid JSON" } }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, errors: { _form: "Invalid request" } }, { status: 400 });
  const result = await runPublicEstimate(parsed.data.kind, parsed.data.input, parsed.data.productSlug);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
