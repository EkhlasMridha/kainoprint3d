import { NextResponse } from "next/server";
import { createQuoteRequest } from "@/server/quotes";
import { clientKey, rateLimit } from "@/server/rate-limit";

const MAX_BODY_BYTES = 105 * 1024 * 1024; // hard ceiling; per-file limit is enforced by settings

/** Public quote-request endpoint (multipart/form-data). */
export async function POST(req: Request) {
  if (!rateLimit(`quote:${await clientKey()}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: false, errors: { _form: "Too many requests" } }, { status: 429 });
  }
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return NextResponse.json({ ok: false, errors: { file: "The file is too large." } }, { status: 413 });
  if (!req.headers.get("content-type")?.includes("multipart/form-data")) {
    return NextResponse.json({ ok: false, errors: { _form: "Invalid request" } }, { status: 400 });
  }
  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, errors: { _form: "Could not read the form" } }, { status: 400 });
  }
  try {
    const result = await createQuoteRequest(fd);
    return NextResponse.json(result, { status: result.ok ? 201 : 422 });
  } catch (e) {
    console.error("[quotes] failed to create quote request", e);
    return NextResponse.json({ ok: false, errors: { _form: "Something went wrong. Please try again or contact us directly." } }, { status: 500 });
  }
}
