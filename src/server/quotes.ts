import "server-only";
import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { issuesToFieldErrors } from "@/domain/costing/schemas";
import {
  buildQuoteMessage,
  customFileDetailsSchema,
  generateQuoteReference,
  inquiryContactSchema,
  mailtoLink,
  QUOTE_KINDS,
  whatsappLink,
  type QuoteKind,
  type QuoteSummaryLine,
} from "@/domain/quote";
import { db } from "./db";
import { runPublicEstimate, summarizeConfiguration } from "./estimates";
import { getSetting } from "./settings";
import { QUOTE_EXTENSIONS, storeUpload, UploadError, type StoredFile } from "./storage";

export interface QuoteReceipt {
  reference: string;
  title: string;
  summary: QuoteSummaryLine[];
  quantity: number;
  low: number | null;
  high: number | null;
  needsReview: boolean;
  whatsappUrl: string | null;
  mailtoUrl: string | null;
  facebookUrl: string | null;
  message: string;
}

export type QuoteResult = { ok: true; receipt: QuoteReceipt } | { ok: false; errors: Record<string, string> };

const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};

/**
 * Create a quote request from a multipart form. All prices are recomputed on the server from the
 * submitted configuration — client-supplied prices are never trusted.
 */
export async function createQuoteRequest(fd: FormData): Promise<QuoteResult> {
  const kind = str(fd, "kind") as QuoteKind;
  if (!QUOTE_KINDS.includes(kind)) return { ok: false, errors: { _form: "Unknown request type" } };

  const contact = inquiryContactSchema.safeParse({
    name: str(fd, "name"),
    email: str(fd, "email"),
    phone: str(fd, "phone"),
    notes: str(fd, "notes"),
  });
  const errors: Record<string, string> = contact.success ? {} : issuesToFieldErrors(contact.error);

  let config: unknown = {};
  try {
    config = JSON.parse(str(fd, "config") || "{}");
  } catch {
    errors._form = "Invalid configuration";
  }
  const productSlug = str(fd, "productSlug") || undefined;

  let title = "General inquiry";
  let summary: QuoteSummaryLine[] = [];
  let quantity = 1;
  let low: number | null = null;
  let high: number | null = null;
  let total: number | null = null;
  let needsReview = true;
  let productId: string | undefined;

  if (kind === "keychain" || kind === "organizer" || kind === "product") {
    const est = await runPublicEstimate(kind, config, productSlug);
    const sum = await summarizeConfiguration(kind, config, productSlug);
    if (!est.ok || !sum) {
      Object.assign(errors, est.ok ? { _form: "Invalid configuration" } : est.errors);
    } else {
      title = sum.title;
      summary = sum.summary;
      quantity = est.estimate.quantity;
      low = est.estimate.low;
      high = est.estimate.high;
      total = est.estimate.total;
      needsReview = est.estimate.needsReview;
      productId = sum.productId;
    }
  } else if (kind === "custom_file") {
    const details = customFileDetailsSchema.safeParse({
      dimensions: str(fd, "dimensions"),
      material: str(fd, "material"),
      color: str(fd, "color"),
      quantity: Number(str(fd, "quantity")),
      intendedUse: str(fd, "intendedUse"),
      requirements: str(fd, "requirements"),
      desiredDate: str(fd, "desiredDate"),
    });
    if (!details.success) Object.assign(errors, issuesToFieldErrors(details.error));
    else {
      const d = details.data;
      title = "Custom print from customer file";
      quantity = d.quantity;
      summary = [
        { label: "Dimensions", value: d.dimensions || "Not specified" },
        { label: "Material", value: d.material || "Your recommendation" },
        { label: "Colour", value: d.color || "Not specified" },
        ...(d.intendedUse ? [{ label: "Intended use", value: d.intendedUse }] : []),
        ...(d.requirements ? [{ label: "Requirements", value: d.requirements }] : []),
        ...(d.desiredDate ? [{ label: "Needed by", value: d.desiredDate }] : []),
      ];
      config = d;
    }
  }

  if (kind === "general" && contact.success && !contact.data.notes) errors.notes = "Please tell us a little about what you need";

  const upload = fd.get("file");
  const hasFile = upload instanceof File && upload.size > 0;
  if (kind === "custom_file" && !hasFile) errors.file = "Please attach your STL, 3MF or OBJ file";
  if (Object.keys(errors).length) return { ok: false, errors };

  let stored: StoredFile | null = null;
  if (hasFile) {
    const common = await getSetting("estimator.common");
    const allowed = kind === "custom_file" ? ["stl", "3mf", "obj"] : QUOTE_EXTENSIONS;
    try {
      stored = await storeUpload(upload as File, "quotes", allowed, common.maxUploadMb * 1024 * 1024);
    } catch (e) {
      if (e instanceof UploadError) return { ok: false, errors: { file: e.message } };
      throw e;
    }
    summary.push({ label: "Attached file", value: stored.originalName });
  }

  const c = contact.data!;
  let reference = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    reference = generateQuoteReference(new Date(), () => randomInt(0, 1_000_000) / 1_000_000);
    try {
      await db.quoteRequest.create({
        data: {
          reference,
          kind,
          customerName: c.name,
          email: c.email,
          phone: c.phone,
          title,
          configuration: { summary, input: config } as unknown as Prisma.InputJsonValue,
          quantity,
          estimateLow: low,
          estimateHigh: high,
          estimateTotal: total,
          notes: c.notes,
          fileName: stored?.originalName,
          fileStoredName: stored?.storedName,
          fileSize: stored?.size,
          fileMime: stored?.mime,
          productId,
        },
      });
      break;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && attempt < 4) continue;
      throw e;
    }
  }

  const business = await getSetting("business");
  const message = buildQuoteMessage({ reference, title, summary, quantity, low, high, customerName: c.name });
  return {
    ok: true,
    receipt: {
      reference,
      title,
      summary,
      quantity,
      low,
      high,
      needsReview,
      message,
      whatsappUrl: whatsappLink(business.whatsapp, message),
      mailtoUrl: mailtoLink(business.email, `Quote request ${reference}`, message),
      facebookUrl: business.facebookUrl || null,
    },
  };
}
